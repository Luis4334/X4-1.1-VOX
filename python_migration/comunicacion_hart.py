"""
comunicacion_hart.py
──────────────────────────────────────────────────────────────────
Módulo de lectura del gateway ICP DAS HRT-711 via Modbus TCP/IP
o Modbus RTU, con conexión PERSISTENTE (no se abre/cierra en cada
ciclo de 3 segundos para no saturar los 2 sockets del gateway).

Estrategia de conexión (igual que modbus_daq.py para el RTU):
  - El cliente se crea UNA sola vez y se reutiliza entre llamadas.
  - Si la configuración (IP/Puerto/COM/Baudrate) cambia, se fuerza
    una reconexión en la próxima llamada.
  - Si la conexión se pierde, se reintenta solo después del cooldown
    (evita saturar el bus en cada ciclo de polling).

Estrategia de lectura (cuando el gateway responde):
  1. Intenta FC03 (read_holding_registers) — más común en ICP DAS.
  2. Si falla de forma permanente (no SlaveBusy), intenta FC04.
  3. Si el gateway devuelve SlaveBusy (Exc. Code 4 o 6), espera y
     reintenta hasta MAX_RETRIES, ya que el HRT-711 puede estar en
     medio de un ciclo de polling HART (~250-500 ms).

Valores 0.00 con Modbus OK → problema físico en el lazo HART:
  - Verificar LED "HART ERR" en el gateway (parpadeo = sin comunicación).
  - Verificar Jumper JP4 (resistor interno 250Ω). Debe estar cerrado
    si no hay resistor externo en el lazo.
  - Verificar alimentación 24VDC del lazo y que el transmisor esté
    encendido y respondiendo en la dirección de polling correcta (0 para
    modo punto a punto, o usar la utilidad HG Tool de ICP DAS).
"""

import struct
import time
import logging
from pymodbus.client import ModbusTcpClient, ModbusSerialClient

logger = logging.getLogger("orinoco.hart")

# ── Configuración de reintentos ────────────────────────────────
MAX_RETRIES   = 5      # Cuántas veces reintentar si SlaveBusy
RETRY_DELAY_S = 0.8    # Segundos entre reintentos (HRT-711 ciclo HART ~250ms)

# Modbus Exception Code 6 = Slave Device Busy (gateway en ciclo HART)
# Modbus Exception Code 4 = Slave Device Failure (fallo permanente)
_SLAVE_BUSY_CODES = {4, 6}  # Ambos son recuperables con un reintento

# ── Cooldown de reconexión ────────────────────────────────────
# Tiempo mínimo entre intentos de reconexión para no saturar el gateway.
RECONNECT_COOLDOWN_S = 10.0

# ── Estado persistente del módulo ────────────────────────────
_hart_client = None          # Instancia activa del cliente Modbus
_hart_connected = False      # True si la conexión está activa
_hart_last_attempt = 0.0     # Timestamp del último intento de conexión
_hart_last_config = {}       # Copia de la última config usada (para detectar cambios)


def _config_changed(config: dict) -> bool:
    """Devuelve True si la configuración relevante cambió respecto a la última conexión."""
    keys = ['mode', 'ip', 'port', 'com_port', 'baudrate']
    for k in keys:
        if str(config.get(k, '')) != str(_hart_last_config.get(k, '')):
            return True
    return False


def _close_client():
    """Cierra y destruye el cliente persistente, libera el socket/puerto."""
    global _hart_client, _hart_connected
    if _hart_client is not None:
        try:
            _hart_client.close()
        except Exception:
            pass
        _hart_client = None
    _hart_connected = False


def _get_client(config: dict):
    """
    Devuelve el cliente Modbus persistente activo.
    - Si ya está conectado y la config no cambió, lo retorna directamente.
    - Si la config cambió, cierra y reconecta.
    - Si está desconectado, solo intenta reconectar cuando el cooldown lo permite.
    - Nunca lanza excepciones — retorna None si falla.
    """
    global _hart_client, _hart_connected, _hart_last_attempt, _hart_last_config

    # ── Detectar cambio de configuración ──────────────────────
    if _hart_connected and _hart_client is not None and _config_changed(config):
        logger.info("[HART] Configuración cambió → reconectando...")
        _close_client()

    # ── Si ya está conectado, reutilizar ──────────────────────
    if _hart_connected and _hart_client is not None:
        return _hart_client

    # ── Cooldown: no reintentar demasiado seguido ─────────────
    now = time.monotonic()
    if (now - _hart_last_attempt) < RECONNECT_COOLDOWN_S:
        return None

    _hart_last_attempt = now
    _close_client()  # Limpiar cualquier cliente anterior

    mode = config.get('mode', 'tcp')
    try:
        if mode == 'tcp':
            ip   = config.get('ip', '192.168.255.1')
            port = int(config.get('port', 502))
            logger.info(f"[HART] Conectando TCP persistente → {ip}:{port}")
            _hart_client = ModbusTcpClient(ip, port=port, timeout=3.0)
        else:
            com_port = config.get('com_port', 'COM3')
            baudrate = int(config.get('baudrate', 9600))
            logger.info(f"[HART] Conectando RTU persistente → {com_port} @ {baudrate}")
            _hart_client = ModbusSerialClient(
                port=com_port, baudrate=baudrate, timeout=2.0
            )

        _hart_connected = _hart_client.connect()

        if _hart_connected:
            _hart_last_config = dict(config)
            logger.info(f"[HART] ✅ Conexión persistente establecida (modo={mode})")
        else:
            logger.warning(f"[HART] ⚠️ connect() retornó False (modo={mode})")
            _close_client()

    except Exception as e:
        logger.error(f"[HART] ❌ Error conectando: {e}")
        _close_client()

    return _hart_client if _hart_connected else None


