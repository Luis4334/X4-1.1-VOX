"""
comunicacion_hart.py
──────────────────────────────────────────────────────────────────
Módulo de lectura del gateway ICP DAS HRT-711 via Modbus TCP/IP
o Modbus RTU, con conexión PERSISTENTE y soporte para MÚLTIPLES
instrumentos HART en el mismo gateway.

─────────────────────────────────────────────────────────────────
ARQUITECTURA REAL DEL HRT-711 (confirmada con HG Tool v1.6)
─────────────────────────────────────────────────────────────────
El gateway HRT-711 tiene UN SOLO slave Modbus (su propia dirección
Modbus, configurada en la web del gateway). Todos los instrumentos
HART se leen usando ESE MISMO slave_id.

La diferencia entre instrumentos NO es por slave_id, sino por la
DIRECCIÓN DE REGISTRO (start_address).

  ┌──────────────────┬──────────────────────────────────────────┐
  │ HG Tool          │ Modbus Float Format                      │
  ├──────────────────┼──────────────────────────────────────────┤
  │ HART Device 0    │ registros 1300-1309  (10 registros/float)│
  │ HART Device 1    │ registros 1310-1319                      │
  │ HART Device 2    │ registros 1320-1329                      │
  │ HART Device N    │ registros 1300 + N×10  a  1309 + N×10   │
  └──────────────────┴──────────────────────────────────────────┘

  Nota: 1236 es la dirección CMD In (raw HART packet) visible en HG Tool.
  El bloque Float Format (donde viven PV/SV/TV/QV) empieza en 1300.
  Stride = 26 registros por device (1300 + N×10).

  Parámetros clave:
    • hart_device_index  = N en "HART Device N" del HG Tool (0-based)
    • hart_device_address = dirección HART física en el bus (informativo)
    • slave_id Modbus    = slave_id global del gateway (MISMO para todos)

Formato de los 10 registros (Float Only, base 1300 + N×10):
  Regs 0-1: PV Current (mA)
  Regs 2-3: PV  (Variable Primaria)
  Regs 4-5: SV  (Variable Secundaria)
  Regs 6-7: TV  (Variable Terciaria)
  Regs 8-9: QV  (Variable Cuaternaria)
  Codificación: IEEE-754 float, byte order BADC (propio de ICP DAS).
"""

import struct
import time
import logging
from pymodbus.client import ModbusTcpClient, ModbusSerialClient

logger = logging.getLogger("orinoco.hart")

# Importación diferida de V para evitar ciclos de importación al arrancar.
# Se resuelve en la primera llamada real a _parse_registers().
_V = None

def _get_V():
    """
    Retorna el singleton de memoria global V (importación diferida).

    IMPORTANTE — Problema del doble V (sys.path dual):
      app.py importa  V  como  python_migration.global_vars.V
      scan_engine.py  importa  V  como  global_vars.V
      Son DOS objetos distintos en memoria (misma clase, distinta instancia).

    El WebSocket de app.py lee SIEMPRE de python_migration.global_vars.V,
    por eso este módulo debe inyectar en ESA misma instancia.
    Buscamos en sys.modules para no re-importar y obtener el objeto correcto.
    """
    global _V
    if _V is None:
        import sys
        # Prioridad 1: instancia ya cargada por app.py — la que lee el WebSocket
        pm_module = sys.modules.get('python_migration.global_vars')
        if pm_module is not None:
            _V = pm_module.V
            return _V
        # Prioridad 2: instancia del scan engine (fallback en tests unitarios)
        try:
            from global_vars import V as _v_instance
            _V = _v_instance
        except Exception as e:
            logger.warning(f"[HART] No se pudo importar V: {e}")
    return _V

