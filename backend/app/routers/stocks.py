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
        
        # Parse CSV
        df = pd.read_csv(temp_path)
        if 'symbol' not in df.columns:
            return {"success": False, "error": "CSV must have 'symbol' column"}
        
        symbols = []
        for _, row in df.iterrows():
            symbol = str(row['symbol']).strip()
            if not symbol.endswith('.NS'):
                symbol = f"{symbol}.NS"
            symbols.append(symbol)
            
            # Store metadata
            clean = symbol.replace('.NS', '')
            stock_metadata[clean] = {
                'name': row.get('name', clean) if 'name' in df.columns else clean,
                'sector': row.get('sector', 'Unknown') if 'sector' in df.columns else 'Unknown'
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
