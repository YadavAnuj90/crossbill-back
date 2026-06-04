"""Assemble the GSTR-1 Table 6A export with pandas (design §6, §12).

The 6A column layout must match the GST offline tool's import template and be verified
against the current template + CA sign-off (golden-file tested, design §19). The columns
below are representative and MUST be confirmed before production.
"""
import io
import pandas as pd

# Representative GSTR-1 6A columns (exports). Confirm exact headers against the live template.
GSTR_6A_COLUMNS = [
    "Invoice Number",
    "Invoice date",
    "Invoice Value",
    "Port Code",
    "Shipping Bill Number",
    "Shipping Bill Date",
    "Rate",
    "Taxable Value",
    "Cess Amount",
]


def build_gstr_6a(invoices: list[dict]) -> bytes:
    """Return an .xlsx (bytes) of the 6A statement for the given invoice rows."""
    rows = []
    for inv in invoices:
        rows.append(
            {
                "Invoice Number": inv.get("number"),
                "Invoice date": inv.get("invoiceDate"),
                "Invoice Value": inv.get("inrEquivalent"),
                "Port Code": "",            # N/A for service exports (no shipping bill)
                "Shipping Bill Number": "",
                "Shipping Bill Date": "",
                "Rate": 0,                  # zero-rated under LUT
                "Taxable Value": inv.get("inrEquivalent"),
                "Cess Amount": 0,
            }
        )
    df = pd.DataFrame(rows, columns=GSTR_6A_COLUMNS)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="6A")
    return buf.getvalue()
