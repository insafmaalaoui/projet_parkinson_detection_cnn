"""
Backend Flask pour le Chatbot Parkinson avec RAG
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from groq import Groq
from config import *
import time
from datetime import datetime
import unicodedata
import json
import unicodedata

app = Flask(__name__)
CORS(app)

# Initialisation
groq_client = Groq(api_key=GROQ_API_KEY)
embedding_model = SentenceTransformer(EMBEDDING_MODEL)

# Variables globales
faiss_index = None
chunks_data = []
last_patient_count = 0

# ==================== FONCTIONS DU CHATBOT (Copier depuis votre code) ====================

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
    """Crée des chunks structurés pour un patient"""
    chunks = []
    # Prefer names stored in users table (via jointure). If available, inject them
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
    
    # Chunk 1: Informations personnelles
    info_perso = f"""
Patient ID: {patient_id}
Nom complet: {patient_name}
Âge: {patient.get('age', 'N/A')} ans
Genre: {patient.get('gender', 'N/A')}
Date de naissance: {patient.get('date_of_birth', 'N/A')}
Téléphone: {patient.get('phone', 'N/A')}
Adresse: {patient.get('address', 'N/A')}
Contact d'urgence: {patient.get('emergency_contact', 'N/A')}
    """
    chunks.append({
        'type': 'info_personnelle',
        'content': info_perso.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    # Chunk 2: Données physiques
    donnees_physiques = f"""
Patient: {patient_name} (ID: {patient_id})
=== DONNÉES PHYSIQUES ===
Taille: {patient.get('height_cm', 'N/A')} cm
Poids: {patient.get('weight_kg', 'N/A')} kg
IMC: {round(patient.get('weight_kg', 0) / ((patient.get('height_cm', 1) / 100) ** 2), 2) if patient.get('weight_kg') and patient.get('height_cm') else 'N/A'}

=== HISTORIQUE MÉDICAL ===
{patient.get('medical_history', 'Aucun historique enregistré')}
    """
    chunks.append({
        'type': 'donnees_physiques',
        'content': donnees_physiques.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    # Chunk 3: Symptômes moteurs
    symptomes_moteurs_present = []
    symptomes_moteurs_map = {
        'tremblements': 'Tremblements au repos',
        'rigidite': 'Rigidité musculaire',
        'bradykinesie': 'Bradykinésie',
        'difficulte_marche': 'Difficulté à la marche',
        'instabilite': 'Instabilité posturale',
        'expression_faciale_reduite': 'Hypomimie',
        'micrographie': 'Micrographie'
    }
    
    for key, label in symptomes_moteurs_map.items():
        if patient.get(key):
            symptomes_moteurs_present.append(f"✓ {label}")
    
    symptomes_moteurs = f"""
