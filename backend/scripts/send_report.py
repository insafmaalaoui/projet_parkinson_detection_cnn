import urllib.request, json

URL = 'http://localhost:8000/chatbot/message'

def post_report_for(name):
    payload = {'message': f"Écris un rapport pour {name}"}
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(URL, data=data, headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            text = resp.read().decode('utf-8')
            print(text)
    except Exception as e:
        print('ERROR:', e)

if __name__ == '__main__':
    post_report_for('Bochra')
