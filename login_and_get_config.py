import urllib.request
import urllib.parse
import http.cookiejar

# Create a cookie jar
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
urllib.request.install_opener(opener)

# 1. Login
login_url = "http://192.168.255.1/login.cgi?webpwd=admin123"
print(f"Logging in via: {login_url}")
try:
    with urllib.request.urlopen(login_url, timeout=5) as response:
        print(f"Login status: {response.status}")
except Exception as e:
    print(f"Login error: {e}")

# 2. Fetch XML files containing actual settings data
for page in ["tds700.xml", "misc.xml"]:
    url = f"http://192.168.255.1/{page}"
    print(f"\n==================== {url} ====================")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            xml = response.read().decode('utf-8', errors='ignore')
            print(f"Status Code: {response.status}")
            print(xml)
    except Exception as e:
        print(f"Error fetching {page}: {e}")
