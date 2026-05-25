import urllib.request

# Access pages after login
for page in ["filter.html", "moni.html", "filter.xml", "moni.xml"]:
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
            print(html[:2000])
    except Exception as e:
        print(f"Error fetching {page}: {e}")
