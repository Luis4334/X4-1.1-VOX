import sys
sys.path.insert(0, '.')

from pymodbus.client import ModbusTcpClient

IP   = '192.168.255.1'
PORT = 502

client = ModbusTcpClient(IP, port=PORT, timeout=3.0)
if not client.connect():
    print("ERROR: Cannot connect")
    sys.exit(1)

print(f"Connected to {IP}:{PORT}")

# Let's test different counts at address 618 using FC3
print("\n--- Testing different register counts at 618 with FC3 ---")
for count in [1, 2, 4, 6, 8, 12, 13, 14, 20]:
    r = client.read_holding_registers(618, count=count, slave=1)
    if r.isError():
        print(f"Count {count:2d}: ERR {r}")
    else:
        print(f"Count {count:2d}: OK, values: {[hex(v) for v in r.registers]}")

# Let's test different counts at address 618 using FC4
print("\n--- Testing different register counts at 618 with FC4 ---")
for count in [1, 2, 4, 6, 8, 12, 13, 14, 20]:
    r = client.read_input_registers(618, count=count, slave=1)
    if r.isError():
        print(f"Count {count:2d}: ERR {r}")
    else:
        print(f"Count {count:2d}: OK, values: {[hex(v) for v in r.registers]}")

client.close()
