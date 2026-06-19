import time
from pymodbus.client import ModbusTcpClient

def read_status():
    client = ModbusTcpClient('192.168.255.1', port=502)
    client.connect()
    
    # Try reading 1000 to 1015 (Holding and Input)
    for fc in [3, 4]:
        try:
            if fc == 3:
                res = client.read_holding_registers(1000, count=16, slave=1)
            else:
                res = client.read_input_registers(1000, count=16, slave=1)
            
            if not res.isError():
                print(f"FC{fc} Regs 1000-1015: {res.registers}")
            else:
                print(f"FC{fc} Error: {res}")
        except Exception as e:
            print(f"FC{fc} Exception: {e}")

    client.close()

if __name__ == "__main__":
    read_status()
