import sys
from pymodbus.client import ModbusTcpClient

def scan_modbus_map(ip, port, slave_id):
    client = ModbusTcpClient(ip, port=port, timeout=2.0)
    if not client.connect():
        print(f"Could not connect to {ip}:{port}")
        return

    print(f"Scanning Holding Registers (FC3) for Slave ID {slave_id}...")
    found_any = False
    for start_addr in range(0, 2000, 100):
        try:
            result = client.read_holding_registers(start_addr, count=100, slave=slave_id)
            if not result.isError():
                for i, val in enumerate(result.registers):
                    if val != 0:
                        print(f"Holding Register {start_addr + i}: {val} (0x{val:04X})")
                        found_any = True
        except Exception as e:
            pass

    print(f"\nScanning Input Registers (FC4) for Slave ID {slave_id}...")
    for start_addr in range(0, 2000, 100):
        try:
            result = client.read_input_registers(start_addr, count=100, slave=slave_id)
            if not result.isError():
                for i, val in enumerate(result.registers):
                    if val != 0:
                        print(f"Input Register {start_addr + i}: {val} (0x{val:04X})")
                        found_any = True
        except Exception as e:
            pass

    if not found_any:
        print("All scanned registers were ZERO.")
    client.close()

if __name__ == "__main__":
    scan_modbus_map('192.168.255.1', 502, 1)
