"""
Orinoco SoftPLC — Driver Modbus RTU Compartido
===============================================
Módulo centralizado de comunicación Modbus RTU.
Usado por fase2_entradas.py (lectura) y fase8_salidas.py (escritura).

ESTRATEGIA DE RENDIMIENTO:
  El cliente se abre UNA sola vez y se mantiene conectado entre ciclos.
  Si la conexión se pierde, se reintenta cada RECONNECT_COOLDOWN segundos
  para no saturar el bus en cada ciclo de 100 ms.
"""

import logging
import time
from pymodbus.client import ModbusSerialClient
from global_vars import V

logger = logging.getLogger("orinoco.modbus")

# ─────────────────────────────────────────────────────────────
DAQ_PORT     = "COM8"   # Puerto serial de tu tarjeta DAQ
DAQ_BAUDRATE = 9600     # Baudrate
DAQ_BYTESIZE = 8
DAQ_PARITY   = "N"      # "N"=Ninguno, "E"=Par, "O"=Impar
DAQ_STOPBITS = 1
DAQ_TIMEOUT  = 0.08     # 80 ms < 100 ms del ciclo PLC
DAQ_SLAVE_ID = 1        # ID esclavo Modbus

# Segundos mínimos entre intentos de reconexion (evita spamear el bus)
RECONNECT_COOLDOWN = 5.0

# Estado interno
_daq_client: ModbusSerialClient | None = None
_connected: bool = False
_last_attempt: float = 0.0   # timestamp del último intento de connect()
_last_error: str = ""         # mensaje del último error (expuesto a la UI)


def get_client() -> ModbusSerialClient | None:
    """
    Retorna el cliente Modbus activo.
    - Si ya está conectado, lo devuelve directamente.
    - Si está desconectado, solo intenta reconectar cuando el cooldown lo permite.
    - Nunca lanza excepciones — retorna None si falla.
    """
    global _daq_client, _connected, _last_attempt, _last_error

    if _connected and _daq_client is not None:
        return _daq_client

    now = time.monotonic()
    if (now - _last_attempt) < RECONNECT_COOLDOWN:
        # Todavía en cooldown — no reintentar
        return None

    _last_attempt = now

    try:
        # Destruir cliente anterior si existe (libera el puerto COM)
        if _daq_client is not None:
            try:
                _daq_client.close()
            except Exception:
                pass
            _daq_client = None

        _daq_client = ModbusSerialClient(
            port=DAQ_PORT,
            baudrate=DAQ_BAUDRATE,
            bytesize=DAQ_BYTESIZE,
            parity=DAQ_PARITY,
            stopbits=DAQ_STOPBITS,
            timeout=DAQ_TIMEOUT,
        )

        _connected = _daq_client.connect()

        if _connected:
            V.b_Error_DAQ = False
            _last_error = ""
            logger.info(f"✅ DAQ conectada en {DAQ_PORT} @ {DAQ_BAUDRATE} baud")
        else:
            V.b_Error_DAQ = True
            _last_error = f"connect() retornó False en {DAQ_PORT}"
            logger.warning(f"⚠️ No se pudo conectar DAQ en {DAQ_PORT}")

    except Exception as e:
        _connected = False
        V.b_Error_DAQ = True
        _last_error = str(e)
        logger.error(f"Error conectando DAQ: {e}")

    return _daq_client if _connected else None


def mark_disconnected():
    """
    Llamar cuando se detecta un error de comunicación en un ciclo.
    Cierra y destruye el cliente para liberar el puerto COM,
    y resetea el cooldown para que el próximo intento ocurra
    después del paríon configurado.
    """
    global _daq_client, _connected, _last_attempt
    _connected = False
    V.b_Error_DAQ = True
    _last_attempt = time.monotonic()  # inicia cooldown
    # Cerrar y destruir para liberar el puerto COM físico
    if _daq_client is not None:
        try:
            _daq_client.close()
        except Exception:
            pass
        _daq_client = None
    logger.warning("🟠 DAQ desconectada — reintento en %.0f s", RECONNECT_COOLDOWN)
