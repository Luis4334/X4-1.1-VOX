import urllib.request

url = "http://192.168.255.1/moni.html"
print(f"Fetching full {url} ...")

try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        html = response.read().decode('utf-8', errors='ignore')
        print("--- SCRIPT SECTIONS ---")
        import re
        scripts = re.findall(r'<script.*?>.*?</script>', html, re.DOTALL)
        for s in scripts:
            print(s)
            print("-" * 50)
except Exception as e:
    print(f"Error: {e}")