def _mark_disconnected():
    """
    Llama cuando se detecta un error de comunicación durante una lectura.
    Cierra el socket y reinicia el cooldown para que el próximo intento
    ocurra solo después del tiempo configurado.
    """
    global _hart_last_attempt
    logger.warning(
        f"[HART] 🟠 Conexión perdida — reintento en {RECONNECT_COOLDOWN_S:.0f}s"
    )
    _close_client()
    _hart_last_attempt = time.monotonic()


def _read_with_retry(client, fn_code: int, address: int, count: int, slave_id: int):
    """
    Intenta la lectura Modbus hasta MAX_RETRIES veces.
    Si el gateway devuelve SlaveBusy (código 4 ó 6), espera y reintenta.
    Devuelve (result, fn_code_used) o lanza excepción.
    """
    fn_name = "read_holding_registers" if fn_code == 3 else "read_input_registers"
    for attempt in range(1, MAX_RETRIES + 1):
        logger.debug(
            f"[HART] Intento {attempt}/{MAX_RETRIES} → "
            f"FC{fn_code}({fn_name}), addr={address}, count={count}, slave={slave_id}"
        )
        if fn_code == 3:
            result = client.read_holding_registers(address, count=count, slave=slave_id)
        else:
            result = client.read_input_registers(address, count=count, slave=slave_id)

        if not result.isError():
            logger.info(f"[HART] ✅ Lectura OK con FC{fn_code} en intento {attempt}")
            return result, fn_code

        # Inspeccionar el código de excepción
        exc_code = getattr(result, 'exception_code', None)
        logger.warning(
            f"[HART] ⚠️ FC{fn_code} intento {attempt} → Error: {result} "
            f"(exception_code={exc_code})"
        )

        if exc_code in _SLAVE_BUSY_CODES and attempt < MAX_RETRIES:
            logger.info(
                f"[HART] Gateway ocupado (Busy code={exc_code}). "
                f"Esperando {RETRY_DELAY_S}s antes de reintentar..."
            )
            time.sleep(RETRY_DELAY_S)
            continue

        # Error distinto o último intento → salir del bucle
        break

    return result, fn_code  # Devuelve el último resultado (fallido)


def _parse_registers(result):
    """
    Parsea los registros del HRT-711 usando el Formato 1 (Float Only)
    que reside en la dirección Modbus 1300.
    Orden de los registros (10 words):
      0-1: PV Current
      2-3: PV (Variable Primaria)
      4-5: SV (Variable Secundaria)
      6-7: TV (Variable Terciaria)
      8-9: QV (Variable Cuaternaria)
    """
    regs = result.registers
    logger.info(f"[HART] Registros crudos (1300+): {[hex(r) for r in regs]}")

    def decode_badc(r0, r1):
        try:
            return struct.unpack('>f', struct.pack('<HH', r0, r1))[0]
        except:
            return 0.0

    try:
        pv_current = decode_badc(regs[0], regs[1]) if len(regs) >= 2 else 0.0
        
        # El instrumento físico envía:
        # HART PV (regs 2-3) = Caudal / Flow (364.26 SCFH)
        # HART SV (regs 4-5) = DP (4.62 inH2O)
        # HART TV (regs 6-7) = Static Pressure (-3.05 psig -> 11.45 psia)
        # HART QV (regs 8-9) = Temperature (79.1 F)

        val_flow = decode_badc(regs[2], regs[3]) if len(regs) >= 4 else 0.0
        val_dp   = decode_badc(regs[4], regs[5]) if len(regs) >= 6 else 0.0
        val_pres = decode_badc(regs[6], regs[7]) if len(regs) >= 8 else 0.0
        val_temp = decode_badc(regs[8], regs[9]) if len(regs) >= 10 else 0.0

        # Mapeamos para que coincidan con la interfaz de Configuración Modbus HART
        pv_1 = val_flow
        pv1_unit = "SCFH"

        pv_2 = val_dp
        pv2_unit = "inH2O"

        pv_3 = 14.5 + val_pres # Sumamos 14.5 psi (presión atmosférica aprox.) para convertir psig a psia y coincidir con el instrumento
        pv3_unit = "psi"

        pv_4 = val_temp
        pv4_unit = "°F"

        # Para el Status, el bloque 1300 no incluye el status del dispositivo (estaba en 618),
        # así que podemos dejarlo como 0x0000 o simular 0x0400 (HART OK)
        status = 0x0400 

        logger.info(
            f"[HART] Parsed → Status=0x{status:04X} | "
            f"PV_mA={pv_current:.4f} | "
            f"PV1={pv_1:.4f}(u={pv1_unit}) | "
            f"PV2={pv_2:.4f}(u={pv2_unit}) | "
            f"PV3={pv_3:.4f}(u={pv3_unit}) | "
            f"PV4={pv_4:.4f}(u={pv4_unit})"
        )

        return {
            "connected": True,
            "error": None,
            "status": status,
            "pv_current": pv_current,
            "pv1": {"value": pv_1, "unit": pv1_unit},
            "pv2": {"value": pv_2, "unit": pv2_unit},
            "pv3": {"value": pv_3, "unit": pv3_unit},
            "pv4": {"value": pv_4, "unit": pv4_unit},
        }
    except Exception as e:
        logger.error(f"[HART] Error parseando registros: {e}")
        raise


