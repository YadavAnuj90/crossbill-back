"""Pydantic request/response models for the PDF + report service (design §15)."""
from pydantic import BaseModel, Field


class InvoiceItem(BaseModel):
    description: str
    sacCode: str
    quantity: str
    unitAmount: str
    lineTotal: str


class InvoicePdfRequest(BaseModel):
    invoiceId: str
    number: str
    invoiceDate: str
    currency: str
    fxRate: str
    inrEquivalent: str
    declarationText: str
    placeOfSupply: str
    seller: dict = Field(default_factory=dict)
    client: dict = Field(default_factory=dict)
    items: list[InvoiceItem]


class GeneratedDoc(BaseModel):
    url: str
    storageKey: str


class GstrExportRequest(BaseModel):
    orgId: str
    financialYear: str
    # In production the API passes the invoice rows; the stub synthesises an empty template.
    invoices: list[dict] = Field(default_factory=list)
