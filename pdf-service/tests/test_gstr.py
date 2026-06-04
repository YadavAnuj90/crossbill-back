"""Unit tests for GSTR-1 6A assembly (design §19)."""
import io
import pandas as pd
from app.services.gstr_export import build_gstr_6a, GSTR_6A_COLUMNS


def test_build_gstr_6a_returns_valid_xlsx_with_expected_columns():
    invoices = [
        {"number": "CB/2026-27/0001", "invoiceDate": "2026-06-02", "inrEquivalent": "83500.00"},
    ]
    data = build_gstr_6a(invoices)
    df = pd.read_excel(io.BytesIO(data), sheet_name="6A")
    assert list(df.columns) == GSTR_6A_COLUMNS
    assert df.iloc[0]["Invoice Number"] == "CB/2026-27/0001"


def test_build_gstr_6a_handles_empty():
    data = build_gstr_6a([])
    df = pd.read_excel(io.BytesIO(data), sheet_name="6A")
    assert list(df.columns) == GSTR_6A_COLUMNS
    assert len(df) == 0
