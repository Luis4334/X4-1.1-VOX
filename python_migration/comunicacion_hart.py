import struct
import logging
from pymodbus.client import ModbusTcpClient, ModbusSerialClient

logger = logging.getLogger("orinoco.hart")

def leer_instrumento_hart(config=None):
    if config is None:
        config = {'mode': 'tcp', 'ip': '192.168.255.1', 'port': 502, 'slave_id': 1, 'start_address': 618}
        
    mode = config.get('mode', 'tcp')
    slave_id = int(config.get('slave_id', 1))
    start_address = int(config.get('start_address', 618))
    register_count = 13
    
    if mode == 'tcp':
        ip = config.get('ip', '192.168.255.1')
        port = int(config.get('port', 502))
        client = ModbusTcpClient(ip, port=port)
    else:
        com_port = config.get('port', 'COM3')
        baudrate = int(config.get('baudrate', 9600))
        client = ModbusSerialClient(port=com_port, baudrate=baudrate, timeout=1.0)
        
    try:
        if not client.connect():
            return {"connected": False, "error": f"Fallo al conectar ({mode})"}
            
        logger.info(f"→ Enviando peticion HART ({mode}): read_input_registers(addr={start_address}, count={register_count}, slave={slave_id})")
        result = client.read_input_registers(start_address, count=register_count, slave=slave_id)
        if result.isError():
            logger.warning(f"⚠️ Error leyendo DAQ HART: {result}")
            return {"connected": True, "error": f"Error Modbus: {result}"}
            
        raw = b''.join(struct.pack('<H', reg) for reg in result.registers)
        status = struct.unpack('>H', raw[0:2])[0]
        pv_current = struct.unpack('>f', raw[2:6])[0]
        
        pv1_unit = raw[6]
        pv_1 = struct.unpack('>f', raw[7:11])[0]
        
        pv2_unit = raw[11]
        pv_2 = struct.unpack('>f', raw[12:16])[0]
        
        pv3_unit = raw[16]
        pv_3 = struct.unpack('>f', raw[17:21])[0]
        
        pv4_unit = raw[21]
        pv_4 = struct.unpack('>f', raw[22:26])[0]
        
        return {
            "connected": True,
            "error": None,
            "status": status,
            "pv_current": pv_current,
            "pv1": {"value": pv_1, "unit": pv1_unit},
            "pv2": {"value": pv_2, "unit": pv2_unit},
            "pv3": {"value": pv_3, "unit": pv3_unit},
            "pv4": {"value": pv_4, "unit": pv4_unit}
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}
    finally:
        client.close()

if __name__ == "__main__":
    result = leer_instrumento_hart()
    print("Telemetría HART:", result)