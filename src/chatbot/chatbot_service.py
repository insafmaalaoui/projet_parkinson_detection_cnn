"""
Service Chatbot pour MediDiagnose - Analyse des patients Parkinson
Avec RAG (Retrieval Augmented Generation) et Chunking
"""

import sqlite3
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from groq import Groq
from sqlalchemy.orm import Session
from models import MedicalCase
# Robust import for config: prefer package import `chatbot.config`, fallback to top-level `config`.
try:
    from chatbot.config import *  # type: ignore
except Exception:
    try:
        from config import *  # type: ignore
    except Exception as e:
        # If config cannot be imported, raise clear error to help debugging.
        raise ImportError(f"Unable to import chatbot config (tried chatbot.config and config): {e}")
import time
from datetime import datetime
import unicodedata

# Initialisation
groq_client = Groq(api_key=GROQ_API_KEY)
embedding_model = SentenceTransformer(EMBEDDING_MODEL)

# Variables globales
faiss_index = None
chunks_data = []
last_patient_count = 0

# ==================== CHUNKING ====================

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    """Divise un texte en chunks avec chevauchement"""
    if not text or len(text) == 0:
        return []
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        
        if end < text_length:
            last_space = chunk.rfind(' ')
            if last_space > overlap:
                end = start + last_space
                chunk = text[start:end]
        
        chunks.append(chunk.strip())
        start = end - overlap
    
    return chunks

