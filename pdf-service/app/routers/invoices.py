"""POST /generate/invoice — render an export invoice PDF (design §15)."""
from fastapi import APIRouter, Depends
from app.middleware.auth import require_internal_token
from app.models.schemas import InvoicePdfRequest, GeneratedDoc
from app.services.pdf_generator import render_invoice_pdf
from app.utils.storage import save_bytes

router = APIRouter(prefix="/generate", tags=["invoices"], dependencies=[Depends(require_internal_token)])


@router.post("/invoice", response_model=GeneratedDoc)
async def generate_invoice(req: InvoicePdfRequest) -> GeneratedDoc:
    payload = req.model_dump()
    pdf = render_invoice_pdf(payload)
    key = f"invoices/{req.invoiceId}.pdf"
    url = save_bytes(key, pdf, "application/pdf")
    return GeneratedDoc(url=url, storageKey=key)
