import time
from pymodbus.client import ModbusTcpClient

IP = '192.168.255.1'
PORT = 502

client = ModbusTcpClient(IP, port=PORT, timeout=3.0)
if not client.connect():
    print("ERROR: Cannot connect to Modbus TCP port 502")
    exit(1)

print("Connected! Starting read loop (10 iterations, 3 seconds delay)...")
for i in range(1, 11):
    t0 = time.time()
    r = client.read_holding_registers(618, count=13, slave=1)
    duration = time.time() - t0
    if r.isError():
        print(f"Iteration {i:2d} (took {duration:.2f}s): ERROR {r}")
    else:
        print(f"Iteration {i:2d} (took {duration:.2f}s): SUCCESS, values={r.registers}")
    time.sleep(3.0)

client.close()
print("Done!")