Patient: {patient_name} (ID: {patient_id})
=== SYMPTÔMES MOTEURS ===
{chr(10).join(symptomes_moteurs_present) if symptomes_moteurs_present else "Aucun symptôme moteur"}
Gravité: {len(symptomes_moteurs_present)}/7 symptômes
    """
    chunks.append({
        'type': 'symptomes_moteurs',
        'content': symptomes_moteurs.strip(),
        'patient_id': patient_id,
        'patient_name': patient_name
    })
    
    return chunks

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
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"❌ Erreur chargement patients: {e}")
        return []

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
    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            dob = datetime.strptime(dob_str, fmt)
            today = datetime.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return age
        except Exception:
            continue
    return None


def normalize_text(s: str) -> str:
    """Retourne une version en minuscules sans accents pour détection de mots-clés."""
    if not s:
        return ""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return s.lower()


# Mapping de mots-clés (normalisés) vers clés du formulaire
FIELD_MAP = {
    "resume clinique": "clinical_summary",
    "résumé clinique": "clinical_summary",
    "resume": "clinical_summary",
    "résumé": "clinical_summary",
    "examen clinique": "exam_findings",
    "constatations": "exam_findings",
    "updrs": "updrs_score",
    "score updrs": "updrs_score",
    "conclusion": "diagnosis",
    "diagnostic": "diagnosis",
    "recommandations": "recommendations",
    "recommendations": "recommendations",
    "examens complementaires": "complementary_exams",
    "examens complémentaires": "complementary_exams",
    "plan de suivi": "follow_up_plan",
    "suivi": "follow_up_plan",
    "notes complementaires": "additional_notes",
    "notes complémentaires": "additional_notes",
    "rapport complet": "free_text_report",
    "rapport": "free_text_report"
}


def get_case_by_id(case_id: str):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {TABLE_NAME} WHERE id = ?", (case_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"❌ Erreur get_case_by_id: {e}")
        return None


def call_llm_generate_field(case_context: dict, field_key: str):
    """Fallback: demander au LLM de générer uniquement la valeur pour un champ donné.
    Retourne une chaîne (valeur) ou 'non disponible'."""
    try:
        system_prompt = "Tu es un assistant médical. Réponds uniquement par la valeur demandée en français, sans balises ni explications. Si l'information manque, réponds 'non disponible'."
        user_prompt = f"Contexte patient (JSON): {json.dumps(case_context)}\n\nDonne uniquement la valeur pour le champ: {field_key}"
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.2,
            max_tokens=300
        )
        text = response.choices[0].message.content.strip()
        # some models may return JSON; try to extract plain text
        # if looks like JSON, try parse
        try:
            parsed = json.loads(text)
            # if parsed is dict and contains our key, return it
            if isinstance(parsed, dict) and field_key in parsed:
                return str(parsed[field_key])
            # otherwise return first string value
            if isinstance(parsed, str):
                return parsed
        except Exception:
            pass
        return text
    except Exception as e:
        print(f"❌ Erreur LLM field generation: {e}")
        return "non disponible"



def get_patient_user_info(patient_id=None, user_id=None):
    """Récupère les informations utilisateur liées au patient via une jointure entre
    `info_patients` et `users`. Si `patient_id` n'est pas fourni, prend le dernier patient.
    Retourne dict: first_name, last_name, date_of_birth, age, patient_id, user_id
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

def build_faiss_index():
    """Construit l'index FAISS"""
    global faiss_index, chunks_data
    
    patients = load_all_patients()
    if not patients:
        return None
    
    chunks_data = []
    for patient in patients:
        patient_chunks = create_patient_chunks(patient)
        chunks_data.extend(patient_chunks)
    
    texts = [chunk['content'] for chunk in chunks_data]
    embeddings = embedding_model.encode(texts, show_progress_bar=False)
    embeddings = np.array(embeddings).astype('float32')
    
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    faiss_index = index
    return index

def search_relevant_chunks(query, top_k=5):
    """Recherche sémantique"""
    global faiss_index, chunks_data
    
    if faiss_index is None or not chunks_data:
        return []
    
    query_embedding = embedding_model.encode([query])
    query_embedding = np.array(query_embedding).astype('float32')
    
    k = min(top_k, len(chunks_data))
    distances, indices = faiss_index.search(query_embedding, k)
    
    relevant_chunks = []
    for idx in indices[0]:
        if idx < len(chunks_data):
            relevant_chunks.append(chunks_data[idx])
    
    return relevant_chunks

