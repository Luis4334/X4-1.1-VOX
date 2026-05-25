import sys
sys.path.insert(0, '.')

from pymodbus.client import ModbusTcpClient

IP = '192.168.255.1'

for port in [502, 503, 504]:
    print(f"\n--- Testing Port {port} ---")
    client = ModbusTcpClient(IP, port=port, timeout=2.0)
    if not client.connect():
        print(f"Port {port}: Cannot connect")
        continue
    
    # Try reading holding registers (FC3) address 618
    r = client.read_holding_registers(618, count=1, slave=1)
    if r.isError():
        print(f"FC3 read error on Port {port}: {r}")
    else:
        print(f"FC3 read success on Port {port}: {r.registers}")
        
    client.close()
