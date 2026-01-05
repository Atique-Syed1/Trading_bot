from fastapi import APIRouter
from ..services import ai_service

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"]
)

@router.get("/analyze/{symbol}")
async def analyze_stock(symbol: str):
    return await ai_service.analyze_stock(symbol)
