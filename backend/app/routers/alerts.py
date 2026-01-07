from fastapi import APIRouter, Depends
from typing import List
from sqlmodel import Session
from ..services import alert_service
from ..database import get_session

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"]
)

@router.get("")
async def get_alerts(session: Session = Depends(get_session)):
    return alert_service.get_alerts(session)

@router.post("")
async def create_alert(alert: alert_service.AlertCreate, session: Session = Depends(get_session)):
    return alert_service.add_alert(alert, session)

@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, session: Session = Depends(get_session)):
    alert_service.delete_alert(alert_id, session)
    return {"success": True}
