import urllib.request
import http.cookiejar
import re

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
urllib.request.install_opener(opener)

# Login
login_url = "http://192.168.255.1/login.cgi?webpwd=admin123"
urllib.request.urlopen(login_url, timeout=5)

for page in ["network.html", "s2e.html", "filter.html"]:
    url = f"http://192.168.255.1/{page}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8', errors='ignore')
            print(f"\nSearching in {page}:")
            # Find all forms and inputs
            forms = re.findall(r'<form.*?>.*?</form>', html, re.DOTALL | re.IGNORECASE)
            for f in forms:
                print("  Form:", re.search(r'<form.*?>', f, re.IGNORECASE).group(0))
                for input_field in re.findall(r'<input.*?>', f, re.IGNORECASE):
                    print("    Input:", input_field)
    except Exception as e:
        print(f"Error {page}: {e}")
