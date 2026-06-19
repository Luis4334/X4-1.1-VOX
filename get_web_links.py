import urllib.request

for page in ["header.html", "footer.html", "main.html", "index.html"]:
    url = f"http://192.168.255.1/{page}"
    print(f"\n==================== {url} ====================")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8', errors='ignore')
            print(f"Status Code: {response.status}")
            print(html)
    except Exception as e:
        print(f"Error fetching {page}: {e}")
