import sys, time
sys.path.insert(0, "python_migration")
from pymodbus.client import ModbusSerialClient

PORT     = "COM8"
BAUDRATE = 9600
SLAVE_ID = 1

print("Conectando a " + PORT)
c = ModbusSerialClient(port=PORT, baudrate=BAUDRATE, bytesize=8, parity="N", stopbits=1, timeout=2.0)
ok = c.connect()
print("Conectado: " + str(ok))
if not ok:
    print("FALLO - detener app.py primero")
    sys.exit(1)

def wr(addr, val, sid=SLAVE_ID):
    r = c.write_register(address=addr, value=val, slave=sid)
    err = r.isError()
    rb = None
    if not err:
        rr = c.read_holding_registers(address=addr, count=1, slave=sid)
        if not rr.isError():
            rb = rr.registers[0]
    return not err, rb

print("\n-- PRUEBA HEX 12mA (value=2047) en addr=0 y addr=1 --")
for a in [0,1]:
    ok2,rb = wr(a, 2047)
    print("  addr=%d write_ok=%s readback=%s" % (a, ok2, rb))

print("\n-- PRUEBA EU 12mA (value=1200) en addr=0 y addr=1 --")
for a in [0,1]:
    ok2,rb = wr(a, 1200)
    print("  addr=%d write_ok=%s readback=%s" % (a, ok2, rb))

print("\n-- ESCANEO addr 0-10 y 64-67, escribiendo 4095 (max) --")
for a in list(range(0,11)) + [64,65,66,67]:
    ok2,rb = wr(a, 4095)
    print("  addr=%2d write_ok=%s readback=%s" % (a, ok2, rb))

print("\n-- Prueba Slave IDs 2 y 3 --")
for sid in [2,3]:
    r = c.write_register(address=0, value=4095, slave=sid)
    print("  slave=%d addr=0 error=%s" % (sid, r.isError()))

c.close()
print("\nListo. Revisa cual addr/slave cambia la salida fisica.")
