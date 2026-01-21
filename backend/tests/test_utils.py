import io
import pytest
from app.utils.formatters import ensure_suffix, remove_suffix
from app.utils.csv_helper import parse_stock_csv

def test_ensure_suffix():
    assert ensure_suffix("RELIANCE") == "RELIANCE.NS"
    assert ensure_suffix("TCS.NS") == "TCS.NS"
    assert ensure_suffix("INFY ", ".NS") == "INFY.NS"
    assert ensure_suffix("") == ""

def test_remove_suffix():
    assert remove_suffix("RELIANCE.NS") == "RELIANCE"
    assert remove_suffix("TCS") == "TCS"
    assert remove_suffix("INFY.NS ", ".NS") == "INFY"
    assert remove_suffix("") == ""

def test_parse_stock_csv_valid():
    csv_content = b"symbol,name,sector\nRELIANCE,Reliance Ind,Energy\nTCS.NS,Tata Consultancy,IT"
    result = parse_stock_csv(csv_content)
    
    assert len(result) == 2
    assert result[0]['symbol'] == "RELIANCE.NS"
    assert result[0]['clean_symbol'] == "RELIANCE"
    assert result[1]['symbol'] == "TCS.NS"

def test_parse_stock_csv_missing_column():
    csv_content = b"name,sector\nReliance,Energy"
    with pytest.raises(ValueError, match="must have 'symbol' column"):
        parse_stock_csv(csv_content)

def test_parse_stock_csv_empty_rows():
    csv_content = b"symbol\n\n  \nRELIANCE"
    result = parse_stock_csv(csv_content)
    assert len(result) == 1
    assert result[0]['clean_symbol'] == "RELIANCE"
