"""Render an export-invoice PDF from HTML using WeasyPrint (design §6)."""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES)),
    autoescape=select_autoescape(["html"]),
)


def render_invoice_html(payload: dict) -> str:
    """Compute display fields and render the invoice template to an HTML string."""
    items = payload.get("items", [])
    # Subtotal display = sum of line totals (already computed and stored by the API).
    subtotal = sum(float(i["lineTotal"]) for i in items) if items else 0.0
    ctx = {**payload, "subtotal": f"{subtotal:.2f}"}
    template = _env.get_template("invoice.html")
    return template.render(inv=ctx)


def render_invoice_pdf(payload: dict) -> bytes:
    """Render the invoice to PDF bytes. Imports WeasyPrint lazily (heavy native deps)."""
    from weasyprint import HTML  # noqa: WPS433 (lazy import keeps test collection light)

    html = render_invoice_html(payload)
    return HTML(string=html).write_pdf()