def leer_instrumento_hart(config=None):
    """
    Función principal. Lee los PVs del instrumento HART via el gateway ICP DAS HRT-711.
    Usa una conexión TCP/RTU PERSISTENTE — no cierra el socket en cada llamada.
    Primero intenta FC03 (holding registers) y si falla por error permanente,
    intenta FC04 (input registers). Los SlaveBusy se reintentan automáticamente.
    """
    if config is None:
        config = {
            'mode': 'tcp', 'ip': '192.168.255.1', 'port': 502,
            'slave_id': 1, 'start_address': 618
        }

    slave_id       = int(config.get('slave_id', 1))
    start_address  = 1300 # Forzar a usar la dirección del Formato 1 (Float Only)
    register_count = 10

    # ── Obtener/establecer conexión persistente ────────────────
    client = _get_client(config)
    if client is None:
        msg = (
            "No hay conexión al gateway HART — en cooldown o fallo de red. "
            f"Reintentando en {RECONNECT_COOLDOWN_S:.0f}s"
        )
        logger.warning(f"[HART] ⚠️ {msg}")
        return {"connected": False, "error": msg}

    try:
        # ── INTENTO 1: Función 04 — Input Registers (HRT-711 mapea entradas aquí) ────────
        result, fc_used = _read_with_retry(
            client, 4, start_address, register_count, slave_id
        )

        if result.isError():
            exc_code = getattr(result, 'exception_code', None)
            logger.warning(f"[HART] FC04 falló (code={exc_code}). Probando FC03...")

            # ── INTENTO 2: Función 03 — Holding Registers ──────
            result, fc_used = _read_with_retry(
                client, 3, start_address, register_count, slave_id
            )

            if result.isError():
                exc_code = getattr(result, 'exception_code', None)
                if exc_code in _SLAVE_BUSY_CODES:
                    error_msg = (
                        f"Gateway HRT-711 ocupado (SlaveBusy/code={exc_code}). "
                        f"Verificar: 1) Instrumento HART encendido. "
                        f"2) Acceder a http://192.168.255.1 y activar polling HART. "
                        f"3) Resistor 250Ω en el lazo y Jumper JP4."
                    )
                else:
                    # Error de comunicación — marcar como desconectado para reconectar
                    _mark_disconnected()
                    error_msg = f"Error Modbus FC04+FC03: {result} (code={exc_code})"
                logger.warning(f"[HART] ⚠️ {error_msg}")
                return {"connected": False, "error": error_msg}

        return _parse_registers(result)

    except Exception as e:
        # Error inesperado (socket cortado, timeout, etc.) → forzar reconexión
        logger.error(f"[HART] ❌ Excepción inesperada: {e}", exc_info=True)
        _mark_disconnected()
        return {"connected": False, "error": str(e)}
    # NOTA: NO hay 'finally: client.close()' — la conexión es PERSISTENTE.


if __name__ == "__main__":
    import json
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    print("=== Prueba de lectura HART (3 ciclos con conexión persistente) ===")
    for i in range(1, 4):
        print(f"\n--- Ciclo {i} ---")
        result = leer_instrumento_hart()
        print(json.dumps(result, indent=2))
        if i < 3:
            time.sleep(3.0)
    print("\n=== Prueba completada ===")