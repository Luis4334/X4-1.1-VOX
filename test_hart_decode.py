import struct

m = {
    618: 0x0400, 619: 0x7940, 620: 0xCB96, 621: 0x00F2, 622: 0x0000,
    623: 0x0100, 624: 0x81C0, 625: 0x577B, 626: 0xC006, 627: 0x5737,
    628: 0x2164, 629: 0x8742, 630: 0x1478, 631: 0x0000, 632: 0x0000
}

def decode_float(r0, r1):
    try: abcd = struct.unpack('>f', struct.pack('>HH', r0, r1))[0]
    except: abcd = 0
    try: cdab = struct.unpack('>f', struct.pack('>HH', r1, r0))[0]
    except: cdab = 0
    try: badc = struct.unpack('>f', struct.pack('<HH', r0, r1))[0]
    except: badc = 0
    try: dcba = struct.unpack('<f', struct.pack('>HH', r0, r1))[0]
    except: dcba = 0
    return abcd, cdab, badc, dcba

print("Pair      | ABCD (BigE) | CDAB (WordSwap) | BADC (ByteSwap) | DCBA (LittleE)")
print("-" * 80)
for i in range(619, 630):
    a, c, b, d = decode_float(m.get(i, 0), m.get(i+1, 0))
    print(f"{i},{i+1} | {a:11.3e} | {c:11.3e}     | {b:11.3e}     | {d:11.3e}")

print("\nRegisters in hex:")
for i in range(618, 631):
    print(f"{i}: 0x{m.get(i,0):04X}")
