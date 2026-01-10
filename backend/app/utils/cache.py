"""
Simple in-memory cache with TTL support
"""
import time
from typing import Optional, Any
from collections import OrderedDict


class TTLCache:
    """
    Time-To-Live cache implementation with LRU eviction
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Args:
            max_size: Maximum number of items in cache
            default_ttl: Default time-to-live in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: OrderedDict = OrderedDict()
        self.timestamps: dict = {}
        self.ttls: dict = {}
        self.hits = 0
        self.misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if expired/missing
        """
        if key not in self.cache:
            self.misses += 1
            return None
        
        # Check if expired
        timestamp = self.timestamps.get(key, 0)
        ttl = self.ttls.get(key, self.default_ttl)
        
        if time.time() - timestamp > ttl:
            # Expired, remove from cache
            self._remove(key)
            self.misses += 1
            return None
        
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        self.hits += 1
        return self.cache[key]
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Set value in cache with TTL
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        # Remove oldest if at capacity
        if len(self.cache) >= self.max_size and key not in self.cache:
            oldest_key = next(iter(self.cache))
            self._remove(oldest_key)
        
        self.cache[key] = value
        self.cache.move_to_end(key)
        self.timestamps[key] = time.time()
        self.ttls[key] = ttl if ttl is not None else self.default_ttl
    
    def _remove(self, key: str):
        """Remove key from all internal structures"""
        if key in self.cache:
            del self.cache[key]
        if key in self.timestamps:
            del self.timestamps[key]
        if key in self.ttls:
            del self.ttls[key]
    
    def clear(self):
        """Clear all cached items"""
        self.cache.clear()
        self.timestamps.clear()
        self.ttls.clear()
        self.hits = 0
        self.misses = 0
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total_requests
        }


# Global cache instances
stock_data_cache = TTLCache(max_size=500, default_ttl=60)  # 1 minute for stock data
history_cache = TTLCache(max_size=200, default_ttl=300)  # 5 minutes for historical data
ai_cache = TTLCache(max_size=100, default_ttl=600)  # 10 minutes for AI responses
