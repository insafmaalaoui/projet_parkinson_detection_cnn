import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
# Charge les variables d'environnement
load_dotenv()

# Récupère la clé depuis la variable d'environnement
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# Chemin de la base de données
# The database lives in the project's `backend` folder (sibling of `chatbot`)
BASE_DIR = Path(__file__).parent
REPO_ROOT = BASE_DIR.parent
DB_PATH = str(REPO_ROOT / "backend" / "medidiagnose.db")

# Configuration du chunking
CHUNK_SIZE = 500
OVERLAP = 50

# Modèles
EMBEDDING_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'
GROQ_MODEL = "llama-3.3-70b-versatile"

# Nom de la table
TABLE_NAME = "info_patients"

# Vérification
if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY non trouvée dans .env")

if not os.path.exists(DB_PATH):
    print(f"⚠️ ATTENTION: Base de données introuvable à: {DB_PATH}")
else:
    print(f"✅ Configuration OK")
    print(f"📂 Base: {DB_PATH}")