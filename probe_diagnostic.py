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

# Let's read FC3 holding registers 500-515
print("\n--- Reading Holding Registers (FC3) 500-515 ---")
r = client.read_holding_registers(500, count=16, slave=1)
if r.isError():
    print(f"Error reading holding registers: {r}")
else:
    for i, val in enumerate(r.registers):
        addr = 500 + i
        print(f"Address {addr} (0x{addr:X}): {val} (0x{val:X})")

# Let's read FC4 input registers 500-515
print("\n--- Reading Input Registers (FC4) 500-515 ---")
r = client.read_input_registers(500, count=16, slave=1)
if r.isError():
    print(f"Error reading input registers: {r}")
else:
    for i, val in enumerate(r.registers):
        addr = 500 + i
        print(f"Address {addr} (0x{addr:X}): {val} (0x{val:X})")

client.close()
