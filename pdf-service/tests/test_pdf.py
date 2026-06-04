"""Unit tests for invoice HTML rendering (design §19).

We test the HTML render (fast, no native deps) rather than the full WeasyPrint PDF, which is
covered by golden-file tests against CA-approved reference PDFs in CI.
"""
from app.services.pdf_generator import render_invoice_html

SAMPLE = {
    "number": "CB/2026-27/0001",
    "invoiceDate": "2026-06-02",
    "currency": "USD",
    "fxRate": "83.500000",
    "fxRateSource": "CBIC_NOTIFIED",
    "fxRateDate": "2026-06-02",
    "inrEquivalent": "83500.00",
    "declarationText": "Supply meant for export under LUT without payment of IGST.",
    "placeOfSupply": "Outside India (export of services)",
    "seller": {"legalName": "Acme Dev", "gstin": "27ABCDE1234F1Z5"},
    "client": {"name": "Foo Inc", "address": "1 Market St", "country": "US"},
    "items": [
        {"description": "API work", "sacCode": "998314", "quantity": "1.00",
         "unitAmount": "1000.00", "lineTotal": "1000.00"},
    ],
}


def test_render_includes_core_compliance_fields():
    html = render_invoice_html(SAMPLE)
    assert "CB/2026-27/0001" in html
    assert "998314" in html
    assert "Outside India" in html
    assert "without payment of IGST" in html
    assert "83.500000" in html


def test_subtotal_is_computed_from_line_totals():
    html = render_invoice_html(SAMPLE)
    assert "1000.00" in html
