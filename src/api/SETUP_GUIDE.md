# MediDiagnose - Guide Complet d'Installation et Lancement

## ⚡ RAPIDE - En 5 Minutes

### 1. Prérequis
- **Python 3.10+** → Télécharge depuis [python.org](https://www.python.org/downloads/)
- **Vérifie l'installation**: Ouvre CMD/Terminal et tape:
  \`\`\`bash
  python --version
  \`\`\`

### 2. Cloner/Extraire le projet
\`\`\`bash
# Si tu as téléchargé le ZIP:
cd chemin/vers/ton/dossier
cd backend
\`\`\`

### 3. Créer l'environnement virtuel
\`\`\`bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
\`\`\`

### 4. Installer les dépendances
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 5. Initialiser la base de données SQLite
\`\`\`bash
python init_db.py
\`\`\`
Cela crée automatiquement `medidiagnose.db` dans le dossier `backend/`

### 6. Lancer le serveur FastAPI
\`\`\`bash
python main.py
\`\`\`

**✅ Succès!** Votre serveur tourne sur: `http://localhost:8000`

---

## 📋 DÉTAILLÉ - Étape par étape

### Étape 1: Installer Python

**Windows:**
1. Va sur https://www.python.org/downloads/
2. Clique sur "Download Python 3.11" (ou 3.12)
3. **IMPORTANT**: Coche "Add Python to PATH" pendant l'installation
4. Clique "Install Now"

**Mac/Linux:**
\`\`\`bash
# Mac (avec Homebrew)
brew install python3

# Linux (Ubuntu/Debian)
sudo apt-get install python3 python3-venv python3-pip
\`\`\`

**Vérifie:**
\`\`\`bash
python --version
# Doit afficher: Python 3.10+ (version 3.11 ou plus est recommandée)
\`\`\`

---

### Étape 2: Cloner/Extraire le projet

Si tu as téléchargé le ZIP:
1. Extrais le ZIP n'importe où sur ton disque
2. Ouvre CMD/Terminal dans le dossier `backend/`

\`\`\`bash
# Exemple sur Windows:
cd C:\Users\tonnom\Documents\medidiagnose\backend

# Exemple sur Mac:
cd /Users/tonnom/Documents/medidiagnose/backend
\`\`\`

---

### Étape 3: Créer et activer l'environnement virtuel

Un "environnement virtuel" isole les dépendances du projet.

**Windows:**
\`\`\`bash
python -m venv venv
venv\Scripts\activate
\`\`\`
Tu dois voir `(venv)` au début de ta ligne de commande.

**Mac/Linux:**
\`\`\`bash
python3 -m venv venv
source venv/bin/activate
\`\`\`

---

### Étape 4: Installer les dépendances

\`\`\`bash
pip install -r requirements.txt
\`\`\`

**Cela installe:**
- FastAPI (framework web)
- SQLAlchemy (ORM pour la base de données)
- SQLite3 (base de données)
- PyJWT (authentification)
- python-multipart (upload fichiers)
- Et autres...

**Attends 2-3 minutes...**

---

### Étape 5: Initialiser la base de données SQLite

\`\`\`bash
python init_db.py
\`\`\`

**Cela crée:**
- `medidiagnose.db` (fichier SQLite dans le dossier backend/)
- **4 tables**: Users, MedicalCases, MRIImages, etc.
- **Données de test** pour commencer à utiliser l'app

**Résultat attendu:**
\`\`\`
✅ Database initialized successfully!
✅ Tables created:
   - users
   - medical_cases
   - mri_images
   - reports
✅ Test data inserted
\`\`\`

---

### Étape 6: Lancer le serveur FastAPI

\`\`\`bash
python main.py
\`\`\`

**Résultat attendu:**
\`\`\`
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
\`\`\`

---

## 🌐 Accéder à l'application

### API Documentation (Swagger UI)
Ouvre ton navigateur et va à:
\`\`\`
http://localhost:8000/docs
\`\`\`
Ici tu peux tester tous les endpoints!

### Teste les endpoints:
1. Clique sur "POST /auth/login"
2. Clique "Try it out"
3. Remplace par:
\`\`\`json
{
  "email": "admin@medidiagnose.com",
  "password": "admin123",
  "role": "admin"
}
\`\`\`
4. Clique "Execute"
5. Tu reçois un **JWT token** (à utiliser pour les requêtes)

---

## 🖥️ Lancer le Frontend React (dans une autre fenêtre)

**Nouvelle fenêtre CMD/Terminal:**

\`\`\`bash
# Va dans le dossier frontend
cd ../frontend

# Installe les dépendances
npm install

# Lance le serveur React
npm run dev
\`\`\`

**Accès:** `http://localhost:3000`

**Le frontend** va automatiquement se connecter au backend FastAPI sur `http://localhost:8000`

---

## 📊 Fichiers et Dossiers

\`\`\`
backend/
├── medidiagnose.db          ← Base de données SQLite (créée automatiquement)
├── main.py                  ← Serveur FastAPI (à lancer)
├── database.py              ← Configuration SQLite
├── models.py                ← Schémas des tables
├── schemas.py               ← Schémas Pydantic (validation)
├── auth.py                  ← Authentification JWT
├── cnn_predictor.py         ← Prédiction CNN Parkinson
├── chatbot_service.py       ← Service chatbot
├── init_db.py               ← Script d'initialisation
├── requirements.txt         ← Dépendances Python
└── SETUP_GUIDE.md           ← Ce fichier
\`\`\`

---

## 🔐 Comptes de Test

L'app crée automatiquement ces comptes:

### Admin
- **Email:** `admin@medidiagnose.com`
- **Password:** `admin123`
- **Accès:** Dashboard admin complet

### Neurologist
- **Email:** `dr.smith@medidiagnose.com`
- **Password:** `neuro123`
- **Accès:** Voir les cas, faire des diagnostics

### Patient
- **Email:** `patient@medidiagnose.com`
- **Password:** `patient123`
- **Accès:** Upload IRM, suivre les diagnostics

---

## 🚨 Problèmes Courants

### ❌ "python not found" ou "command not found: python"
**Solution:** Python n'est pas installé ou pas dans PATH
1. Réinstalle Python et coche "Add Python to PATH"
2. Redémarre ton ordinateur
3. Réouvre CMD/Terminal

### ❌ "ModuleNotFoundError: No module named 'fastapi'"
**Solution:** L'environnement virtuel n'est pas activé
\`\`\`bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
\`\`\`

### ❌ "Port 8000 already in use"
**Solution:** Un autre processus utilise le port
\`\`\`bash
# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
\`\`\`

### ❌ "database is locked" ou "sqlite3.OperationalError"
**Solution:** Supprime et recréé la base de données
\`\`\`bash
del medidiagnose.db          # Windows
rm medidiagnose.db           # Mac/Linux

python init_db.py
\`\`\`

---

## 📡 Tester les API avec CURL

\`\`\`bash
# 1. Login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@medidiagnose.com\",\"password\":\"admin123\",\"role\":\"admin\"}"

# Copie le token reçu (access_token)

# 2. Utiliser le token pour une requête protégée
curl -X GET "http://localhost:8000/admin/users" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
\`\`\`

---

## ✅ Checklist de Vérification

- [ ] Python 3.10+ installé
- [ ] Venv créé et activé
- [ ] Dépendances installées (`pip install -r requirements.txt`)
- [ ] Base de données initialisée (`python init_db.py`)
- [ ] Serveur lancé (`python main.py`)
- [ ] FastAPI Swagger UI accessible sur `http://localhost:8000/docs`
- [ ] Frontend lancé sur `http://localhost:3000`
- [ ] Possibilité de se login avec les comptes de test

---

## 🎯 Prochaines Étapes

1. **Intégrer votre modèle CNN réel** dans `cnn_predictor.py`
2. **Configurer l'upload d'images** (stockage cloud: AWS S3, Azure, etc.)
3. **Intégrer un vrai chatbot** (OpenAI API, Anthropic, etc.)
4. **Déployer sur** Vercel (frontend) + Heroku/Railway (backend)
5. **Ajouter HTTPS** pour la sécurité médicale

---

**Questions?** Besoin d'aide? Demande moi!
