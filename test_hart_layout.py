import sys
from pymodbus.client import ModbusTcpClient
import struct

def decode_badc(r0, r1):
    return struct.unpack('>f', struct.pack('<HH', r0, r1))[0]

client = ModbusTcpClient('192.168.255.1', port=502)
if client.connect():
    result = client.read_input_registers(618, count=25, slave=1)
    if not result.isError():
        regs = result.registers
        print(f"Status: 0x{regs[0]:04X}")
        print(f"Float 1 (619): {decode_badc(regs[1], regs[2]):.4f}")
        print(f"Float 2 (624): {decode_badc(regs[6], regs[7]):.4f}")
        print(f"Float 3 (629): {decode_badc(regs[11], regs[12]):.4f}")
        print(f"Float 4 (634): {decode_badc(regs[16], regs[17]):.4f}")
    client.close()
