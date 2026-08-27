import threading
import logging

logger = logging.getLogger("orinoco.modbus_pool")

# Pool de clientes Modbus persistentes por puerto — evita el PermissionError 13
# en drivers Windows (CH340, FTDI) al abrir/cerrar el puerto.
_MODBUS_CLIENTS = {}
_MODBUS_CLIENTS_LOCK = threading.Lock()

# Locks de transacción por puerto — serializa los accesos de varios hilos
# (poller + endpoints /test y /poll) al mismo bus Modbus RS-485.
_MODBUS_PORT_LOCKS = {}
_MODBUS_PORT_LOCKS_META = threading.Lock()


def get_port_lock(port, baudrate, parity, stopbits):
    """Retorna (o crea) el lock de transacción para el puerto dado."""
    key = f"{port}:{baudrate}:{parity}:{stopbits}"
    with _MODBUS_PORT_LOCKS_META:
        if key not in _MODBUS_PORT_LOCKS:
            _MODBUS_PORT_LOCKS[key] = threading.Lock()
        return _MODBUS_PORT_LOCKS[key]


def get_or_create_modbus_client(port, baudrate, parity, stopbits):
    """
    Retorna un cliente Modbus RTU persistente para el puerto dado.
    Si no existe o está desconectado, crea uno nuevo.
    """
    key = f"{port}:{baudrate}:{parity}:{stopbits}"
    with _MODBUS_CLIENTS_LOCK:
        client = _MODBUS_CLIENTS.get(key)
        if client is None:
            try:
                from pymodbus.client import ModbusSerialClient
                client = ModbusSerialClient(
                    port=port, baudrate=baudrate, bytesize=8,
                    parity=parity, stopbits=stopbits, timeout=1.0
                )
                client.connect()
                _MODBUS_CLIENTS[key] = client
                logger.info(f"[ModbusPool] Cliente creado para {key}")
            except Exception as e:
                logger.warning(f"[ModbusPool] No se pudo crear cliente {key}: {e}")
                return None
        return client


def invalidate_modbus_client(port, baudrate, parity, stopbits):
    """Cierra y elimina el cliente persistente de un puerto (para reconexión)."""
    key = f"{port}:{baudrate}:{parity}:{stopbits}"
    with _MODBUS_CLIENTS_LOCK:
        client = _MODBUS_CLIENTS.pop(key, None)
        if client:
            try:
                client.close()
            except Exception:
                pass
            logger.info(f"[ModbusPool] Cliente cerrado para {key}")
