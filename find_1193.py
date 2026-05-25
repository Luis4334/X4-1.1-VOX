import sys
from pymodbus.client import ModbusTcpClient
import struct

def search_float(ip, port, slave_id, target):
    client = ModbusTcpClient(ip, port=port, timeout=2.0)
    if not client.connect():
        return
    
    def check_val(r0, r1, name, addr):
        for fmt, desc in [('>f', '>HH', 'ABCD'), ('>f', '<HH', 'BADC'), ('<f', '>HH', 'DCBA'), ('<f', '<HH', 'CDAB')]:
            try:
                val = struct.unpack(fmt[0], struct.pack(fmt[1], r0, r1))[0]
                if abs(val - target) < 1.0:
                    print(f"FOUND near {target} at {name} {addr}, {addr+1} ({desc}): {val}")
            except:
                pass

    print(f"Searching for {target}...")
    for start in range(0, 2000, 100):
        try:
            res = client.read_input_registers(start, count=100, slave=slave_id)
            if not res.isError():
                for i in range(99):
                    check_val(res.registers[i], res.registers[i+1], 'InputReg', start + i)
        except: pass
        try:
            res = client.read_holding_registers(start, count=100, slave=slave_id)
            if not res.isError():
                for i in range(99):
                    check_val(res.registers[i], res.registers[i+1], 'HoldingReg', start + i)
        except: pass
    client.close()

if __name__ == "__main__":
    search_float('192.168.255.1', 502, 1, 11.93)
