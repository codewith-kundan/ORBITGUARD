from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.models.base import get_db
from backend.app.models.conjunction import Conjunction
from backend.app.schemas.compliance import (
    CDMPreviewResponse,
    WebhookDispatchRequest,
    WebhookDispatchResponse
)
from backend.app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/api/compliance", tags=["Aerospace Standards Compliance & Dispatcher"])

@router.get("/cdm/{conjunction_id}", response_model=CDMPreviewResponse)
def get_conjunction_data_message(
    conjunction_id: int = Path(..., description="ID of the conjunction event"),
    db: Session = Depends(get_db)
):
    """
    Generates official CCSDS 508.0-B-1 (Blue Book) Conjunction Data Message (CDM)
    in both Key-Value Notation (KVN) and XML schema formats.
    """
    conjunction = db.query(Conjunction).filter(Conjunction.id == conjunction_id).first()
    if not conjunction:
        raise HTTPException(status_code=404, detail=f"Conjunction #{conjunction_id} not found")

    return ComplianceService.generate_cdm(conjunction, db)

@router.get("/cdm/{conjunction_id}/download")
def download_conjunction_data_message(
    conjunction_id: int = Path(..., description="ID of the conjunction event"),
    format: str = Query("kvn", pattern="^(kvn|xml)$", description="Format: 'kvn' or 'xml'"),
    db: Session = Depends(get_db)
):
    """
    Downloads formal CCSDS CDM file as `.cdm` (KVN plain text) or `.xml`.
    """
    conjunction = db.query(Conjunction).filter(Conjunction.id == conjunction_id).first()
    if not conjunction:
        raise HTTPException(status_code=404, detail=f"Conjunction #{conjunction_id} not found")

    cdm = ComplianceService.generate_cdm(conjunction, db)

    if format == "xml":
        media_type = "application/xml"
        filename = f"ORBITGUARD_{cdm.message_id}.xml"
        content = cdm.xml_content
    else:
        media_type = "text/plain"
        filename = f"ORBITGUARD_{cdm.message_id}.cdm"
        content = cdm.kvn_content

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/dispatch/webhook", response_model=WebhookDispatchResponse)
async def dispatch_conjunction_webhook(
    payload: WebhookDispatchRequest,
    db: Session = Depends(get_db)
):
    """
    Dispatches automated webhook alert payload to external satellite operator / mission control.
    """
    return await ComplianceService.dispatch_webhook(payload, db)
