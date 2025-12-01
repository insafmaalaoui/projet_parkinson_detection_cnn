# ⚙️ Configuration - MediDiagnose

## Variables d'Environnement (.env)

Le fichier `.env` contient les configurations. Voici ce que tu dois savoir:

\`\`\`env
DATABASE_URL=sqlite:///./medidiagnose.db
SECRET_KEY=your-super-secret-key-change-in-production-12345
ENVIRONMENT=development
\`\`\`

### 🔐 Pour la PRODUCTION:

1. **DATABASE_URL** - Change le chemin si tu utilises PostgreSQL:
\`\`\`env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost/medidiagnose

# MySQL
DATABASE_URL=mysql+pymysql://user:password@localhost/medidiagnose
\`\`\`

2. **SECRET_KEY** - Utilise une clé sécurisée (min 32 caractères):
\`\`\`python
# Génère une clé sécurisée avec:
import secrets
secrets.token_urlsafe(32)
\`\`\`

3. **ENVIRONMENT** - Change en "production"
\`\`\`env
ENVIRONMENT=production
\`\`\`

## 🐳 Docker (Optionnel)

Pour dockeriser l'app:

\`\`\`dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
\`\`\`

Puis:
\`\`\`bash
docker build -t medidiagnose .
docker run -p 8000:8000 medidiagnose
\`\`\`

## ☁️ Déploiement sur Heroku

\`\`\`bash
# 1. Installe Heroku CLI
# 2. Crée un Procfile:
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile

# 3. Deploy
heroku create medidiagnose
git push heroku main
\`\`\`

## 🚀 Déploiement sur Railway

\`\`\`bash
# 1. Va sur railway.app
# 2. Connecte ton repo GitHub
# 3. Railway auto-détecte et déploie!
