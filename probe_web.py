import urllib.request

url = "http://192.168.255.1/"
print(f"Fetching {url} ...")

try:
    with urllib.request.urlopen(url, timeout=5) as response:
        html = response.read().decode('utf-8', errors='ignore')
        print(f"Status Code: {response.status}")
        print("Headers:")
        for k, v in response.getheaders():
            print(f"  {k}: {v}")
        print("\nBody (first 1500 chars):")
        print(html[:1500])
except Exception as e:
    print(f"Error fetching web page: {e}")
