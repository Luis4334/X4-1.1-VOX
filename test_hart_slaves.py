import sys
sys.path.insert(0, '.')
import json
from python_migration.comunicacion_hart import _get_client, _read_with_retry, _parse_registers

config_base = {
    'mode': 'tcp', 'ip': '192.168.255.1', 'port': 502,
    'start_address': 618
}

client = _get_client(config_base)
if not client:
    print("Could not connect.")
    sys.exit(1)

for slave in [0, 1, 2, 255]:
    print(f"\n--- Testing Slave ID {slave} ---")
    try:
        r, _ = _read_with_retry(client, 3, 618, 13, slave)
        if r.isError():
            print(f"Error reading holding registers: {r}")
        else:
            print(f"Holding Registers: {r.registers}")
            try:
                parsed = _parse_registers(r)
                print(f"Parsed: {json.dumps(parsed, indent=2)}")
            except Exception as e:
                print(f"Parse error: {e}")
                
        r, _ = _read_with_retry(client, 4, 618, 13, slave)
        if r.isError():
            print(f"Error reading input registers: {r}")
        else:
            print(f"Input Registers: {r.registers}")
            
    except Exception as e:
        print(f"Exception: {e}")

