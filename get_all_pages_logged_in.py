import urllib.request
import urllib.parse
import http.cookiejar
import re

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
urllib.request.install_opener(opener)

# 1. Login
login_url = "http://192.168.255.1/login.cgi?webpwd=admin123"
print(f"Logging in: {login_url}")
try:
    with urllib.request.urlopen(login_url, timeout=5) as response:
        print(f"Login status: {response.status}")
except Exception as e:
    print(f"Login error: {e}")

# 2. Fetch pages
pages = [
    "s2e.html", "config1.html", "network.html", "filter.html", "moni.html", "main.html",
    "filter.xml", "moni.xml", "tds700.xml", "misc.xml", "monitor.xml"
]

for page in pages:
    url = f"http://192.168.255.1/{page}"
    print(f"\n==================== {url} ====================")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read().decode('utf-8', errors='ignore')
            print(f"Status Code: {response.status}")
            # If it has <script> or <input> or <ajax> let's output a summary or first 1500 chars
            print(content[:2500])
            if len(content) > 2500:
                print("... [TRUNCATED] ...")
    except Exception as e:
        print(f"Error fetching {page}: {e}")
