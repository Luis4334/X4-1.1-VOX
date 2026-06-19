import urllib.request
import http.cookiejar
import time
from pymodbus.client import ModbusTcpClient

# 1. Login and reboot
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
urllib.request.install_opener(opener)

login_url = "http://192.168.255.1/login.cgi?webpwd=admin123"
print(f"Logging in to gateway...")
try:
    urllib.request.urlopen(login_url, timeout=5)
    print("Login OK!")
except Exception as e:
    print(f"Login failed: {e}")

reboot_url = "http://192.168.255.1/reboot.cgi?mysubmit2=Reboot"
print(f"Triggering reboot: {reboot_url}")
try:
    with urllib.request.urlopen(reboot_url, timeout=5) as response:
        print(f"Reboot response status: {response.status}")
except Exception as e:
    print(f"Reboot trigger error (this might be normal if connection is severed): {e}")

print("Waiting 15 seconds for gateway to reboot and come back online...")
time.sleep(15)

# 2. Test Modbus TCP connection
IP = '192.168.255.1'
PORT = 502
client = ModbusTcpClient(IP, port=PORT, timeout=3.0)
if not client.connect():
    print("ERROR: Cannot connect to Modbus TCP port 502")
else:
    print("Connected to Modbus TCP port 502. Testing holding register read at 618...")
    r = client.read_holding_registers(618, count=13, slave=1)
    if r.isError():
        print(f"Modbus read error: {r}")
    else:
        print("Modbus read SUCCESS!")
        print(f"Registers: {r.registers}")
    client.close()
