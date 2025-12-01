import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors

from sqlalchemy.orm import Session
import models
import database

BASE_DIR = os.path.dirname(__file__)
REPORTS_DIR = os.path.join(BASE_DIR, "uploads", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _format_datetime(dt):
    if not dt:
        return "—"
    if isinstance(dt, str):
        return dt
    try:
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt)


def generate_case_report_pdf(case_id: str, db: Session = None, report_fields: dict = None) -> str:
    """
    Generate a PDF report for a MedicalCase and return the file path.
    If db is None, open a new session.
    """
    close_db = False
    if db is None:
        SessionLocal = getattr(database, "SessionLocal")
        db = SessionLocal()
        close_db = True

    try:
        case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
        if not case:
            raise ValueError("Case not found")

        patient = case.patient
        images = case.images  # list of MRIImage

        # fetch extended patient info from InfoPatient if available
        info = None
        try:
            info = db.query(models.InfoPatient).filter(models.InfoPatient.user_id == case.patient_id).first()
        except Exception:
            info = None

        def _compute_age(dob):
            if not dob:
                return None
            try:
                if isinstance(dob, str):
                    dob_dt = datetime.fromisoformat(dob)
                else:
                    dob_dt = dob
                today = datetime.utcnow().date()
                born = dob_dt.date()
                age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                return age
            except Exception:
                return None

        # File path
        filename = f"report_{case_id}.pdf"
        filepath = os.path.join(REPORTS_DIR, filename)

        # Build PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=20*mm, leftMargin=20*mm,
                                topMargin=15*mm, bottomMargin=15*mm)

        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        h1 = styles["Heading1"]
        h2 = styles["Heading2"]
        small = ParagraphStyle("small", parent=normal, fontSize=9, leading=11)

        elems = []

        # Header with optional logo/seal (search uploads for a PNG/JPG)
        logo_path = None
        try:
            uploads_dir = os.path.join(BASE_DIR, "uploads")
            if os.path.isdir(uploads_dir):
                for fn in os.listdir(uploads_dir):
                    if fn.lower().endswith(('.png', '.jpg', '.jpeg')):
                        logo_path = os.path.join(uploads_dir, fn)
                        break
        except Exception:
            logo_path = None

        if logo_path:
            # create a two-column header: title left, logo right
            try:
                logo = Image(logo_path, width=40*mm, height=18*mm)
                header_table = Table([[Paragraph("<b>Rapport Médical — Maladie de Parkinson</b>", h1), logo]], colWidths=[doc.width-50*mm, 50*mm])
                header_table.setStyle(TableStyle([('VALIGN',(0,0),(1,0),'MIDDLE')]))
                elems.append(header_table)
            except Exception:
                elems.append(Paragraph("Rapport Médical — Maladie de Parkinson", h1))
        else:
            elems.append(Paragraph("Rapport Médical — Maladie de Parkinson", h1))

        elems.append(Spacer(1, 6))

        # Patient info table - include extended InfoPatient fields when available
        pname = ((getattr(patient, 'first_name', '') or '') + ' ' + (getattr(patient, 'last_name', '') or '')).strip() if patient else '—'
        dob = None
        age = None
        gender = None
        phone = None
        address = None
        height_cm = None
        weight_kg = None
        medical_history = None
        emergency_contact = None
        autres_maladies = None
        details_autres_maladies = None
        observations = None
        if info:
            dob = getattr(info, 'date_of_birth', None)
            # format dob
            dob_str = _format_datetime(dob) if dob else '—'
            age = _compute_age(dob)
            gender = getattr(info, 'gender', None) or getattr(patient, 'gender', None)
            phone = getattr(info, 'phone', None)
            address = getattr(info, 'address', None)
            height_cm = getattr(info, 'height_cm', None)
            weight_kg = getattr(info, 'weight_kg', None)
            medical_history = getattr(info, 'medical_history', None)
            emergency_contact = getattr(info, 'emergency_contact', None)
            autres_maladies = getattr(info, 'autres_maladies', None)
            details_autres_maladies = getattr(info, 'details_autres_maladies', None)
            observations = getattr(info, 'observations', None)
        else:
            dob_str = '—'

        patient_data = [
            ["Nom", pname or "—"],
            ["ID patient", case.patient_id or "—"],
            ["Date de naissance", dob_str],
            ["Âge", str(age) if age is not None else "—"],
            ["Sexe", gender or "—"],
            ["Téléphone", phone or "—"],
            ["Adresse", address or "—"],
            ["Taille (cm)", str(height_cm) if height_cm is not None else "—"],
            ["Poids (kg)", str(weight_kg) if weight_kg is not None else "—"],
            ["Antécédents médicaux", medical_history or "—"],
            ["Autres maladies", ("Oui" if autres_maladies else "Non") if autres_maladies is not None else "—"],
            ["Détails autres maladies", details_autres_maladies or "—"],
            ["Contact d'urgence", emergency_contact or "—"],
            ["Observations", observations or "—"],
            ["Date de création dossier", _format_datetime(case.created_at)]
        ]
        t = Table(patient_data, hAlign="LEFT", colWidths=[110*mm, 60*mm])
        t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                               ("INNERGRID", (0,0), (-1,-1), 0.25, colors.grey),
                               ("BOX", (0,0), (-1,-1), 0.5, colors.grey)]))
        elems.append(t)
        elems.append(Spacer(1, 8))

        # Motif & Description
        elems.append(Paragraph("<b>Motif de consultation</b>", h2))
        elems.append(Paragraph(case.description or "—", normal))
        elems.append(Spacer(1, 8))

        # If structured report_fields provided, render them as distinct sections
        if report_fields:
            def add_section(title, content):
                elems.append(Paragraph(f"<b>{title}</b>", h2))
                elems.append(Paragraph(content or "—", normal))
                elems.append(Spacer(1, 6))

            # Clinical summary
            add_section("Résumé clinique", report_fields.get('clinical_summary'))
            # Exam findings
            add_section("Examen clinique", report_fields.get('exam_findings'))
            # UPDRS
            updrs = report_fields.get('updrs_score')
            if updrs:
                add_section("Score UPDRS", str(updrs))
            # Diagnosis
            add_section("Diagnostic / Conclusion", report_fields.get('diagnosis'))
            # Complementary exams
            add_section("Examens complémentaires recommandés", report_fields.get('complementary_exams'))
            # Recommendations
            add_section("Recommandations", report_fields.get('recommendations'))
            # Follow-up plan
            add_section("Plan de suivi", report_fields.get('follow_up_plan'))
            # Additional notes
            add_section("Notes complémentaires", report_fields.get('additional_notes'))
            elems.append(Spacer(1, 8))

        # Résultats IA / CNN
        elems.append(Paragraph("<b>Résultats Analyse CNN</b>", h2))
        # Prefer numeric confidence if available
        cnn_text = case.cnn_prediction or "Aucune prédiction disponible"
        conf = getattr(case, 'cnn_confidence', None)
        if conf is not None:
            try:
                cnn_text = f"{cnn_text} — confiance: {float(conf):.4f} ({float(conf)*100:.1f}%)"
            except Exception:
                cnn_text = f"{cnn_text} — confiance: {conf}"
        elems.append(Paragraph(cnn_text, normal))
        elems.append(Spacer(1, 6))

        # Images list
        elems.append(Paragraph("<b>Images associées</b>", h2))
        if images:
            img_rows = []
            for img in images:
                img_rows.append([img.filename or "—", img.file_path or f"/uploads/{img.filename}"])
            img_table = Table([["Fichier", "Chemin / URL"]] + img_rows, colWidths=[80*mm, 80*mm])
            img_table.setStyle(TableStyle([("BACKGROUND",(0,0),(1,0),colors.lightgrey),
                                           ("GRID",(0,0),(-1,-1),0.25,colors.grey),
                                           ("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
            elems.append(img_table)
        else:
            elems.append(Paragraph("Aucune image associée.", normal))
        elems.append(Spacer(1, 8))

        # Rapport neurologue (si disponible)
        elems.append(Paragraph("<b>Rapport du neurologue</b>", h2))
        elems.append(Paragraph(case.neurologist_report or "—", normal))
        elems.append(Spacer(1, 12))

        # Conclusion & signature block
        elems.append(Paragraph("<b>Conclusion</b>", h2))
        conclusion_text = "Voir observations ci-dessus et plan de prise en charge proposé par le neurologue."
        elems.append(Paragraph(conclusion_text, normal))
        elems.append(Spacer(1, 24))

        # Neurologist signature block: prefer actual neurologist name/email when set on case
        try:
            if getattr(case, 'neurologist', None):
                n = case.neurologist
                neuro_name = ((getattr(n, 'first_name', '') or '') + ' ' + (getattr(n, 'last_name', '') or '')).strip()
                neuro_contact = getattr(n, 'email', None)
            else:
                neuro_name = None
                neuro_contact = None
        except Exception:
            neuro_name = None
            neuro_contact = None

        if neuro_name:
            elems.append(Paragraph(f"Neurologue : {neuro_name}", normal))
        else:
            elems.append(Paragraph("Neurologue : ______________________", normal))

        if neuro_contact:
            elems.append(Paragraph(f"Contact : {neuro_contact}", normal))

        elems.append(Paragraph(f"Date : {_format_datetime(datetime.utcnow())}", small))

        # Build and write to file
        doc.build(elems)

        # write buffer to file
        with open(filepath, "wb") as f:
            f.write(buffer.getvalue())

        return filepath

    finally:
        if close_db:
            db.close()
