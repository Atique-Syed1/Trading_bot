from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from ..services import alert_service

router = APIRouter(
    prefix="/api/alerts",
    tags=["alerts"]
)

class AlertCreate(BaseModel):
    symbol: str
    condition: str
    price: float

@router.get("/")
async def get_alerts():
    return alert_service.get_alerts()

@router.post("/")
async def create_alert(alert: AlertCreate):
    new_alert = alert_service.Alert(
        id="",
        symbol=alert.symbol,
        condition=alert.condition,
        price=alert.price
    )
    return alert_service.add_alert(new_alert)

@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    alert_service.delete_alert(alert_id)
    return {"success": True}
