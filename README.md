🏥 MediDiagnose - Full Stack AI Medical App

Application complète d’IA pour le diagnostic de la maladie de Parkinson via IRM, avec chatbot RAG et suivi MLflow.


⚡ Installation et lancement
1️⃣ Backend
cd backend/src/api

# Activer l’environnement virtuel
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Installer dépendances si pas déjà fait
pip install -r requirements.txt



# Lancer le serveur FastAPI
python main.py


Le backend est accessible sur http://localhost:8000

Swagger UI : http://localhost:8000/docs

2️⃣ Frontend

Ouvre un autre terminal :

cd frontend/app
npm install
npm run dev


Le frontend sera accessible par défaut sur http://localhost:5173
 (Vite) ou le port affiché.

3️⃣ MLflow UI (tracking des modèles)

Ouvre un troisième terminal :

mlflow ui


Puis ouvre http://localhost:5000
 pour suivre les expériences.

🤖 Chatbot IA (RAG + LLM Groq)

Contextualisé avec les dossiers patients et résultats CNN.

Utilise Groq LLM API pour générer les réponses.

Base vectorielle pour RAG (chunk des documents + embeddings).

Endpoint FastAPI :

POST /chatbot/message
{
    "message": "Quels sont les symptômes du patient ?",
    "case_id": "12345"
}

🔧 Technologies utilisées
Partie	Technologie
Backend	Python, FastAPI, SQLite, SQLAlchemy
Frontend	React, Tailwind, Vite
ML / CNN	TensorFlow, Keras
Chatbot	RAG, Groq LLM API, embeddings, chunking
Tracking	MLflow
Dev / Collaboration	Git, DVC pour dataset et modèles
✅ Bonnes pratiques

Git : branches claires, commits descriptifs

Reproductibilité : requirements.txt, seeds

Tracking ML : MLflow

Respect des données médicales : anonymisation, confidentialité

Documentation : notebooks commentés + README détaillé

🔐 Comptes de test (backend)

Créés automatiquement par init_db.py :

Rôle	Email	Mot de passe
tu peut creer des nouvequx utilisateurs 

Dans le frontend .env :

REACT_APP_API_URL=http://localhost:8000

🚀 Contribution

Crée une branche : git checkout -b feature/ma-feature

Modifie le code

Teste via Swagger UI ou frontend

Commit & push : git push origin feature/ma-feature

📖 Guides supplémentaires

DEMARRAGE_RAPIDE.md : 2-5 minutes

SETUP_GUIDE.md : Installation complète

CONFIG.md : Configuration avancée

TROUBLESHOOTING.md : Résolution des erreurs fréquentes

📜 Licence

MIT License – Libre d’utilisation

MediDiagnose – Application d’IA Médicale complète 🏥