# ── Mapa de registros por instrumento (HRT-711 Float Format) ─
# Base real del bloque Float Format: 1300.
# Cada device ocupa 10 registros (5 floats IEEE-754 BADC).
#
# Formula: address = 1300 + device_index x 10
#   Device  0 -> addr 1300
#   Device  1 -> addr 1310
#   Device  2 -> addr 1320
#   Device 14 -> addr 1440
#
# NOTA: La dirección 1236 que muestra HG Tool es el registro CMD In
# (donde vive el paquete HART crudo), diferente al bloque Float Format.
FLOAT_FORMAT_BASE   = 1300
FLOAT_FORMAT_STRIDE = 10
REGISTER_COUNT      = 10

# ── Configuración de reintentos ────────────────────────────────
MAX_RETRIES   = 5      # Reintentos cuando gateway responde "Busy"
RETRY_DELAY_S = 0.8    # Espera entre reintentos (ciclo HART ~250-500 ms)

# Exception codes Modbus del HRT-711
_SLAVE_BUSY_CODES = {4, 6}   # SlaveBusy / SlaveFailure (recuperables)

# ── Cooldowns ─────────────────────────────────────────────────
RECONNECT_COOLDOWN_S     = 10.0   # Entre intentos de reconexión TCP/RTU
CHANNEL_ERROR_COOLDOWN_S = 15.0   # Entre reintentos por canal con error

# ─────────────────────────────────────────────────────────────
# Estado persistente: UN SOLO cliente TCP/RTU para el gateway.
# El error-state es INDEPENDIENTE por canal (device_index).
# ─────────────────────────────────────────────────────────────
_hart_client       = None    # Cliente Modbus único (compartido)
_hart_connected    = False
_hart_last_attempt = 0.0
_hart_last_config  = {}

# { device_index: { 'last_error_time': float, 'error_count': int } }
_channel_state: dict = {}


# ── Helpers de estado por canal ───────────────────────────────

def _get_channel_state(device_index: int) -> dict:
    if device_index not in _channel_state:
        _channel_state[device_index] = {'last_error_time': 0.0, 'error_count': 0}
    return _channel_state[device_index]


def _channel_in_cooldown(device_index: int) -> bool:
    state = _get_channel_state(device_index)
    return (time.monotonic() - state['last_error_time']) < CHANNEL_ERROR_COOLDOWN_S


def _mark_channel_error(device_index: int):
    state = _get_channel_state(device_index)
    state['last_error_time'] = time.monotonic()
    state['error_count'] += 1
    logger.warning(
        f"[HART] Device{device_index} error #{state['error_count']}. "
        f"Cooldown {CHANNEL_ERROR_COOLDOWN_S:.0f}s."
    )


def _clear_channel_error(device_index: int):
    state = _get_channel_state(device_index)
    if state['error_count'] > 0:
        logger.info(f"[HART] Device{device_index} OK — errores previos limpiados.")
    state['last_error_time'] = 0.0
    state['error_count'] = 0


# ── Gestión de conexión persistente ──────────────────────────

def _config_changed(config: dict) -> bool:
    """Detecta cambio en parámetros de TRANSPORTE (no slave_id ni address)."""
    for k in ['mode', 'ip', 'port', 'com_port', 'baudrate']:
        if str(config.get(k, '')) != str(_hart_last_config.get(k, '')):
            return True
    return False


def _close_client():
    global _hart_client, _hart_connected
    if _hart_client is not None:
        try:
            _hart_client.close()
        except Exception:
            pass
        _hart_client = None
    _hart_connected = False


def force_disconnect():
    """Fuerza desconexión completa (llamar al reiniciar el gateway)."""
    global _hart_last_attempt
    logger.info("[HART] Forzando desconexion del cliente persistente...")
    _close_client()
    _hart_last_attempt = time.monotonic()


