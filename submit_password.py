import urllib.request
import urllib.parse

# Let's try to change password from admin to admin123
url = "http://192.168.255.1/chgpwd.cgi"
params = {
    "webpwd": "admin",
    "newpwd1": "admin123",
    "newpwd2": "admin123"
}
query_string = urllib.parse.urlencode(params)
full_url = f"{url}?{query_string}"

print(f"Submitting password change to: {full_url}")

try:
    req = urllib.request.Request(
        full_url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        html = response.read().decode('utf-8', errors='ignore')
        print(f"Status Code: {response.status}")
        print("Response HTML:")
        print(html)
except Exception as e:
    print(f"Error changing password: {e}")
