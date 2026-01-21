"""
Formatters Utility
Common formatting functions used across the application to avoid duplication.
"""
from typing import Optional

def ensure_suffix(symbol: str, suffix: str = ".NS") -> str:
    """
    Ensure the symbol ends with the given suffix.
    Useful for ensuring NSE stock symbols have .NS extension.
    """
    if not symbol:
        return symbol
    
    clean_symbol = symbol.strip()
    if not clean_symbol.endswith(suffix):
        return f"{clean_symbol}{suffix}"
    return clean_symbol

def remove_suffix(symbol: str, suffix: str = ".NS") -> str:
    """
    Remove the suffix from the symbol if present.
    Useful for displaying clean symbols to the UI.
    """
    if not symbol:
        return symbol
        
    clean_symbol = symbol.strip()
    if clean_symbol.endswith(suffix):
        return clean_symbol[:-len(suffix)]
    return clean_symbol