def _get_client(config: dict):
    """
    Retorna el cliente Modbus activo (único para todos los instrumentos).
    Maneja cooldown, reconexión y cambio de config de transporte.
    Nunca lanza excepciones — retorna None si no puede conectar.
    """
    global _hart_client, _hart_connected, _hart_last_attempt, _hart_last_config

    if _hart_connected and _hart_client is not None and _config_changed(config):
        logger.info("[HART] Config de red cambio -> reconectando transporte...")
        _close_client()

    if _hart_connected and _hart_client is not None:
        return _hart_client

    now = time.monotonic()
    if (now - _hart_last_attempt) < RECONNECT_COOLDOWN_S:
        remaining = RECONNECT_COOLDOWN_S - (now - _hart_last_attempt)
        logger.debug(f"[HART] Transporte en cooldown ({remaining:.1f}s).")
        return None

    _hart_last_attempt = now
    _close_client()

    mode = config.get('mode', 'tcp')
    try:
        if mode == 'tcp':
            ip   = config.get('ip', '192.168.255.1')
            port = int(config.get('port', 502))
            logger.info(f"[HART] Conectando TCP -> {ip}:{port}")
            _hart_client = ModbusTcpClient(ip, port=port, timeout=3.0)
        else:
            com  = config.get('com_port', 'COM3')
            baud = int(config.get('baudrate', 9600))
            logger.info(f"[HART] Conectando RTU -> {com} @ {baud}")
            _hart_client = ModbusSerialClient(port=com, baudrate=baud, timeout=2.0)

        _hart_connected = _hart_client.connect()
        if _hart_connected:
            _hart_last_config = dict(config)
            logger.info(f"[HART] Conexion persistente OK (modo={mode})")
        else:
            logger.warning(f"[HART] connect() retorno False (modo={mode})")
            _close_client()
    except Exception as e:
        logger.error(f"[HART] Error conectando: {e}")
        _close_client()

    return _hart_client if _hart_connected else None


def _mark_transport_disconnected():
    """Cierra el transporte ante error de socket/timeout."""
    global _hart_last_attempt
    logger.warning(f"[HART] Error de transporte — reintento en {RECONNECT_COOLDOWN_S:.0f}s")
    _close_client()
    _hart_last_attempt = time.monotonic()


# ── Lectura Modbus con reintento ─────────────────────────────

def _read_with_retry(client, fn_code: int, address: int, count: int, slave_id: int,
                     device_index: int = 0):
    """
    Intenta la lectura Modbus hasta MAX_RETRIES veces.
    Reintenta automáticamente si el gateway responde SlaveBusy.
    """
    fn_name = "read_holding_registers" if fn_code == 3 else "read_input_registers"
    for attempt in range(1, MAX_RETRIES + 1):
        logger.debug(
            f"[HART] Device{device_index} intento {attempt}/{MAX_RETRIES} "
            f"FC{fn_code} addr={address} count={count} slave={slave_id}"
        )
        if fn_code == 3:
            result = client.read_holding_registers(address, count=count, slave=slave_id)
        else:
            result = client.read_input_registers(address, count=count, slave=slave_id)

        if not result.isError():
            logger.info(
                f"[HART] Device{device_index} OK FC{fn_code} "
                f"addr={address} intento={attempt}"
            )
            return result, fn_code

        exc_code = getattr(result, 'exception_code', None)
        logger.warning(
            f"[HART] Device{device_index} FC{fn_code} intento={attempt} "
            f"addr={address} -> Error {result} (exc={exc_code})"
        )

        if exc_code in _SLAVE_BUSY_CODES and attempt < MAX_RETRIES:
            logger.info(
                f"[HART] Device{device_index} Gateway busy (code={exc_code}). "
                f"Esperando {RETRY_DELAY_S}s..."
            )
            time.sleep(RETRY_DELAY_S)
            continue
        break

    return result, fn_code


def _set_v_attr(v_obj, attr_name, value):
    if hasattr(v_obj, 'instrument_overrides') and attr_name in v_obj.instrument_overrides:
        return
    setattr(v_obj, attr_name, value)


# ── Parser de registros ───────────────────────────────────────