def generate_chatbot_response(query, context_chunks):
    """Génère une réponse en tenant compte du contexte médical et des prédictions CNN"""
    
    context = "\n\n---\n\n".join([chunk['content'] for chunk in context_chunks])

    system_prompt = """
Tu es un assistant médical spécialisé dans l'analyse de la maladie de Parkinson.
Tu travailles avec des neurologues pour analyser les dossiers patients.

RÈGLES GÉNÉRALES:
1️⃣ Base-toi UNIQUEMENT sur les données fournies dans le contexte
2️⃣ Si une info n’est pas présente, dis que tu ne peux pas la confirmer
3️⃣ Réponds comme un assistant médical professionnel et empathique
4️⃣ Toujours répondre en français

UTILISATION DES PRÉDICTIONS CNN SI DISPONIBLES:
- Le champ `cnn_prediction` ou `cnn_prediction_num` indique l’état prédit:
    ➤ `Malade` ou `1` = suspicion de Parkinson
    ➤ `Sain` ou `0` = pas d’indication forte de Parkinson
- Le champ `cnn_confidence` donne un niveau de confiance
- Si la prédiction est disponible, l’intégrer dans l’analyse
- Utiliser les recommandations adaptées:
    ➤ Si suspicion de Parkinson → hygiène de vie, suivi neurologique, exercices…
    ➤ Si sain → prévention, conseils généraux
"""

    user_prompt = f"""
📌 CONTEXTE MÉDICAL DISPONIBLE:

{context}

❓ QUESTION:
{query}

Réponds de manière claire, structurée et utile au clinicien.
"""

    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.2,
            max_tokens=1500
        )
        return response.choices[0].message.content

    except Exception as e:
        return f"❌ Erreur Groq API: {str(e)}"
# ==================== ROUTES FLASK ====================

