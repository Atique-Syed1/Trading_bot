import yfinance as yf
from typing import List, Dict

async def get_stock_news(symbol: str) -> List[Dict]:
    """
    Fetch news for a specific stock using yfinance
    """
    try:
        # ticker.news returns a list of dicts
        # [{'uuid': '...', 'title': '...', 'publisher': '...', 'link': '...', 'providerPublishTime': ...}]
        ticker = yf.Ticker(symbol)
        news_items = ticker.news
        
        results = []
        if news_items:
            for item in news_items:
                # Handle new yfinance structure (nested content)
                content = item.get('content', item)
                
                # Title
                title = content.get('title', item.get('title', 'No Title'))
                
                # Link
                link = '#'
                if 'clickThroughUrl' in content and content['clickThroughUrl']:
                    link = content['clickThroughUrl'].get('url', '#')
                else:
                    link = item.get('link', '#')

                # Date
                date_str = "Unknown Date"
                try:
                    # providerPublishTime is usually top level
                    pub_time = item.get('providerPublishTime')
                    if not pub_time and 'pubDate' in content:
                        from dateutil import parser
                        dt = parser.parse(content['pubDate'])
                        date_str = dt.strftime('%Y-%m-%d %H:%M')
                    elif pub_time:
                         from datetime import datetime
                         date_str = datetime.fromtimestamp(pub_time).strftime('%Y-%m-%d %H:%M')
                except:
                    pass

                # Thumbnail
                thumbnail = None
                thumb_data = content.get('thumbnail', item.get('thumbnail'))
                if thumb_data and 'resolutions' in thumb_data:
                    res = thumb_data['resolutions']
                    if res:
                        thumbnail = res[0]['url']
                
                results.append({
                    "id": item.get('id', item.get('uuid', str(title))),
                    "title": title,
                    "publisher": "Yahoo Finance", # Publisher often missing in new struct
                    "link": link,
                    "date": date_str,
                    "thumbnail": thumbnail,
                    "type": "News"
                })
        
        return results
        
    except Exception as e:
        print(f"[News] Error fetching for {symbol}: {e}")
        return []

async def get_market_news() -> List[Dict]:
    """
    Get general market news (using a major index like ^NSEI or just generic search)
    """
    return await get_stock_news("^NSEI")
