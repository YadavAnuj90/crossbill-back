"""POST /generate/gstr — assemble the GSTR-1 Table 6A export (design §15)."""
from fastapi import APIRouter, Depends
from app.middleware.auth import require_internal_token
from app.models.schemas import GstrExportRequest, GeneratedDoc
from app.services.gstr_export import build_gstr_6a
from app.utils.storage import save_bytes

router = APIRouter(prefix="/generate", tags=["reports"], dependencies=[Depends(require_internal_token)])


@router.post("/gstr", response_model=GeneratedDoc)
async def generate_gstr(req: GstrExportRequest) -> GeneratedDoc:
    xlsx = build_gstr_6a(req.invoices)
    key = f"reports/gstr6a-{req.orgId}-{req.financialYear}.xlsx"
    url = save_bytes(key, xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return GeneratedDoc(url=url, storageKey=key)