def _parse_registers(result, device_index: int = 0, config: dict = None):
    if config is None:
        config = {}
    """
    Parsea 10 registros del bloque Float Format del HRT-711.
    Byte order: BADC (propio de ICP DAS, no standard IEEE-754 big/little).

    Registros (addr = 1300 + device_index × 10):
      [0-1] PV Current (mA)
      [2-3] PV  — Variable Primaria
      [4-5] SV  — Variable Secundaria
      [6-7] TV  — Variable Terciaria
      [8-9] QV  — Variable Cuaternaria

    El mapeo nombre/unidad de cada PV depende del instrumento.
    Personaliza los bloques 'elif device_index == N:' según tu instalación.
    """
    regs = result.registers
    logger.info(
        f"[HART] Device{device_index} registros crudos "
        f"(addr {FLOAT_FORMAT_BASE + device_index * FLOAT_FORMAT_STRIDE}+{REGISTER_COUNT}): "
        f"{[hex(r) for r in regs]}"
    )

    def decode_badc(r0, r1):
        """Decodifica float IEEE-754 en byte order BADC del HRT-711."""
        try:
            return struct.unpack('>f', struct.pack('<HH', r0, r1))[0]
        except Exception:
            return 0.0

    try:
        pv_current = decode_badc(regs[0], regs[1]) if len(regs) >= 2 else 0.0
        raw_pv     = decode_badc(regs[2], regs[3]) if len(regs) >= 4 else 0.0
        raw_sv     = decode_badc(regs[4], regs[5]) if len(regs) >= 6 else 0.0
        raw_tv     = decode_badc(regs[6], regs[7]) if len(regs) >= 8 else 0.0
        raw_qv     = decode_badc(regs[8], regs[9]) if len(regs) >= 10 else 0.0

        # Si pv_current es muy bajo (< 1.0 mA), significa que el instrumento
        # físicamente no está conectado o el lazo está abierto.
        if pv_current < 1.0:
            logger.info(f"[HART] Device{device_index} sin corriente (pv_current={pv_current:.4f} mA). Asumiendo instrumento desconectado.")
            return {
                "connected":  False,
                "error":      "Desc.",
                "status":     0,
                "pv_current": pv_current,
                "pv1":        {"value": 0.0, "unit": "---"},
                "pv2":        {"value": 0.0, "unit": "---"},
                "pv3":        {"value": 0.0, "unit": "---"},
                "pv4":        {"value": 0.0, "unit": "---"},
            }

        # ── Mapeo PV → nombre/unidad basado en instrument_type (rol fijo del slot) ──
        # instrument_type viene de la BD y determina QUÉ variables inyectar.
        # hart_device_index determina DÓNDE leer (registro Modbus).
        # ─────────────────────────────────────────────────────────────────────────────
        instrument_type = config.get('instrument_type', 'NONE') or 'NONE'

        if instrument_type == 'WEDGE_LIQ':
            # ── Cuña de Líquido ──────────────────────────────────────────────────
            pv_1 = raw_pv;            pv1_unit = "SCFH"
            pv_2 = raw_sv;            pv2_unit = "inH2O"
            pv_3 = 14.5 + raw_tv;    pv3_unit = "psia"
            pv_4 = raw_qv;            pv4_unit = "F"
            try:
                _v = _get_V()
                if _v is not None and _v.b_habilitar_F_HART:
                    _set_v_attr(_v, "r_PDT_02", pv_2)
                    _set_v_attr(_v, "r_P_Oil", pv_3)
                    _set_v_attr(_v, "r_T_Oil_C", (pv_4 - 32.0) / 1.8)
                    _set_v_attr(_v, "r_T_Oil_F", pv_4)
                    logger.debug(f"[HART-WEDGE_LIQ] PDT_02={getattr(_v, 'r_PDT_02', 0.0):.3f} | P_Oil={getattr(_v, 'r_P_Oil', 0.0):.3f} | T={getattr(_v, 'r_T_Oil_C', 0.0):.2f}°C")
            except Exception as _e:
                logger.warning(f"[HART-WEDGE_LIQ] Error inyectando en V: {_e}")

        elif instrument_type == 'LAMINAR_A':
            # ── Laminar de Alta ──────────────────────────────────────────────────
            pv_1 = raw_pv;            pv1_unit = "SCFH"
            pv_2 = raw_sv;            pv2_unit = "inH2O"
            pv_3 = 14.5 + raw_tv;    pv3_unit = "psia"
            pv_4 = raw_qv;            pv4_unit = "F"
            try:
                _v = _get_V()
                if _v is not None and _v.b_habilitar_F_HART:
                    _set_v_attr(_v, "r_PDT_01", pv_2)
                    logger.debug(f"[HART-LAMINAR_A] PDT_01={getattr(_v, 'r_PDT_01', 0.0):.3f} inH2O")
            except Exception as _e:
                logger.warning(f"[HART-LAMINAR_A] Error inyectando en V: {_e}")

        elif instrument_type == 'LAMINAR_B':
            # ── Laminar de Baja ──────────────────────────────────────────────────
            pv_1 = raw_pv;            pv1_unit = "SCFH"
            pv_2 = raw_sv;            pv2_unit = "inH2O"
            pv_3 = 14.5 + raw_tv;    pv3_unit = "psia"
            pv_4 = raw_qv;            pv4_unit = "F"
            try:
                _v = _get_V()
                if _v is not None and _v.b_habilitar_F_HART:
                    _set_v_attr(_v, "r_PDT_03", pv_2)
                    logger.debug(f"[HART-LAMINAR_B] PDT_03={getattr(_v, 'r_PDT_03', 0.0):.3f} inH2O")
            except Exception as _e:
                logger.warning(f"[HART-LAMINAR_B] Error inyectando en V: {_e}")

        elif instrument_type == 'WEDGE_GAS':
            # ── Cuña de Gas ─────────────────────────────────────────────────────
            pv_1 = raw_pv;            pv1_unit = "SCFH"
            pv_2 = raw_sv;            pv2_unit = "inH2O"
            pv_3 = 14.5 + raw_tv;    pv3_unit = "psia"
            pv_4 = raw_qv;            pv4_unit = "F"
            try:
                _v = _get_V()
                if _v is not None and _v.b_habilitar_F_HART:
                    _set_v_attr(_v, "r_DP_gas", pv_2)
                    _set_v_attr(_v, "r_P_Gas", pv_3)
                    _set_v_attr(_v, "r_T_Gas", (pv_4 - 32.0) / 1.8)
                    logger.debug(f"[HART-WEDGE_GAS] DP_gas={getattr(_v, 'r_DP_gas', 0.0):.3f} | P_Gas={getattr(_v, 'r_P_Gas', 0.0):.3f} | T={getattr(_v, 'r_T_Gas', 0.0):.2f}°C")
            except Exception as _e:
                logger.warning(f"[HART-WEDGE_GAS] Error inyectando en V: {_e}")

        elif instrument_type == 'NIVEL':
            # ── Nivel del Separador (LIT) ────────────────────────────────────────
            pv_1 = raw_pv;            pv1_unit = "%"
            pv_2 = raw_sv;            pv2_unit = "inH2O"
            pv_3 = 14.5 + raw_tv;    pv3_unit = "psia"
            pv_4 = raw_qv;            pv4_unit = "F"
            try:
                _v = _get_V()
                if _v is not None and _v.b_habilitar_F_HART:
                    _set_v_attr(_v, "r_LIT_001", pv_1)
                    logger.debug(f"[HART-NIVEL] LIT_001={getattr(_v, 'r_LIT_001', 0.0):.3f} %")
            except Exception as _e:
                logger.warning(f"[HART-NIVEL] Error inyectando en V: {_e}")

        else:
            # ── NONE / sin asignar — solo muestra, no inyecta ───────────────────
            pv_1 = raw_pv;   pv1_unit = "EU"
            pv_2 = raw_sv;   pv2_unit = "EU"
            pv_3 = raw_tv;   pv3_unit = "EU"
            pv_4 = raw_qv;   pv4_unit = "EU"


        status = 0x0400  # HART OK (el bloque float no incluye status nativo)

        logger.info(
            f"[HART] Device{device_index} parsed -> "
            f"mA={pv_current:.4f} | "
            f"PV1={pv_1:.4f} {pv1_unit} | "
            f"PV2={pv_2:.4f} {pv2_unit} | "
            f"PV3={pv_3:.4f} {pv3_unit} | "
            f"PV4={pv_4:.4f} {pv4_unit}"
        )

        return {
            "connected":  True,
            "error":      None,
            "status":     status,
            "pv_current": pv_current,
            "pv1":        {"value": pv_1, "unit": pv1_unit},
            "pv2":        {"value": pv_2, "unit": pv2_unit},
            "pv3":        {"value": pv_3, "unit": pv3_unit},
            "pv4":        {"value": pv_4, "unit": pv4_unit},
        }
    except Exception as e:
        logger.error(f"[HART] Device{device_index} error parseando: {e}")
        raise


