"""POST /generate/salary-slip + /generate/letter — render HR PDFs."""
from fastapi import APIRouter, Depends
from app.middleware.auth import require_internal_token
from app.models.schemas import SalarySlipRequest, LetterRequest, GeneratedDoc
from app.services.pdf_generator import render_salary_slip_pdf, render_letter_pdf
from app.utils.storage import save_bytes

router = APIRouter(prefix="/generate", tags=["payroll"], dependencies=[Depends(require_internal_token)])


@router.post("/salary-slip", response_model=GeneratedDoc)
async def generate_salary_slip(req: SalarySlipRequest) -> GeneratedDoc:
    payload = req.model_dump()
    pdf = render_salary_slip_pdf(payload)
    key = f"salary-slips/{req.slipId or 'slip'}.pdf"
    url = save_bytes(key, pdf, "application/pdf")
    return GeneratedDoc(url=url, storageKey=key)


@router.post("/letter", response_model=GeneratedDoc)
async def generate_letter(req: LetterRequest) -> GeneratedDoc:
    payload = req.model_dump()
    pdf = render_letter_pdf(payload)
    key = f"letters/{req.letterId or 'letter'}.pdf"
    url = save_bytes(key, pdf, "application/pdf")
    return GeneratedDoc(url=url, storageKey=key)
