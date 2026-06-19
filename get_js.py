import urllib.request
import http.cookiejar

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
urllib.request.install_opener(opener)

# Login
login_url = "http://192.168.255.1/login.cgi?webpwd=admin123"
try:
    with urllib.request.urlopen(login_url, timeout=5) as response:
        pass
except Exception as e:
    print(f"Login error: {e}")

# Fetch tds700.js
url = "http://192.168.255.1/tds700.js"
print(f"Fetching {url} ...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=5) as response:
        content = response.read().decode('utf-8', errors='ignore')
        print(content[:5000])
except Exception as e:
    print(f"Error fetching tds700.js: {e}")
