"""
Stocks Router - Stock list management endpoints
"""
import pandas as pd
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional

from ..services.stock_service import (
    get_stock_list_info,
    set_stock_list,
    reset_stock_list,
    get_stock_history,
    stock_metadata,
    active_stock_list
)
from ..config import DEFAULT_STOCKS

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


class CustomStockList(BaseModel):
    name: str
    symbols: List[str]


@router.get("/list")
def get_stock_list():
    """Get current active stock list"""
    return get_stock_list_info()

@router.get("/history/{symbol}")
def get_stock_history_endpoint(symbol: str, period: str = "1y"):
    """Get historical OHLC data for a stock"""
    data = get_stock_history(symbol, period)
    if not data:
        return {"error": "Data not found"}
    return data


@router.post("/upload")
async def upload_stock_csv(file: UploadFile = File(...)):
    """Upload a CSV file with stock symbols"""
    try:
        contents = await file.read()
        
        # Save temporarily
        temp_path = "uploaded_stocks.csv"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # Parse CSV using helper
        from ..utils.csv_helper import parse_stock_csv
        try:
            stock_data_list = parse_stock_csv(temp_path)
        except ValueError as e:
            return {"success": False, "error": str(e)}
        
        symbols = []
        for item in stock_data_list:
            symbols.append(item['symbol'])
            
            # Store metadata
            stock_metadata[item['clean_symbol']] = {
                'name': item['name'],
                'sector': item['sector']
            }
        
        if symbols:
            set_stock_list(file.filename or "Uploaded", symbols, "csv_upload")
            return {
                "success": True,
                "name": file.filename,
                "count": len(symbols)
            }
        
        return {"success": False, "error": "No valid symbols found"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/reset")
def reset_to_default():
    """Reset stock list to defaults"""
    reset_stock_list()
    return {
        "success": True,
        "name": "Default Watchlist",
        "count": len(DEFAULT_STOCKS)
    }


@router.post("/custom")
def set_custom_stocks(data: CustomStockList):
    """Set a custom stock list"""
    set_stock_list(data.name, data.symbols, "custom")
    return {
        "success": True,
        "name": data.name,
        "count": len(data.symbols)
    }
