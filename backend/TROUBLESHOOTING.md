# 🔧 Dépannage - MediDiagnose

## ❌ "ModuleNotFoundError"

**Cause:** Un module n'est pas installé

**Solution:**
\`\`\`bash
# Réinstalle tout
pip install -r requirements.txt --force-reinstall
\`\`\`

---

## ❌ "Port 8000 already in use"

**Cause:** Le port 8000 est utilisé par un autre processus

**Solution:**

**Windows (PowerShell):**
\`\`\`powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
\`\`\`

**Mac/Linux:**
\`\`\`bash
lsof -ti:8000 | xargs kill -9
\`\`\`

**Alternative:** Change le port dans `main.py`:
\`\`\`python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Port 8001 au lieu de 8000
\`\`\`

---

## ❌ "database is locked"

**Cause:** La base de données est verrouillée

**Solution:**
\`\`\`bash
# Supprime la vieille base
rm medidiagnose.db              # Mac/Linux
del medidiagnose.db             # Windows

# Recréé-la
python init_db.py
\`\`\`

---

## ❌ "CORS errors" dans le Frontend

**Cause:** Le frontend React ne peut pas atteindre le backend

**Solution:** Vérifie que le backend tourne sur `http://localhost:8000`

**Frontend .env:**
\`\`\`env
REACT_APP_API_URL=http://localhost:8000
\`\`\`

**Backend main.py:**
\`\`\`python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
\`\`\`

---

## ❌ "Token expired"

**Cause:** Le JWT token a expiré (24h par défaut)

**Solution:** Dois te reconnecter pour obtenir un nouveau token

**Pour augmenter la durée (auth.py):**
\`\`\`python
ACCESS_TOKEN_EXPIRE_MINUTES = 7200  # 5 jours au lieu de 24h
\`\`\`

---

## ❌ "Invalid credentials"

**Cause:** Email ou mot de passe incorrect

**Solution:** Utilise les comptes de test:
- `admin@medidiagnose.com` / `admin123`
- `dr.smith@medidiagnose.com` / `neuro123`
- `patient@medidiagnose.com` / `patient123`

---

## ❌ "Cannot find module 'python-jose'"

**Cause:** Dépendance manquante

**Solution:**
\`\`\`bash
pip install python-jose bcrypt passlib
pip install -r requirements.txt
\`\`\`

---

## ❌ "Connection refused: localhost:8000"

**Cause:** Le backend n'est pas lancé

**Solution:**
1. Vérifie que le backend tourne: `python main.py`
2. Attends 2-3 secondes après le lancement
3. Puis accède à http://localhost:8000

---

## ❌ "ValueError: unsupported pickle protocol"

**Cause:** Python version incompatible

**Solution:** Utilise Python 3.10+ (3.11 recommandé)
\`\`\`bash
python --version
\`\`\`

---

## 📊 Vérifier l'état du serveur

\`\`\`bash
# Via curl
curl http://localhost:8000/health

# Doit retourner:
# {"status":"ok"}
\`\`\`

---

## 🧹 Nettoyer tout

Si tu veux recommencer de zéro:

\`\`\`bash
# Windows
del medidiagnose.db
rmdir /s venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
python main.py

# Mac/Linux
rm medidiagnose.db
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 init_db.py
python3 main.py
\`\`\`

---

## 📞 Besoin d'aide?

1. Lis le SETUP_GUIDE.md
2. Lis ce fichier (TROUBLESHOOTING.md)
3. Vérifie les logs du serveur (erreurs affichées dans le terminal)
4. Essaie avec les comptes de test fournis
