"""Pydantic request/response models for the PDF + report service (design §15)."""
from pydantic import BaseModel, Field


class InvoiceItem(BaseModel):
    description: str
    sacCode: str
    quantity: str
    unitAmount: str
    lineTotal: str
    gstRate: float = 0


class InvoicePdfRequest(BaseModel):
    invoiceId: str
    type: str = "export"              # 'export' | 'domestic'
    number: str
    invoiceDate: str
    currency: str
    fxRate: str = "1.000000"
    inrEquivalent: str = "0.00"
    subtotal: str = "0.00"
    taxType: str = "LUT_ZERO"
    cgstAmount: str = "0.00"
    sgstAmount: str = "0.00"
    igstAmount: str = "0.00"
    taxTotal: str = "0.00"
    grandTotal: str = "0.00"
    declarationText: str = ""
    placeOfSupply: str = ""
    seller: dict = Field(default_factory=dict)
    client: dict = Field(default_factory=dict)
    items: list[InvoiceItem]


class GeneratedDoc(BaseModel):
    url: str
    storageKey: str


class GstrExportRequest(BaseModel):
    orgId: str
    financialYear: str
    invoices: list[dict] = Field(default_factory=list)
