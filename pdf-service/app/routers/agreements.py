"""POST /generate/agreement — render a signed agreement PDF with audit trail."""
from fastapi import APIRouter, Depends
from app.middleware.auth import require_internal_token
from app.models.schemas import AgreementPdfRequest, GeneratedDoc
from app.services.pdf_generator import render_agreement_pdf
from app.utils.storage import save_bytes

router = APIRouter(prefix="/generate", tags=["agreements"], dependencies=[Depends(require_internal_token)])


@router.post("/agreement", response_model=GeneratedDoc)
async def generate_agreement(req: AgreementPdfRequest) -> GeneratedDoc:
    payload = req.model_dump()
    pdf = render_agreement_pdf(payload)
    key = f"agreements/{req.agreementId or 'agreement'}.pdf"
    url = save_bytes(key, pdf, "application/pdf")
    return GeneratedDoc(url=url, storageKey=key)
