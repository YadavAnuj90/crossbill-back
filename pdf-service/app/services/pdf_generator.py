"""Render an invoice PDF from HTML using WeasyPrint (design §6). Export or domestic GST."""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATES)), autoescape=select_autoescape(["html"]))


def render_invoice_html(payload: dict) -> str:
    items = payload.get("items", [])
    subtotal = sum(float(i["lineTotal"]) for i in items) if items else 0.0
    is_domestic = payload.get("type") == "domestic"
    doc_type = payload.get("docType")
    if doc_type == "credit_note":
        doc_title, doc_label = "Credit Note", "Credit Note No."
    elif doc_type == "debit_note":
        doc_title, doc_label = "Debit Note", "Debit Note No."
    else:
        doc_title = "Tax Invoice" if is_domestic else "Export Invoice"
        doc_label = "Invoice No."
    ctx = {
        **payload,
        "subtotal_calc": f"{subtotal:.2f}",
        "is_domestic": is_domestic,
        "is_note": doc_type in ("credit_note", "debit_note"),
        "doc_title": doc_title,
        "doc_label": doc_label,
    }
    return _env.get_template("invoice.html").render(inv=ctx)


def render_invoice_pdf(payload: dict) -> bytes:
    from weasyprint import HTML  # noqa: WPS433 (lazy import — heavy native deps)
    return HTML(string=render_invoice_html(payload)).write_pdf()
