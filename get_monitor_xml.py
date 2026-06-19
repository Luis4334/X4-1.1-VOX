import urllib.request
import http.cookiejar

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
urllib.request.install_opener(opener)

# Login
login_url = "http://192.168.255.1/login.cgi?webpwd=admin123"
urllib.request.urlopen(login_url, timeout=5)

# Fetch monitor.xml
url = "http://192.168.255.1/monitor.xml"
print(f"Fetching {url} ...")
try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        xml = response.read().decode('utf-8', errors='ignore')
        print(xml)
except Exception as e:
    print(f"Error fetching monitor.xml: {e}")
