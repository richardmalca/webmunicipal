import json
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parent.parent
PINE = colors.HexColor("#146653")
INK = colors.HexColor("#162f29")
MUTED = colors.HexColor("#415952")
MONTHS = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()

TITLE = ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=INK)
LABEL = ParagraphStyle("Label", fontName="Helvetica-Bold", fontSize=11, leading=15, textColor=PINE)
BODY = ParagraphStyle("Body", fontName="Helvetica", fontSize=11, leading=17, textColor=MUTED)


def draw_brand(canvas, document):
    width, height = document.pagesize
    canvas.setFillColor(PINE)
    canvas.rect(0, height - 8, width, 8, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#d4dfd4"))
    canvas.line(54, 57, width - 54, 57)
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(54, 39, "Documento de demostración · Municipalidad ficticia")
    canvas.drawRightString(width - 54, 39, str(document.page))


def build_attachment(entry):
    target = ROOT / "public" / entry["attachment"].lstrip("/")
    target.parent.mkdir(parents=True, exist_ok=True)
    published = date.fromisoformat(entry["date"])
    published_label = f"{published.day} de {MONTHS[published.month - 1]} de {published.year}"
    document = SimpleDocTemplate(
        str(target), pagesize=A4, leftMargin=54, rightMargin=54, topMargin=55,
        bottomMargin=78, title=entry["title"], author="Municipalidad ficticia de Villa del Sol",
    )
    story = [
        Paragraph("Municipalidad de Villa del Sol", LABEL),
        Paragraph(f"Transparencia · {escape(entry['category'])} · {published_label}", BODY),
        Spacer(1, 26),
        Paragraph(escape(entry["title"]), TITLE),
        Spacer(1, 16),
        Paragraph(escape(entry["description"]), BODY),
        Spacer(1, 22),
    ]
    for line in entry["body"].splitlines():
        if line:
            style = LABEL if line in {"Objeto", "Área responsable"} else BODY
            story.extend([Paragraph(escape(line), style), Spacer(1, 7)])
    document.build(story, onFirstPage=draw_brand, onLaterPages=draw_brand)


if __name__ == "__main__":
    entries = json.loads((ROOT / "lib" / "content.json").read_text(encoding="utf-8"))
    for entry in entries:
        if entry.get("attachment"):
            build_attachment(entry)
