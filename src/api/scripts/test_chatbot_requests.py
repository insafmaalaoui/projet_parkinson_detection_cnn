import urllib.request, json

URL = 'http://localhost:8000/chatbot/message'

def post(msg, patient_id=None):
    payload = {'message': msg}
    if patient_id:
        payload['patient_id'] = patient_id
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(URL, data=data, headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            text = resp.read().decode('utf-8')
            print('REQUEST:', msg)
            print('RESPONSE:', text)
            print('-'*60)
    except Exception as e:
        print('ERROR:', e)

if __name__ == '__main__':
    post('Quels sont les symptômes les plus fréquents ?')
    post('Quel est le profil moyen des patients ?')
    post('Quels patients ont des troubles cognitifs ?')
    post('Liste les patients avec tremblements')
