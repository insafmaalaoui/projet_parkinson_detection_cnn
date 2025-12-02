"""
Script d'initialisation de la base de données SQLite
Crée les tables et insère des données de test
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import models
import database
from auth import hash_password

# Chemin de la base de données
DB_FILE = "medidiagnose.db"

def init_database():
    """Crée les tables et données de test"""
    
    # Créé la base de données et les tables
    print("[*] Création de la base de données SQLite...")
    database.Base.metadata.create_all(bind=database.engine)
    print("✅ Tables créées avec succès!\n")
    
    # Crée une session
    Session = sessionmaker(bind=database.engine)
    db = Session()
    
    try:
        # Vérifie si les données de test existent déjà
        admin_exists = db.query(models.User).filter(
            models.User.email == "admin@medidiagnose.com"
        ).first()
        
        if admin_exists:
            print("ℹ️  Les données de test existent déjà. Pas besoin de réinitialiser.")
            db.close()
            return
        
        print("[*] Insertion des données de test...\n")
        
        # Crée l'admin
        admin = models.User(
            email="admin@medidiagnose.com",
            hashed_password=hash_password("admin123"),
            role="admin",
            first_name="Admin",
            last_name="MediDiagnose",
            created_at=datetime.utcnow()
        )
        db.add(admin)
        print("✅ Admin créé: admin@medidiagnose.com / admin123")
        
        # Crée le neurologist
        neuro = models.User(
            email="dr.smith@medidiagnose.com",
            hashed_password=hash_password("neuro123"),
            role="neurologist",
            first_name="Dr. James",
            last_name="Smith",
            speciality="Neurology",
            created_at=datetime.utcnow()
        )
        db.add(neuro)
        print("✅ Neurologue créé: dr.smith@medidiagnose.com / neuro123")
        
        # Crée un patient
        patient = models.User(
            email="patient@medidiagnose.com",
            hashed_password=hash_password("patient123"),
            role="patient",
            first_name="Jean",
            last_name="Dupont",
            created_at=datetime.utcnow()
        )
        db.add(patient)
        print("✅ Patient créé: patient@medidiagnose.com / patient123")
        
        # Crée un deuxième patient
        patient2 = models.User(
            email="marie@medidiagnose.com",
            hashed_password=hash_password("patient123"),
            role="patient",
            first_name="Marie",
            last_name="Bernard",
            created_at=datetime.utcnow()
        )
        db.add(patient2)
        print("✅ Patient 2 créé: marie@medidiagnose.com / patient123\n")
        
        # Commit des utilisateurs
        db.commit()
        
        # Crée un cas médical de test
        case = models.MedicalCase(
            patient_id=patient.id,
            description="Suspicion de maladie de Parkinson - Tremors et rigidité observés",
            status="pending",
            created_at=datetime.utcnow()
        )
        db.add(case)
        db.commit()
        print("✅ Cas médical de test créé\n")
        
        # Affiche le résumé
        print("=" * 50)
        print("✅ BASE DE DONNÉES INITIALISÉE AVEC SUCCÈS!")
        print("=" * 50)
        print(f"\n📁 Fichier base de données: {DB_FILE}")
        print(f"📊 Utilisateurs créés: 4 (1 admin, 1 neuro, 2 patients)")
        print(f"📋 Cas médicaux créés: 1\n")
        
        print("🚀 Pour lancer le serveur FastAPI:")
        print("   python main.py\n")
        
        print("🌐 Accès aux API:")
        print("   - Documentation: http://localhost:8000/docs")
        print("   - ReDoc: http://localhost:8000/redoc")
        print("   - Health Check: http://localhost:8000/health\n")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        db.close()
        sys.exit(1)

if __name__ == "__main__":
    init_database()
