# 🏥 MediDiagnose - Backend FastAPI + SQLite

**Application médicale d'IA pour le diagnostic de la maladie de Parkinson par analyse d'images IRM**

## 📋 Contenu du Dossier Backend

\`\`\`
backend/
├── main.py                    ← Le serveur FastAPI (à lancer)
├── database.py                ← Configuration SQLite
├── models.py                  ← Schémas des tables de la BD
├── schemas.py                 ← Validation Pydantic
├── auth.py                    ← Authentification JWT
├── cnn_predictor.py           ← Prédiction CNN Parkinson
├── chatbot_service.py         ← Service chatbot contextualisé
├── init_db.py                 ← Script d'initialisation BD
├── requirements.txt           ← Dépendances Python
├── .env                       ← Configuration (crée automatiquement)
├── medidiagnose.db            ← Base de données (crée automatiquement)
├── RUN_ME_FIRST.bat           ← Script Windows (double-clique!)
├── run.sh                     ← Script Mac/Linux (bash run.sh)
├── DEMARRAGE_RAPIDE.md        ← Guide 2-5 minutes
├── SETUP_GUIDE.md             ← Guide détaillé complet
├── CONFIG.md                  ← Configuration avancée
├── TROUBLESHOOTING.md         ← Dépannage
└── README.md                  ← Ce fichier
\`\`\`

---

## 🚀 Lancement en 2 minutes

### Option 1: Script automatique (Recommandé)

**Windows:**
1. Double-clique sur `RUN_ME_FIRST.bat`
2. Attends la fin
3. Ouvrir http://localhost:8000/docs ✅

**Mac/Linux:**
\`\`\`bash
chmod +x run.sh
./run.sh
\`\`\`

### Option 2: Manuel (si le script ne marche pas)

\`\`\`bash
# 1. Ouvrir Terminal dans le dossier backend/

# 2. Créer l'environnement virtuel
# Windows:
python -m venv venv
venv\Scripts\activate

# Mac/Linux:
python3 -m venv venv
source venv/bin/activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Initialiser la base de données
python init_db.py

# 5. Lancer le serveur
python main.py
\`\`\`

Tu dois voir:
\`\`\`
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
\`\`\`

✅ **Le backend est lancé!**

---

## 🌐 Accéder à l'API

| URL | Utilité |
|-----|---------|
| http://localhost:8000 | API Base |
| **http://localhost:8000/docs** | **Swagger UI (tester les endpoints)** |
| http://localhost:8000/redoc | Documentation ReDoc |
| http://localhost:8000/health | Vérifier l'état du serveur |

---

## 🔐 Comptes de Test

Créés automatiquement par `init_db.py`:

| Rôle | Email | Mot de passe |
|------|-------|---------|
| 👨‍💼 Admin | admin@medidiagnose.com | admin123 |
| 👨‍⚕️ Neuro | dr.smith@medidiagnose.com | neuro123 |
| 👤 Patient | patient@medidiagnose.com | patient123 |
| 👤 Patient 2 | marie@medidiagnose.com | patient123 |

### Tester via Swagger UI:

1. Va à http://localhost:8000/docs
2. Clique sur "POST /auth/login"
3. Clique "Try it out"
4. Remplace le JSON par:
\`\`\`json
{
  "email": "admin@medidiagnose.com",
  "password": "admin123",
  "role": "admin"
}
\`\`\`
5. Clique "Execute"
6. Tu reçois un **access_token** ✅

---

## 📚 Endpoints Principales

### Authentification
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion (retourne JWT token)

### Patient
- `POST /cases/create` - Créer un nouveau cas (upload IRM)
- `GET /cases` - Voir ses cas

### Neurologist
- `GET /neurologist/cases` - Voir les cas en attente
- `GET /neurologist/case/{case_id}` - Détails d'un cas
- `POST /neurologist/case/{case_id}/report` - Soumettre un diagnostic

### Chatbot
- `POST /chatbot/message` - Envoyer un message (contextualisé par le cas)

### Admin
- `GET /admin/users` - Voir tous les utilisateurs
- `DELETE /admin/users/{user_id}` - Supprimer un utilisateur

---

## 🏗️ Architecture Backend

\`\`\`
┌─────────────────┐
│  FastAPI Server │
│  (main.py)      │
└────────┬────────┘
         │
    ┌────▼─────────────────────────┐
    │  Routes & Endpoints           │
    │  - Auth                       │
    │  - Patient                    │
    │  - Neurologist               │
    │  - Chatbot                   │
    │  - Admin                     │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────┐
    │  SQLAlchemy ORM   │
    │  (models.py)      │
    └────┬──────────────┘
         │
    ┌────▼──────────────────┐
    │  SQLite Database      │
    │  (medidiagnose.db)    │
    │  - users              │
    │  - medical_cases      │
    │  - mri_images         │
    └───────────────────────┘

┌─────────────────────┐
│  Services           │
│  - auth.py          │
│  - cnn_predictor.py │
│  - chatbot_service  │
└─────────────────────┘
\`\`\`

---

## 🔧 Configuration

### Fichier .env (créé automatiquement)

\`\`\`env
DATABASE_URL=sqlite:///./medidiagnose.db
SECRET_KEY=your-super-secret-key-change-in-production-12345
ENVIRONMENT=development
\`\`\`

### Changer les configurations:

**Port du serveur (défaut 8000):**
Modifie `main.py`:
\`\`\`python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Port 8001
\`\`\`

**Durée du JWT token (défaut 24h):**
Modifie `auth.py`:
\`\`\`python
ACCESS_TOKEN_EXPIRE_MINUTES = 7200  # 5 jours
\`\`\`

---

## 🤖 Intégrer votre CNN Parkinson

Le modèle CNN est actuellement un **placeholder** (prédiction aléatoire).

### Pour intégrer votre modèle réel:

**Fichier: `cnn_predictor.py`**

\`\`\`python
import tensorflow as tf
from PIL import Image
import numpy as np

# 1. Charger le modèle
MODEL_PATH = "path/to/your/parkinson_model.h5"
model = tf.keras.models.load_model(MODEL_PATH)

# 2. Modifier la fonction de prédiction
async def analyze_case(case_id: str, db: Session):
    case = db.query(models.MedicalCase).filter(...).first()
    
    # Charger et traiter les images
    predictions = []
    for image in case.images:
        img = Image.open(image.file_path)
        img = img.resize((224, 224))
        img_array = np.array(img) / 255.0
        
        # Prédire
        pred = model.predict(img_array)
        predictions.append(pred[0][0])
    
    # Moyenne des prédictions
    avg_prediction = np.mean(predictions)
    
    case.cnn_prediction = avg_prediction
    case.cnn_confidence = 0.95
    case.status = "analyzed"
    db.commit()
\`\`\`

---

## 💾 Stockage des Images

Actuellement, les images ne sont **pas sauvegardées** sur disque (placeholder).

### Pour stocker les images:

**Option 1: Disque local**
\`\`\`python
import os
from fastapi import UploadFile

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def create_case(files: List[UploadFile], ...):
    for file in files:
        file_path = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        image = MRIImage(case_id=case.id, file_path=file_path)
\`\`\`

**Option 2: AWS S3**
\`\`\`python
import boto3

s3_client = boto3.client('s3')

async def create_case(files: List[UploadFile], ...):
    for file in files:
        s3_client.upload_fileobj(
            file.file,
            "medidiagnose-bucket",
            f"cases/{case.id}/{file.filename}"
        )
\`\`\`

---

## 🤖 Intégrer un Chatbot IA

Le chatbot est actuellement **basé sur des keywords simples**.

### Pour utiliser OpenAI API:

**Installation:**
\`\`\`bash
pip install openai
\`\`\`

**Fichier: `chatbot_service.py`**
\`\`\`python
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def get_response(message: str, case: MedicalCase, user: User) -> str:
    context = f"""
    You are a medical assistant helping neurologists.
    Patient: {case.patient.first_name} {case.patient.last_name}
    Symptoms: {case.description}
    CNN Prediction: {case.cnn_prediction}
    
    User question: {message}
    """
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": context}]
    )
    
    return response.choices[0].message.content
\`\`\`

---

## 🚀 Déploiement

### Heroku
\`\`\`bash
heroku create medidiagnose-api
git push heroku main
\`\`\`

### Railway
1. Va sur railway.app
2. Connecte ton repo GitHub
3. Railway auto-déploie

### AWS Lambda + RDS
- Utilise Zappa pour déployer FastAPI sur Lambda
- Utilise RDS pour PostgreSQL

---

## 📖 Guides Disponibles

| Guide | Description |
|-------|-------------|
| **DEMARRAGE_RAPIDE.md** | 2-5 minutes (ultra simple) |
| **SETUP_GUIDE.md** | Guide complet et détaillé |
| **CONFIG.md** | Configuration avancée |
| **TROUBLESHOOTING.md** | Dépannage des erreurs |

---

## ✅ Checklist Installation

- [ ] Python 3.10+ installé
- [ ] Repo cloné/extrait
- [ ] Terminal ouvert dans `backend/`
- [ ] Venv créé et activé
- [ ] Dépendances installées
- [ ] Base de données initialisée
- [ ] Serveur lancé (port 8000)
- [ ] Accès à http://localhost:8000/docs

---

## 📡 Connexion au Frontend React

Le frontend React se connecte au backend sur **http://localhost:8000**

**Frontend .env:**
\`\`\`env
REACT_APP_API_URL=http://localhost:8000
\`\`\`

---

## 🤝 Contribution

Pour modifier/ajouter des fonctionnalités:

1. Crée une branche: \`git checkout -b feature/ma-feature\`
2. Fais tes modifications
3. Teste via Swagger UI
4. Commit et push: \`git push origin feature/ma-feature\`

---

## 📞 Support

1. Lis les guides dans cet ordre:
   - DEMARRAGE_RAPIDE.md
   - TROUBLESHOOTING.md
   - CONFIG.md

2. Vérifie les logs du serveur
3. Teste avec les comptes de test
4. Essaie http://localhost:8000/health

---

## 📜 Licence

MIT License - Libre d'utilisation

---

**Créé pour MediDiagnose - Application d'IA Médicale 🏥**
