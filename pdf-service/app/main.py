"""Crossbill PDF + report service (FastAPI).

Renders export-invoice PDFs (WeasyPrint) and assembles GSTR-1 6A files (pandas).
Internal-only: every /generate route requires the shared internal service token (design §9).
"""
from fastapi import FastAPI
from app.routers import invoices, reports

app = FastAPI(title="Crossbill PDF Service", version="1.0.0")

app.include_router(invoices.router)
app.include_router(reports.router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
