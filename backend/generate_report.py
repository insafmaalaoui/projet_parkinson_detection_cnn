from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
import os
from datetime import datetime
from typing import List, Optional


def _safe_str(x):
    return '' if x is None else str(x)


def _compute_age_from_dob(dob):
    """Return age in years given a date-of-birth which may be a string or datetime.
    Supports ISO strings and common formats like YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY.
    Returns None if dob is missing or unparseable.
    """
    if not dob:
        return None
    try:
        if isinstance(dob, str):
            # Try ISO format first
            try:
                dt = datetime.fromisoformat(dob)
            except Exception:
                dt = None
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                    try:
                        dt = datetime.strptime(dob, fmt)
                        break
                    except Exception:
                        dt = None
                if dt is None:
                    return None
        else:
            dt = dob

        today = datetime.utcnow().date()
        born = dt.date()
        age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        return age
    except Exception:
        return None


def _draw_section_title(c, x, y, title):
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#0A4D8C"))  # Blue professional
    c.drawString(x, y, title)
    c.setFillColor(colors.black)


def _draw_box(c, x, y, w, h, radius=6):
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#C7C7C7"))
    c.roundRect(x, y - h, w, h, radius, stroke=1, fill=0)


def generate_medical_report_pdf(
    output_path: str,
    case_id: str,
    patient_info: Optional[dict],
    prediction: Optional[dict],
    neurologist_report: str,
    neurologist_name: str,
    neurologist_contact: Optional[str] = None,
    image_paths: Optional[List[str]] = None,
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    # ======================================================
    # HEADER — Bande bleue professionnelle
    # ======================================================
    header_h = 22 * mm
    c.setFillColor(colors.HexColor("#0A4D8C"))
    c.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(15 * mm, height - 14 * mm, "Rapport Médical — MediDiagnose")
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 15 * mm, height - 14 * mm,
                      f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")

    c.setFillColor(colors.black)
    y = height - header_h - 10 * mm

    # ======================================================
    # CASE ID
    # ======================================================
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y, f"Case ID : {case_id}")
    y -= 12 * mm

    # ======================================================
    # SECTION PATIENT
    # ======================================================
    _draw_section_title(c, 20 * mm, y, "Informations Patient")
    y -= 6 * mm

    box_h = 35 * mm
    _draw_box(c, 20 * mm, y, width - 40 * mm, box_h)
    y_start = y - 5 * mm

    c.setFont("Helvetica", 10)
    if patient_info:
        name = f"{patient_info.get('first_name','')} {patient_info.get('last_name','')}".strip()
        dob_val = patient_info.get("date_of_birth")
        dob_display = _safe_str(dob_val) if dob_val is not None else "—"
        age_val = patient_info.get("age")
        if not age_val:
            age_val = _compute_age_from_dob(dob_val)

        fields = [
            ("Nom", name or "—"),
            ("Date de naissance", dob_display),
            ("Âge", _safe_str(age_val) if age_val is not None else "—"),
            ("Sexe", _safe_str(patient_info.get("gender","—")))
        ]

        for label, value in fields:
            c.drawString(25 * mm, y_start, f"{label} : {value}")
            y_start -= 6 * mm
    else:
        c.drawString(25 * mm, y_start, "Aucune information disponible")
        y_start -= 6 * mm

    y -= (box_h + 12 * mm)

    # ======================================================
    # SECTION PREDICTION
    # ======================================================
    _draw_section_title(c, 20 * mm, y, "Résultat du Modèle IA")
    y -= 6 * mm

    box_h = 28 * mm
    _draw_box(c, 20 * mm, y, width - 40 * mm, box_h)
    y_start = y - 5 * mm

    c.setFont("Helvetica", 10)
    if prediction:
        cls = prediction.get("class", "—")
        score = prediction.get("score")
        conf = prediction.get("confidence")

        c.drawString(25 * mm, y_start, f"Classe prédite : {cls}")
        y_start -= 6 * mm

        if score is not None:
            c.drawString(25 * mm, y_start, f"Score : {float(score):.4f}")
            y_start -= 6 * mm

        if conf is not None:
            c.drawString(25 * mm, y_start, f"Confiance : {conf*100:.1f}%")
            y_start -= 6 * mm

    else:
        c.drawString(25 * mm, y_start, "Aucune prédiction disponible")

    y -= (box_h + 12 * mm)

    # ======================================================
    # IMAGES — MINIATURES
    # ======================================================
    if image_paths:
        _draw_section_title(c, 20 * mm, y, "Images Associées")
        y -= 8 * mm

        thumb_x = 20 * mm
        max_h = 35 * mm
        gap = 4 * mm

        for path in image_paths:
            if not path:
                continue
            img_path = path
            if img_path.startswith('/'):
                img_path = os.path.join(os.path.dirname(__file__), img_path.lstrip('/'))
            if not os.path.exists(img_path):
                continue

            try:
                img = ImageReader(img_path)
                iw, ih = img.getSize()
                ratio = iw / ih
                w = max_h * ratio
                h = max_h

                if thumb_x + w > width - 20 * mm:
                    thumb_x = 20 * mm
                    y -= (max_h + 5 * mm)

                c.drawImage(img, thumb_x, y - h, width=w, height=h,
                            preserveAspectRatio=True, mask="auto")

                thumb_x += w + gap

            except Exception:
                continue

        y -= (max_h + 15 * mm)

    # ======================================================
    # NEUROLOGIST REPORT
    # ======================================================
    _draw_section_title(c, 20 * mm, y, "Rapport du Neurologue")
    y -= 8 * mm

    box_h = 60 * mm
    _draw_box(c, 20 * mm, y, width - 40 * mm, box_h)

    text = c.beginText(25 * mm, y - 5 * mm)
    text.setFont("Helvetica", 10)
    text.setLeading(12)
    for line in (neurologist_report or "").splitlines():
        text.textLine(line)
    c.drawText(text)

    y -= (box_h + 20 * mm)

    # ======================================================
    # FOOTER
    # ======================================================
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(colors.HexColor("#444444"))
    footer_left = f"Neurologue responsable : {neurologist_name or '—'}"
    if neurologist_contact:
        footer_left += f" — Contact: {neurologist_contact}"
    c.drawString(20 * mm, 15 * mm, footer_left)
    c.drawRightString(width - 20 * mm, 15 * mm, "MediDiagnose © 2025")
    c.setFillColor(colors.black)

    c.showPage()
    c.save()
