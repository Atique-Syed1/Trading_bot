from fastapi import APIRouter
from typing import List
from ..services import news_service

router = APIRouter(
    prefix="/api/news",
    tags=["news"]
)

@router.get("/market")
async def get_market_news():
    return await news_service.get_market_news()

@router.get("/{symbol}")
async def get_stock_news(symbol: str):
    return await news_service.get_stock_news(symbol)
