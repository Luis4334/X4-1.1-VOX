import sys
sys.path.insert(0, '.')
from pymodbus.client import ModbusSerialClient

client = ModbusSerialClient(port='COM8', baudrate=9600, timeout=1.0)
client.connect()
result = client.read_holding_registers(0, 6, slave=1)
if result.isError():
    print("Error:", result)
else:
    print("Registers (holding):", result.registers)

result2 = client.read_input_registers(0, 6, slave=1)
if result2.isError():
    print("Error (input):", result2)
else:
    print("Registers (input):", result2.registers)

client.close()
