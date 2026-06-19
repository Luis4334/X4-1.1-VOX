import sys
sys.path.insert(0, '.')

from pymodbus.client import ModbusTcpClient

IP   = '192.168.255.1'
PORT = 502

client = ModbusTcpClient(IP, port=PORT, timeout=2.0)
if not client.connect():
    print("ERROR: Cannot connect")
    sys.exit(1)

print(f"Connected to {IP}:{PORT}")

print("\n--- Testing different Slave IDs at address 618 ---")
# Let's test a subset of common Modbus slave IDs
for slave in [0, 1, 2, 3, 4, 5, 10, 16, 32, 64, 100, 247, 255]:
    r = client.read_holding_registers(618, count=1, slave=slave)
    if r.isError():
        print(f"Slave {slave:3d}: {r}")
    else:
        print(f"Slave {slave:3d}: OK, val={r.registers[0]}")

client.close()