def create_patient_chunks(patient):
    """Crée des chunks structurés pour un patient - CECI EST LE CHUNKING !"""
    chunks = []
    
    # Récupération nom/prénom depuis users
    try:
        user_info = get_patient_user_info(patient_id=patient.get('id'))
        if user_info:
            if user_info.get('first_name'):
                patient['first_name'] = user_info.get('first_name')
            if user_info.get('last_name'):
                patient['last_name'] = user_info.get('last_name')
    except Exception:
        pass

    patient_name = f"{patient.get('first_name', 'N/A')} {patient.get('last_name', 'N/A')}"
    patient_id = patient.get('id', 'N/A')
    
    # CHUNK 1: Informations personnelles
    info_perso = f"""
Patient ID: {patient_id}
Nom complet: {patient_name}
Âge: {patient.get('age', 'N/A')} ans
Genre: {patient.get('gender', 'N/A')}
Date de naissance: {patient.get('date_of_birth', 'N/A')}
Téléphone: {patient.get('phone', 'N/A')}
Adresse: {patient.get('address', 'N/A')}
Contact d'urgence: {patient.get('emergency_contact', 'N/A')}
User ID: {patient.get('user_id', 'N/A')}
Date d'enregistrement: {patient.get('created_at', 'N/A')}
Dernière mise à jour: {patient.get('updated_at', 'N/A')}
    """
    chunks.append({
        'type': 'info_personnelle',
        'content': info_perso.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    # CHUNK 2: Données physiques
    donnees_physiques = f"""
Patient: {patient_name} (ID: {patient_id})
=== DONNÉES PHYSIQUES ===
Taille: {patient.get('height_cm', 'N/A')} cm
Poids: {patient.get('weight_kg', 'N/A')} kg
IMC: {round(patient.get('weight_kg', 0) / ((patient.get('height_cm', 1) / 100) ** 2), 2) if patient.get('weight_kg') and patient.get('height_cm') else 'N/A'}

=== HISTORIQUE MÉDICAL ===
{patient.get('medical_history', 'Aucun historique enregistré')}

=== AUTRES MALADIES ===
Présence d'autres maladies: {'Oui' if patient.get('autres_maladies') else 'Non'}
Détails: {patient.get('details_autres_maladies', 'Aucune autre maladie')}
    """
    chunks.append({
        'type': 'donnees_physiques',
        'content': donnees_physiques.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    # CHUNK 3: Symptômes moteurs
    symptomes_moteurs_present = []
    symptomes_moteurs_absent = []
    
    symptomes_moteurs_map = {
        'tremblements': 'Tremblements au repos',
        'rigidite': 'Rigidité musculculaire',
        'bradykinesie': 'Bradykinésie (lenteur des mouvements)',
        'difficulte_marche': 'Difficulté à la marche',
        'instabilite': 'Instabilité posturale',
        'expression_faciale_reduite': 'Hypomimie (expression faciale réduite)',
        'micrographie': 'Micrographie (écriture petite)'
    }
    
    for key, label in symptomes_moteurs_map.items():
        if patient.get(key):
            symptomes_moteurs_present.append(f"✓ {label}")
        else:
            symptomes_moteurs_absent.append(f"✗ {label}")
    
    symptomes_moteurs = f"""
Patient: {patient_name} (ID: {patient_id})
=== SYMPTÔMES MOTEURS ===

SYMPTÔMES PRÉSENTS ({len(symptomes_moteurs_present)}):
{chr(10).join(symptomes_moteurs_present) if symptomes_moteurs_present else "Aucun symptôme moteur détecté"}

SYMPTÔMES ABSENTS ({len(symptomes_moteurs_absent)}):
{chr(10).join(symptomes_moteurs_absent) if symptomes_moteurs_absent else "Tous les symptômes sont présents"}

Gravité motrice: {len(symptomes_moteurs_present)}/7 symptômes présents
    """
    chunks.append({
        'type': 'symptomes_moteurs',
        'content': symptomes_moteurs.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    # CHUNK 4: Symptômes non-moteurs
    symptomes_non_moteurs_present = []
    symptomes_non_moteurs_absent = []
    
    symptomes_non_moteurs_map = {
        'fatigue': 'Fatigue chronique',
        'troubles_sommeil': 'Troubles du sommeil',
        'troubles_cognitifs': 'Troubles cognitifs',
        'depression_anxiete': 'Dépression et/ou anxiété',
        'perte_odorat': 'Hyposmie (perte d\'odorat)',
        'constipation': 'Constipation',
        'problemes_urinaires': 'Problèmes urinaires',
        'douleurs': 'Douleurs'
    }
    
    for key, label in symptomes_non_moteurs_map.items():
        if patient.get(key):
            symptomes_non_moteurs_present.append(f"✓ {label}")
        else:
            symptomes_non_moteurs_absent.append(f"✗ {label}")
    
    symptomes_non_moteurs = f"""
Patient: {patient_name} (ID: {patient_id})
=== SYMPTÔMES NON-MOTEURS ===

SYMPTÔMES PRÉSENTS ({len(symptomes_non_moteurs_present)}):
{chr(10).join(symptomes_non_moteurs_present) if symptomes_non_moteurs_present else "Aucun symptôme non-moteur détecté"}

SYMPTÔMES ABSENTS ({len(symptomes_non_moteurs_absent)}):
{chr(10).join(symptomes_non_moteurs_absent) if symptomes_non_moteurs_absent else "Tous les symptômes sont présents"}

Impact non-moteur: {len(symptomes_non_moteurs_present)}/8 symptômes présents
    """
    chunks.append({
        'type': 'symptomes_non_moteurs',
        'content': symptomes_non_moteurs.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    # CHUNK 5: Observations médicales
    if patient.get('observations'):
        obs_chunks = chunk_text(patient.get('observations'), CHUNK_SIZE, OVERLAP)
        for i, obs_chunk in enumerate(obs_chunks):
            chunks.append({
                'type': f'observations_part_{i+1}',
                'content': f"""
Patient: {patient_name} (ID: {patient_id})
=== OBSERVATIONS MÉDICALES (Partie {i+1}/{len(obs_chunks)}) ===
{obs_chunk}
                """.strip(),
                'patient_id': patient_id,
                'patient_name': patient_name
            })
    
    # CHUNK 6: Synthèse globale
    total_symptomes = len(symptomes_moteurs_present) + len(symptomes_non_moteurs_present)
    
    synthese = f"""
Patient: {patient_name} (ID: {patient_id})
=== SYNTHÈSE CLINIQUE GLOBALE ===

Profil: {patient.get('gender', 'N/A')}, {patient.get('age', 'N/A')} ans
État général: {total_symptomes}/15 symptômes de Parkinson détectés

Répartition:
- Symptômes moteurs: {len(symptomes_moteurs_present)}/7
- Symptômes non-moteurs: {len(symptomes_non_moteurs_present)}/8

Indicateurs d'alerte:
- Troubles moteurs sévères: {'OUI ⚠️' if len(symptomes_moteurs_present) >= 4 else 'Non'}
- Impact psychologique: {'OUI ⚠️' if patient.get('depression_anxiete') else 'Non'}
- Risque de chute: {'OUI ⚠️' if patient.get('instabilite') or patient.get('difficulte_marche') else 'Non'}

Dernière évaluation: {patient.get('updated_at', 'N/A')}
    """
    chunks.append({
        'type': 'synthese_globale',
        'content': synthese.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })

    # CHUNK 7: Résultat CNN + recommandations
    try:
        cnn_result = get_cnn_prediction(patient_id)
    except Exception:
        cnn_result = "Aucune analyse CNN disponible"

    is_malade = "Malade" in cnn_result

    recommandations = """
🟢 L'analyse CNN ne montre pas de signes de maladie de Parkinson.
Recommandations générales :
• Activité physique régulière (prévention)
• Surveillance annuelle neurologique si symptômes évoluent
• Hygiène de sommeil
• Réduction du stress et anxiété
"""
    if is_malade:
        recommandations = """
⚕️ Recommandations pour un patient atteint de Parkinson :
• Suivi régulier en neurologie (chaque 3 à 6 mois)
• Kinésithérapie pour la mobilité et l’équilibre
• Activité physique adaptée : marche, tai-chi, stretching
• Suivi psychologique si anxiété/dépression
• Nutrition : hydratation + fibres
• Adapter l’environnement pour éviter les chutes
"""

    cnn_chunk = f"""
Patient: {patient_name} (ID: {patient_id})
=== ANALYSE IA : CNN Parkinson ===

Résultat IA : {cnn_result}

Risque clinique basé sur les symptômes :
- Symptômes moteurs: {len(symptomes_moteurs_present)}/7
- Symptômes non-moteurs: {len(symptomes_non_moteurs_present)}/8

Conclusion: {"⚠️ Suspicion élevée de Parkinson" if is_malade else "Pas de signes évidents de Parkinson"}

{recommandations}
"""
    chunks.append({
        'type': 'analyse_cnn',
        'content': cnn_chunk.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })

    return chunks

# ==================== BASE DE DONNÉES ====================

def get_db_connection():
    """Connexion à SQLite"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"❌ Erreur connexion BD: {e}")
        return None

def load_all_patients():
    """Charge tous les patients"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {TABLE_NAME} ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        patients = [dict(row) for row in rows]
        # Ensure an 'age' key is present for each patient by computing from date_of_birth if needed
        for p in patients:
            if p.get('age') is None:
                dob = p.get('date_of_birth') or p.get('dob')
                computed = compute_age_from_dob(dob)
                p['age'] = computed
        return patients
    except Exception as e:
        print(f"❌ Erreur chargement patients: {e}")
        return []

def get_latest_patient():
    """Récupère le dernier patient ajouté"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {TABLE_NAME} ORDER BY created_at DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"❌ Erreur récupération dernier patient: {e}")
        return None

def get_patient_stats():
    """Récupère des statistiques"""
    conn = get_db_connection()
    if not conn:
        return {}
    
    try:
        cursor = conn.cursor()
        stats = {}
        
        cursor.execute(f"SELECT COUNT(*) as total FROM {TABLE_NAME}")
        stats['total_patients'] = cursor.fetchone()['total']
        
        cursor.execute(f"SELECT COUNT(*) as count FROM {TABLE_NAME} WHERE tremblements = 1")
        stats['avec_tremblements'] = cursor.fetchone()['count']
        
        cursor.execute(f"SELECT COUNT(*) as count FROM {TABLE_NAME} WHERE rigidite = 1")
        stats['avec_rigidite'] = cursor.fetchone()['count']
        
        cursor.execute(f"SELECT COUNT(*) as count FROM {TABLE_NAME} WHERE depression_anxiete = 1")
        stats['avec_depression'] = cursor.fetchone()['count']
        
        cursor.execute(f"SELECT AVG(age) as avg_age FROM {TABLE_NAME} WHERE age IS NOT NULL")
        result = cursor.fetchone()
        stats['age_moyen'] = round(result['avg_age'], 1) if result['avg_age'] else 0
        
        conn.close()
        return stats
    except Exception as e:
        print(f"❌ Erreur stats: {e}")
        return {}


def compute_age_from_dob(dob_str):
    """Calcule l'âge en années à partir d'une date de naissance (str)."""
    if not dob_str:
        return None
    # Accept several input types: datetime, numeric timestamp, or strings in common formats/ISO
    if isinstance(dob_str, (int, float)):
        try:
            dob = datetime.fromtimestamp(int(dob_str))
            today = datetime.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return age
        except Exception:
            return None

    if isinstance(dob_str, datetime):
        dob = dob_str
        today = datetime.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age

    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S"
    ]
    s = str(dob_str).strip()
    # Try ISO formats (with T and timezone), by normalizing to a simple ISO without timezone
    try:
        # remove timezone suffixes like +00:00 or Z
        s_iso = s.replace('T', ' ')
        if '+' in s_iso:
            s_iso = s_iso.split('+')[0]
        if 'Z' in s_iso:
            s_iso = s_iso.replace('Z', '')
        dob = datetime.fromisoformat(s_iso)
        today = datetime.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except Exception:
        pass

    for fmt in formats:
        try:
            dob = datetime.strptime(s, fmt)
            today = datetime.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return age
        except Exception:
            continue

    # As a last resort, if the string contains only a year
    try:
        if len(s) == 4 and s.isdigit():
            year = int(s)
            today = datetime.today()
            return today.year - year
    except Exception:
        pass

    return None


def normalize_text(s: str) -> str:
    """Retourne une version en minuscules sans accents pour détection de mots-clés."""
    if not s:
        return ""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return s.lower()


def get_patient_user_info(patient_id=None, user_id=None):
    """Récupère les informations utilisateur liées au patient via une jointure entre
    `info_patients` et `users`. Si `patient_id` n'est pas fourni, prend le dernier patient.
    Retourne dict avec keys: first_name, last_name, date_of_birth, age, patient_id, user_id
    """
    conn = get_db_connection()
    if not conn:
        return None

    try:
        cursor = conn.cursor()

        # If no patient_id provided, fetch the latest patient WITH joined user fields
        if patient_id is None and user_id is None:
            query = f"SELECT ip.*, u.first_name AS user_first_name, u.last_name AS user_last_name, ip.date_of_birth AS date_of_birth, u.id AS user_id FROM {TABLE_NAME} ip LEFT JOIN users u ON ip.user_id = u.id ORDER BY ip.created_at DESC LIMIT 1"
            cursor.execute(query)
        else:
            if patient_id:
                query = f"SELECT ip.*, u.first_name AS user_first_name, u.last_name AS user_last_name, ip.date_of_birth AS date_of_birth, u.id AS user_id FROM {TABLE_NAME} ip LEFT JOIN users u ON ip.user_id = u.id WHERE ip.id = ? LIMIT 1"
                cursor.execute(query, (patient_id,))
            else:
                query = f"SELECT ip.*, u.first_name AS user_first_name, u.last_name AS user_last_name, ip.date_of_birth AS date_of_birth, u.id AS user_id FROM {TABLE_NAME} ip LEFT JOIN users u ON ip.user_id = u.id WHERE u.id = ? LIMIT 1"
                cursor.execute(query, (user_id,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        data = dict(row)
        dob = data.get('date_of_birth') or data.get('dob')
        age = compute_age_from_dob(dob)

        # Prefer names from users (aliased as user_first_name/user_last_name),
        # fallback to info_patients first_name/last_name if users values are null/empty
        u_first = data.get('user_first_name')
        u_last = data.get('user_last_name')
        ip_first = data.get('first_name')
        ip_last = data.get('last_name')

        first_name = u_first if u_first else ip_first
        last_name = u_last if u_last else ip_last

        return {
            'patient_id': data.get('id'),
            'user_id': data.get('user_id'),
            'first_name': first_name,
            'last_name': last_name,
            'date_of_birth': dob,
            'age': age
        }
    except Exception as e:
        print(f"❌ Erreur get_patient_user_info: {e}")
        return None

# ==================== INDEX FAISS (RAG) ====================

def build_faiss_index():
    """Construit l'index FAISS avec embeddings - CECI EST LE RAG !"""
    global faiss_index, chunks_data
    
    print("🔄 Construction de l'index FAISS...")
    patients = load_all_patients()
    
    if not patients:
        print("⚠️  Aucun patient dans la base de données")
        return None
    
    chunks_data = []
    
    # CHUNKING: Créer tous les chunks
    print("📦 Chunking des données patients...")
    for patient in patients:
        patient_chunks = create_patient_chunks(patient)
        chunks_data.extend(patient_chunks)
    
    print(f"✅ {len(chunks_data)} chunks créés pour {len(patients)} patients")
    
    # EMBEDDINGS: Générer les vecteurs
    print("🧠 Génération des embeddings (vecteurs)...")
    texts = [chunk['content'] for chunk in chunks_data]
    embeddings = embedding_model.encode(texts, show_progress_bar=True)
    embeddings = np.array(embeddings).astype('float32')
    
    # INDEX FAISS: Créer l'index pour la recherche rapide
    print("🔍 Création de l'index FAISS...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    faiss_index = index
    print(f"✅ Index FAISS prêt avec {len(chunks_data)} chunks\n")
    return index

def search_relevant_chunks(query, top_k=5):
    """Recherche sémantique - CECI EST LE RETRIEVAL du RAG !"""
    global faiss_index, chunks_data
    
    if faiss_index is None or not chunks_data:
        print("⚠️  Index FAISS non initialisé")
        return []
    
    # Encoder la requête
    query_embedding = embedding_model.encode([query])
    query_embedding = np.array(query_embedding).astype('float32')
    
    # Recherche avec FAISS
    k = min(top_k, len(chunks_data))
    distances, indices = faiss_index.search(query_embedding, k)
    
    # Retourner les chunks pertinents
    relevant_chunks = []
    for idx in indices[0]:
        if idx < len(chunks_data):
            relevant_chunks.append(chunks_data[idx])
    
    return relevant_chunks

# ==================== GÉNÉRATION DE RÉPONSES (RAG) ====================

def generate_chatbot_response(query, context_chunks):
    """Génère une réponse - CECI EST LA GENERATION du RAG !"""
    # AUGMENTATION: Enrichir avec le contexte
    context = "\n\n---\n\n".join([chunk['content'] for chunk in context_chunks])
    
    system_prompt = """Tu es un assistant médical spécialisé dans l'analyse de la maladie de Parkinson.
Tu travailles avec des neurologues pour analyser les dossiers patients.

RÈGLES:
1. Base-toi UNIQUEMENT sur les données fournies
2. Si une info n'est pas disponible, dis-le clairement
3. Sois précis et professionnel
4. Réponds en français"""
    
    user_prompt = f"""Contexte médical:

{context}

Question: {query}

Réponds de manière claire et structurée."""
    
    try:
        # GENERATION: Appel au LLM (Groq)
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"❌ Erreur Groq API: {str(e)}"

# ==================== NOTIFICATION AUTOMATIQUE ====================

def analyze_new_patient(patient):
    """Analyse automatique d'un nouveau patient"""
    chunks = create_patient_chunks(patient)
    context = "\n\n".join([chunk['content'] for chunk in chunks])
    
    prompt = f"""Analyse ce nouveau patient Parkinson:

{context}

Structure:
1. 👤 PROFIL
2. 🔴 SYMPTÔMES PRINCIPAUX
3. ⚠️ POINTS D'ATTENTION
4. 💊 RECOMMANDATIONS

Sois concis et professionnel."""
    
    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Tu es un système d'analyse médicale."},
                {"role": "user", "content": prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"❌ Erreur: {str(e)}"

def notify_neurologist(patient, analysis):
    """Notifie le neurologue"""
    patient_name = f"{patient.get('first_name', '')} {patient.get('last_name', '')}"
    
    notification = f"""
╔══════════════════════════════════════════════════════════════╗
║          🆕 NOUVEAU PATIENT DÉTECTÉ - PARKINSON             ║
╚══════════════════════════════════════════════════════════════╝

👤 Patient: {patient_name}
🆔 ID: {patient.get('id')}
📅 Enregistré: {patient.get('created_at')}
📞 Téléphone: {patient.get('phone')}

{analysis}

══════════════════════════════════════════════════════════════
✅ L'index FAISS a été mis à jour automatiquement.
    """
    
    print(notification)
    return notification

def monitor_new_patients_once():
    """Vérifie s'il y a de nouveaux patients"""
    global last_patient_count
    
    try:
        conn = get_db_connection()
        if not conn:
            return False
        
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) as count FROM {TABLE_NAME}")
        current_count = cursor.fetchone()['count']
        conn.close()
        
        if current_count > last_patient_count:
            new_count = current_count - last_patient_count
            print(f"\n🚨 {new_count} nouveau(x) patient(s) détecté(s)!\n")
            
            latest_patient = get_latest_patient()
            
            if latest_patient:
                print("🔍 Analyse en cours...")
                analysis = analyze_new_patient(latest_patient)
                notify_neurologist(latest_patient, analysis)
                build_faiss_index()
            
            last_patient_count = current_count
            return True
            
        return False
        
    except Exception as e:
        print(f"❌ Erreur monitoring: {e}")
        return False

# ==================== INTERFACE CHATBOT ====================

def display_stats():
    """Affiche les statistiques"""
    stats = get_patient_stats()
    print("\n📊 STATISTIQUES:")
    print(f"   Total: {stats.get('total_patients', 0)} patients")
    print(f"   Avec tremblements: {stats.get('avec_tremblements', 0)}")
    print(f"   Avec rigidité: {stats.get('avec_rigidite', 0)}")
    print(f"   Avec dépression/anxiété: {stats.get('avec_depression', 0)}")
    print(f"   Âge moyen: {stats.get('age_moyen', 0)} ans\n")

def start_chatbot():
    """Lance le chatbot"""
    global last_patient_count
    
    print("\n" + "="*70)
    print("🤖 CHATBOT PARKINSON - AVEC RAG ET CHUNKING")
    print("="*70 + "\n")
    
    print("📊 Chargement...")
    patients = load_all_patients()
    last_patient_count = len(patients)
    
    if last_patient_count == 0:
        print("⚠️  Aucun patient trouvé")
        print(f"Vérifiez: {DB_PATH}\n")
        return
    
    print(f"✅ {last_patient_count} patients chargés\n")
    display_stats()
    
    # Construire l'index FAISS (RAG)
    build_faiss_index()
    
    print("✅ Chatbot prêt!\n")
    print("💡 COMMANDES:")
    print("   - Posez vos questions")
    print("   - 'check' = vérifier nouveaux patients")
    print("   - 'stats' = voir statistiques")
    print("   - 'quit' = quitter\n")
    print("-"*70 + "\n")
    
    # Boucle interactive
    while True:
        try:
            query = input("🩺 Neurologue: ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("\n👋 Au revoir!\n")
                break
            
            if query.lower() == 'check':
                monitor_new_patients_once()
                continue
            
            if query.lower() == 'stats':
                display_stats()
                continue
            
            if not query:
                continue

            # Si le neurologue demande le nom ou l'âge, répondre directement depuis la BD
            q_norm = normalize_text(query)
            if any(k in q_norm for k in ['nom', 'prenom', "comment s appelle", 'quel est son nom', "s appelle", 'nom du patient']) or any(k in q_norm for k in ['age', 'quel age', 'quel est son age']):
                info = get_patient_user_info()
                if not info:
                    print("❌ Aucune information patient/utilisateur trouvée dans la base.\n")
                    continue

                # Si demande d'âge
                if any(k in q_norm for k in ['age', 'quel age', 'quel est son age']):
                    if info.get('age') is not None:
                        print(f"\n🤖 Assistant: Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')} et a {info.get('age')} ans.\n")
                    else:
                        dob = info.get('date_of_birth')
                        if dob:
                            print(f"\n🤖 Assistant: Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')}. La date de naissance est {dob}, mais je n'ai pas pu calculer l'âge.\n")
                        else:
                            print(f"\n🤖 Assistant: Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')}. La date de naissance n'est pas disponible.\n")

                # Si demande de nom/prénom
                elif any(k in q_norm for k in ['nom', 'prenom', "comment s appelle", 'quel est son nom', "s appelle", 'nom du patient']):
                    print(f"\n🤖 Assistant: Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')}.\n")

                print("-"*70 + "\n")
                continue

            # RAG: Recherche + Génération
            relevant_chunks = search_relevant_chunks(query, top_k=5)
            
            if not relevant_chunks:
                print("❌ Aucune donnée trouvée.\n")
                continue
            
            print("\n🤖 Assistant: ", end="", flush=True)
            response = generate_chatbot_response(query, relevant_chunks)
            print(f"{response}\n")
            print("-"*70 + "\n")
            
        except KeyboardInterrupt:
            print("\n\n👋 Arrêt...\n")
            break
        except Exception as e:
            print(f"\n❌ Erreur: {e}\n")

if __name__ == "__main__":
    start_chatbot()
    
def get_cnn_prediction(session: Session, patient_id: str):
    case = (
        session.query(MedicalCase)
        .filter(MedicalCase.patient_id == patient_id)
        .order_by(MedicalCase.created_at.desc())
        .first()
    )
    if not case:
        return "Aucune analyse CNN disponible"

    # Déterminer le statut
    if case.cnn_prediction:
        status = case.cnn_prediction
    elif case.cnn_prediction_num is not None:
        status = "Malade" if case.cnn_prediction_num >= 0.5 else "Sain"
    else:
        status = "Analyse inconnue"

    # Ajouter confiance si disponible
    confidence = case.cnn_confidence
    if confidence is not None:
        return f"{status} (confiance: {confidence:.2f})"
    return status