@app.route('/')
def index():
    """Page d'accueil"""
    return render_template('index.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retourne les statistiques"""
    stats = get_patient_stats()
    return jsonify(stats)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Endpoint pour le chatbot"""
    data = request.json
    query = data.get('query', '')
    patient_id = data.get('patient_id')
    
    if not query:
        return jsonify({'error': 'Query manquante'}), 400

    # Si la requête demande le nom/prénom/âge, répondre directement via jointure
    q_norm = normalize_text(query)
    if any(k in q_norm for k in ['nom', 'prenom', "comment s appelle", 'quel est son nom', "s appelle", 'nom du patient']) or any(k in q_norm for k in ['age', 'quel age', 'quel est son age']):
        info = get_patient_user_info(patient_id=patient_id)
        if not info:
            return jsonify({'response': "Aucune information patient/utilisateur trouvée dans la base."})

        if any(k in q_norm for k in ['age', 'quel age', 'quel est son age']):
            if info.get('age') is not None:
                resp = f"Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')} et a {info.get('age')} ans."
            else:
                dob = info.get('date_of_birth')
                if dob:
                    resp = f"Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')}. Date de naissance: {dob}."
                else:
                    resp = f"Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')}. La date de naissance n'est pas disponible."
        else:
            resp = f"Le patient s'appelle {info.get('first_name','')} {info.get('last_name','')}."

        return jsonify({'response': resp, 'source': 'db_join'})

    # Recherche RAG
    relevant_chunks = search_relevant_chunks(query, top_k=5)

    # If a patient_id filter is provided, restrict chunks to that patient
    if patient_id:
        relevant_chunks = [c for c in relevant_chunks if str(c.get('patient_id')) == str(patient_id)]

    if not relevant_chunks:
        return jsonify({'response': 'Aucune donnée trouvée dans la base.'})

    # Génération de réponse
    response = generate_chatbot_response(query, relevant_chunks)

    return jsonify({
        'response': response,
        'chunks_used': len(relevant_chunks)
    })


@app.route('/api/patients', methods=['GET'])
def api_get_patients():
    """Retourne la liste des patients (id et nom) pour le frontend afin de permettre un filtre."""
    try:
        patients = load_all_patients()
        result = []
        for p in patients:
            # try to get names from users via join helper
            try:
                user_info = get_patient_user_info(patient_id=p.get('id'))
                if user_info and (user_info.get('first_name') or user_info.get('last_name')):
                    name = f"{user_info.get('first_name','').strip()} {user_info.get('last_name','').strip()}".strip()
                else:
                    # fallback to fields in info_patients
                    name = f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
                if not name:
                    name = p.get('patient_name') or p.get('id')
            except Exception:
                name = p.get('patient_name') or p.get('id')

            result.append({'id': p.get('id'), 'name': name})

        return jsonify({'patients': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/patients/details', methods=['GET'])
def api_get_patients_details():
    """Retourne la liste des patients avec date_de_naissance et âge calculé (si disponible)."""
    try:
        patients = load_all_patients()
        result = []
        for p in patients:
            # resolve name
            try:
                user_info = get_patient_user_info(patient_id=p.get('id'))
                if user_info and (user_info.get('first_name') or user_info.get('last_name')):
                    name = f"{user_info.get('first_name','').strip()} {user_info.get('last_name','').strip()}".strip()
                else:
                    name = f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
                if not name:
                    name = p.get('patient_name') or p.get('id')
            except Exception:
                name = p.get('patient_name') or p.get('id')

            # get DOB from row (may be date_of_birth or dob)
            dob = p.get('date_of_birth') or p.get('dob') or None
            age = compute_age_from_dob(dob) if dob else None

            result.append({
                'id': p.get('id'),
                'name': name,
                'date_of_birth': dob,
                'computed_age': age
            })

        return jsonify({'patients': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat/field', methods=['POST'])
def chat_field():
    """Endpoint pour demander au chatbot de retourner une ou plusieurs valeurs de champs du formulaire.
    Reçoit JSON: { case_id: str, message: str }
    Retourne: { type: 'fields', case_id:..., fields: { key: value } } ou { type: 'not_field', message: ... }
    """
    data = request.json or {}
    case_id = data.get('case_id')
    message = data.get('message', '')

    if not message:
        return jsonify({'error': 'message manquant'}), 400

    norm = normalize_text(message)
    requested = set()
    for kw, key in FIELD_MAP.items():
        if kw in norm:
            requested.add(key)

    # If no keyword matched, try direct field name mention
    if not requested:
        for key in set(FIELD_MAP.values()):
            if key.replace('_', ' ') in norm:
                requested.add(key)

    if not requested:
        # fallback: not a form-field question
        return jsonify({'type': 'not_field', 'message': "Question non reconnue comme champ du formulaire. Exemple: 'Résumé clinique' ou 'Conclusion'."})

    # load case
    case = get_case_by_id(case_id) if case_id else None
    if not case:
        return jsonify({'error': 'dossier introuvable'}), 404

    result = {}
    for field in requested:
        val = case.get(field)
        if val is not None and str(val).strip() != '':
            result[field] = str(val)
        else:
            # fallback to LLM generation for this single field
            gen = call_llm_generate_field(case, field)
            result[field] = gen or 'non disponible'

    return jsonify({'type': 'fields', 'case_id': case_id, 'fields': result})

@app.route('/api/rebuild-index', methods=['POST'])
def rebuild_index():
    """Reconstruit l'index FAISS"""
    try:
        build_faiss_index()
        stats = get_patient_stats()
        return jsonify({
            'success': True,
            'message': 'Index reconstruit avec succès',
            'total_patients': stats.get('total_patients', 0)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check-new-patients', methods=['GET'])
def check_new_patients():
    """Vérifie les nouveaux patients"""
    global last_patient_count
    
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'new_patients': 0})
        
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) as count FROM {TABLE_NAME}")
        current_count = cursor.fetchone()['count']
        conn.close()
        
        new_count = max(0, current_count - last_patient_count)
        last_patient_count = current_count
        
        if new_count > 0:
            build_faiss_index()
        
        return jsonify({
            'new_patients': new_count,
            'total_patients': current_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== DÉMARRAGE ====================

if __name__ == '__main__':
    print("🔄 Initialisation de l'index FAISS...")
    patients = load_all_patients()
    last_patient_count = len(patients)
    build_faiss_index()
    print(f"✅ {last_patient_count} patients chargés")
    print("🚀 Démarrage du serveur Flask...\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)