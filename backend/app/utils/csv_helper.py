"""
CSV Helper Utility
Common logic for parsing and validating stock CSV files.
"""
import pandas as pd
from typing import List, Dict, Optional, Union, BinaryIO
from io import BytesIO
from .formatters import ensure_suffix, remove_suffix

def parse_stock_csv(file_input: Union[str, BinaryIO, bytes]) -> List[Dict]:
    """
    Parse a CSV file containing stock symbols and return a list of stock data.
    
    Args:
        file_input: File path (str), file object, or bytes content
        
    Returns:
        List[Dict]: List of dicts with 'symbol', 'name', 'sector' keys
        
    Raises:
        ValueError: If 'symbol' column is missing or file is invalid
    """
    try:
        # Handle bytes input (e.g. from UploadFile)
        if isinstance(file_input, bytes):
            file_input = BytesIO(file_input)
            
        df = pd.read_csv(file_input)
        
        # Normalize column names to lowercase for robust checking
        # But keep original for data extraction if needed, or just map standard ones
        df.columns = [c.strip().lower() for c in df.columns]
        
        if 'symbol' not in df.columns:
            raise ValueError("CSV must have 'symbol' column")
            
        results = []
        for _, row in df.iterrows():
            raw_symbol = str(row['symbol']).strip()
            if not raw_symbol or raw_symbol.lower() == 'nan':
                continue
                
            formatted_symbol = ensure_suffix(raw_symbol)
            clean_symbol = remove_suffix(formatted_symbol)
            
            # Extract optional fields with defaults
            name = row.get('name', clean_symbol)
            if pd.isna(name): name = clean_symbol
            
            sector = row.get('sector', 'Unknown')
            if pd.isna(sector): sector = 'Unknown'
            
            results.append({
                'symbol': formatted_symbol,
                'clean_symbol': clean_symbol,
                'name': name,
                'sector': sector
            })
            
        return results
        
    except Exception as e:
        # Re-raise explicit ValueErrors, wrap others
        if isinstance(e, ValueError):
            raise e
        raise ValueError(f"Failed to parse CSV: {str(e)}")
