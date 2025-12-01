"""
Database initialization script
Run this to set up the database with initial admin user
"""
from database import SessionLocal, init_db
import models
import auth
from datetime import datetime

def setup():
    init_db()
    db = SessionLocal()
    
    # Create admin user
    admin_exists = db.query(models.User).filter(models.User.email == "admin@medidiagnose.com").first()
    if not admin_exists:
        admin = models.User(
            email="admin@medidiagnose.com",
            hashed_password=auth.hash_password("admin123"),
            role="admin",
            first_name="Admin",
            last_name="System",
            created_at=datetime.utcnow()
        )
        db.add(admin)
        db.commit()
        print("✓ Admin user created")
    
    # Create test neurologist
    neuro_exists = db.query(models.User).filter(models.User.email == "dr.smith@medidiagnose.com").first()
    if not neuro_exists:
        neurologist = models.User(
            email="dr.smith@medidiagnose.com",
            hashed_password=auth.hash_password("neuro123"),
            role="neurologist",
            first_name="Dr.",
            last_name="Smith",
            speciality="Neurologie générale",
            created_at=datetime.utcnow()
        )
        db.add(neurologist)
        db.commit()
        print("✓ Test neurologist created")
    
    # Create test patient
    patient_exists = db.query(models.User).filter(models.User.email == "patient@medidiagnose.com").first()
    if not patient_exists:
        patient = models.User(
            email="patient@medidiagnose.com",
            hashed_password=auth.hash_password("patient123"),
            role="patient",
            first_name="Jean",
            last_name="Dupont",
            created_at=datetime.utcnow()
        )
        db.add(patient)
        db.commit()
        print("✓ Test patient created")
    
    db.close()
    print("\n✓ Database setup complete!")
    print("\nTest credentials:")
    print("Admin: admin@medidiagnose.com / admin123")
    print("Neurologist: dr.smith@medidiagnose.com / neuro123")
    print("Patient: patient@medidiagnose.com / patient123")

if __name__ == "__main__":
    setup()
