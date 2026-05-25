"""
Diagnóstico profundo del ICP DAS HRT-711.
Escanea rangos típicos del gateway HART y también lee registros de estado
del propio gateway para entender qué está pasando internamente.
"""
import sys, time
sys.path.insert(0, '.')

from pymodbus.client import ModbusTcpClient

IP   = '192.168.255.1'
PORT = 502

client = ModbusTcpClient(IP, port=PORT, timeout=3.0)
if not client.connect():
    print("ERROR: No se puede conectar")
    sys.exit(1)

print(f"Conectado a {IP}:{PORT}")
print("=" * 70)

def scan_range(label, start, count, fc=3, slave=1):
    print(f"\n[{label}] FC{fc} addr={start}-{start+count-1} slave={slave}")
    if fc == 3:
        r = client.read_holding_registers(start, count=count, slave=slave)
    else:
        r = client.read_input_registers(start, count=count, slave=slave)
    if r.isError():
        print(f"  ERR: {r} (code={getattr(r,'exception_code','?')})")
        return []
    vals = r.registers
    non_zero = [(i+start, hex(v), v) for i, v in enumerate(vals) if v != 0]
    if non_zero:
        print(f"  ✅ DATOS NO-CERO encontrados:")
        for addr, hexv, intv in non_zero:
            print(f"     addr={addr:5d} = {hexv:8s} ({intv})")
    else:
        print(f"  (todos cero) vals={[hex(v) for v in vals[:5]]}...")
    return vals

# Rangos típicos del ICP DAS HRT-711 según documentación
# El HRT-711 tiene:
#   - Registros de estado del gateway (primeros registros)
#   - Datos de PV del instrumento HART (depende del modelo)

print("\n=== PROBANDO DIFERENTES SLAVE IDs ===")
for slave in [0, 1, 2, 8, 16]:
    r = client.read_holding_registers(0, count=5, slave=slave)
    if not r.isError():
        vals = r.registers
        nz = any(v != 0 for v in vals)
        print(f"  slave={slave:2d}: {[hex(v) for v in vals]}  {'<-- DATOS!' if nz else ''}")
    else:
        print(f"  slave={slave:2d}: ERR code={getattr(r,'exception_code','?')}")
    time.sleep(0.1)

print("\n=== ESCANEO AMPLIO FC3 (Holding) slave=1 ===")
# Rangos conocidos del HRT-711:
# 0x0000-0x001F: Estado del gateway
# 0x0100-0x01FF: Canal 0 HART
# 0x026A (618):  Dirección que teníamos
# 0x0400+:       Posibles datos extendidos
for start in [0, 32, 64, 96, 128, 256, 512, 600, 616, 618, 640, 768, 1000, 2000]:
    r = client.read_holding_registers(start, count=8, slave=1)
    if not r.isError():
        vals = r.registers
        nz = any(v != 0 for v in vals)
        marker = "  <-- DATOS NO-CERO!" if nz else ""
        print(f"  addr={start:5d}: {[hex(v) for v in vals]}{marker}")
    else:
        print(f"  addr={start:5d}: ERR {r}")
    time.sleep(0.1)

print("\n=== ESCANEO FC4 (Input Registers) slave=1 ===")
for start in [0, 32, 100, 256, 618]:
    r = client.read_input_registers(start, count=8, slave=1)
    if not r.isError():
        vals = r.registers
        nz = any(v != 0 for v in vals)
        marker = "  <-- DATOS!" if nz else ""
        print(f"  addr={start:5d}: {[hex(v) for v in vals]}{marker}")
    else:
        print(f"  addr={start:5d}: ERR {r}")
    time.sleep(0.1)

client.close()
print("\n=== Diagnóstico completado ===")
print("\nSi todo es cero: El instrumento HART no está respondiendo al gateway.")
print("Accede a http://192.168.255.1 → verifica 'HART Status' y 'Device List'")
