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
  │ HG Tool          │ Modbus                                   │
  ├──────────────────┼──────────────────────────────────────────┤
  │ HART Device 0    │ registros 1300–1309  (10 registros float)│
  │ HART Device 1    │ registros 1310–1319                      │
  │ HART Device 2    │ registros 1320–1329                      │
  │ HART Device N    │ registros 1300 + N×10  a  1309 + N×10   │
  └──────────────────┴──────────────────────────────────────────┘

  Confirmación desde HG Tool:
    HART Device 0, Default CMD(3): Cmd In Address = 1236 (raw)
    → Implica HART Device 0 en Float Format: base 1300 + 0×10 = 1300
    → HART Device 2 en Float Format: 1300 + 2×10 = 1320

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

# ── Mapa de registros por instrumento (HRT-711 Float Format) ─
# El HRT-711 mapea las variables HART a floats IEEE-754 a partir
# del registro Modbus 1300. Cada instrumento ocupa 10 registros (5 floats).
#
# Formula: address = 1300 + device_index x 10
#   Device 0 -> addr 1300
#   Device 1 -> addr 1310
#   Device 2 -> addr 1320
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


# ── Parser de registros ───────────────────────────────────────

def _parse_registers(result, device_index: int = 0):
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

        # ── Mapeo PV → nombre/unidad por instrumento ──────────────────────
        # Ajusta estos bloques según el tipo real de cada instrumento.
        # device_index = N en "HART Device N" del HG Tool.
        # ─────────────────────────────────────────────────────────────────
        if device_index == 0:
            # HART Device 0 — Medidor de flujo diferencial (instrumento 1)
            # PV = Caudal (SCFH) | SV = DP (inH2O) | TV = Pres. estática | QV = Temp
            pv_1 = raw_pv;               pv1_unit = "SCFH"
            pv_2 = raw_sv;               pv2_unit = "inH2O"
            pv_3 = 14.5 + raw_tv;        pv3_unit = "psia"   # psig -> psia
            pv_4 = raw_qv;               pv4_unit = "F"
        else:
            # HART Device N — Instrumento genérico (segundo, tercero, etc.)
            # Los valores crudos se devuelven con las unidades del instrumento.
            pv_1 = raw_pv;   pv1_unit = "???"
            pv_2 = raw_sv;   pv2_unit = "inH2O"
            pv_3 = raw_tv;   pv3_unit = "psi"
            pv_4 = raw_qv;   pv4_unit = "degF"

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
        return _parse_registers(result, device_index=device_index)

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
    for n in range(4):
        addr = FLOAT_FORMAT_BASE + n * FLOAT_FORMAT_STRIDE
        print(f"  Device {n} -> addr {addr}  (1300 + {n}x10)")
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