# ── Función principal ─────────────────────────────────────────

def leer_instrumento_hart(config=None):
    """
    Lee los PVs de UN instrumento HART del gateway ICP DAS HRT-711.

    Arquitectura de direccionamiento (HRT-711 Float Format):
      • Un SOLO slave Modbus = el gateway (slave_id en config, MISMO para todos).
      • Cada instrumento → dirección = 1300 + (hart_device_index × 10).
      • hart_device_index = N en "HART Device N" del HG Tool (0, 1, 2, 3...).

    Parámetros en config:
      mode              : 'tcp' | 'rtu'
      ip                : IP del gateway (TCP)
      port              : puerto Modbus TCP (default 502)
      com_port          : puerto COM (RTU)
      baudrate          : baudrate (RTU)
      slave_id          : Modbus slave ID del gateway (IGUAL para todos los canales)
      hart_device_index : N en "HART Device N" del HG Tool — determina la dirección
      hart_device_address: dirección HART física en el bus (informativo, no se usa en Modbus)
    """
    if config is None:
        config = {
            'mode': 'tcp', 'ip': '192.168.255.1', 'port': 502,
            'slave_id': 1, 'hart_device_index': 0
        }

    # slave_id = slave del GATEWAY (mismo para todos los instrumentos)
    slave_id     = int(config.get('slave_id', 1))

    # device_index = N en "HART Device N" del HG Tool → define la dirección
    device_index = int(config.get('hart_device_index', 0))

    # Calcular dirección de registro: 1300 + N × 10
    start_address  = FLOAT_FORMAT_BASE + device_index * FLOAT_FORMAT_STRIDE
    register_count = REGISTER_COUNT

    logger.debug(
        f"[HART] Device{device_index} (HART addr={config.get('hart_device_address','?')}) "
        f"-> Modbus slave={slave_id}, addr={start_address}, count={register_count}"
    )

    # ── Cooldown por canal ────────────────────────────────────────────────
    if _channel_in_cooldown(device_index):
        state = _get_channel_state(device_index)
        rem = CHANNEL_ERROR_COOLDOWN_S - (time.monotonic() - state['last_error_time'])
        msg = f"Device{device_index} en cooldown. Reintentando en {rem:.0f}s."
        logger.debug(f"[HART] {msg}")
        return {"connected": False, "error": msg}

    # ── Obtener cliente de transporte persistente ─────────────────────────
    client = _get_client(config)
    if client is None:
        msg = (
            f"Sin conexion al gateway HART (Device{device_index}) — "
            f"cooldown o fallo de red. Reintentando en {RECONNECT_COOLDOWN_S:.0f}s"
        )
        logger.warning(f"[HART] {msg}")
        return {"connected": False, "error": msg}

    try:
        # ── Leer status de comunicación del dispositivo (Registro 1000 + N) ──
        status_address = 1000 + device_index
        status_res, _ = _read_with_retry(client, 4, status_address, 1, slave_id, device_index)
        
        if not status_res.isError() and len(status_res.registers) > 0:
            comm_status = status_res.registers[0]
            if comm_status != 0:
                logger.info(f"[HART] Device{device_index} reportado Desconectado/Error por el gateway (status=0x{comm_status:04X})")
                _mark_channel_error(device_index)
                return {
                    "connected":  False,
                    "error":      "Desc.",
                    "status":     comm_status,
                    "pv_current": 0.0,
                    "pv1":        {"value": 0.0, "unit": "---"},
                    "pv2":        {"value": 0.0, "unit": "---"},
                    "pv3":        {"value": 0.0, "unit": "---"},
                    "pv4":        {"value": 0.0, "unit": "---"},
                }

        # ── Intento 1: FC04 — Input Registers ────────────────────────────
        result, fc_used = _read_with_retry(
            client, 4, start_address, register_count, slave_id, device_index
        )

        if result.isError():
            exc_code = getattr(result, 'exception_code', None)
            logger.warning(
                f"[HART] Device{device_index} FC04 fallo (code={exc_code}). "
                f"Probando FC03 addr={start_address}..."
            )

            # ── Intento 2: FC03 — Holding Registers ──────────────────────
            result, fc_used = _read_with_retry(
                client, 3, start_address, register_count, slave_id, device_index
            )

            if result.isError():
                exc_code = getattr(result, 'exception_code', None)
                if exc_code in _SLAVE_BUSY_CODES:
                    error_msg = (
                        f"Gateway ocupado en Device{device_index} addr={start_address} "
                        f"(code={exc_code}). "
                        f"Verificar: 1) Instrumento encendido. "
                        f"2) HART polling activo en gateway. "
                        f"3) Resistor 250ohm en lazo y Jumper JP4."
                    )
                    _mark_channel_error(device_index)
                else:
                    _mark_channel_error(device_index)
                    error_msg = (
                        f"Error Modbus Device{device_index} FC04+FC03 "
                        f"addr={start_address}: {result} (code={exc_code})"
                    )
                logger.warning(f"[HART] {error_msg}")
                return {"connected": False, "error": error_msg}

        # ── Lectura exitosa ───────────────────────────────────────────────
        _clear_channel_error(device_index)
        return _parse_registers(result, device_index=device_index, config=config)

    except Exception as e:
        logger.error(
            f"[HART] Excepcion inesperada Device{device_index} addr={start_address}: {e}",
            exc_info=True
        )
        _mark_channel_error(device_index)
        _mark_transport_disconnected()
        return {"connected": False, "error": str(e)}
    # La conexion es PERSISTENTE — NO hay 'finally: client.close()'


if __name__ == "__main__":
    import json
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    print("=== Prueba HRT-711 multi-instrumento ===")
    for n in range(15):
        addr = FLOAT_FORMAT_BASE + n * FLOAT_FORMAT_STRIDE
        print(f"  Device {n:2d} -> addr {addr}  (1300 + {n}x10)")
    print()
    for ciclo in range(1, 4):
        print(f"\n--- Ciclo {ciclo} ---")
        for dev_idx in [0, 2]:
            cfg = {
                'mode': 'tcp', 'ip': '192.168.255.1', 'port': 502,
                'slave_id': 1,              # slave del GATEWAY (fijo)
                'hart_device_index': dev_idx,  # N en "HART Device N"
            }
            addr = FLOAT_FORMAT_BASE + dev_idx * FLOAT_FORMAT_STRIDE
            res = leer_instrumento_hart(cfg)
            print(f"  Device{dev_idx} (addr={addr}): {json.dumps(res, indent=4)}")
        if ciclo < 3:
            time.sleep(3.0)
    print("\n=== Prueba completada ===")