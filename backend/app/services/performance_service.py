"""
Performance Monitoring Service
Track API endpoint performance and slow queries
"""
import time
from typing import Dict, List
from datetime import datetime, timedelta
from collections import defaultdict, deque


class PerformanceTracker:
    """Track API performance metrics"""
    
    def __init__(self, max_samples: int = 1000):
        self.max_samples = max_samples
        self.endpoint_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_samples))
        self.slow_queries: deque = deque(maxlen=100)
        self.error_count: Dict[str, int] = defaultdict(int)
        
    def record_request(self, endpoint: str, duration_ms: float, status_code: int):
        """Record a request's performance"""
        self.endpoint_metrics[endpoint].append({
            'duration_ms': duration_ms,
            'status_code': status_code,
            'timestamp': datetime.utcnow()
        })
        
        # Track slow queries (>1000ms)
        if duration_ms > 1000:
            self.slow_queries.append({
                'endpoint': endpoint,
                'duration_ms': duration_ms,
                'timestamp': datetime.utcnow()
            })
        
        # Track errors
        if status_code >= 400:
            self.error_count[endpoint] += 1
    
    def get_endpoint_stats(self, endpoint: str) -> Dict:
        """Get statistics for a specific endpoint"""
        metrics = list(self.endpoint_metrics[endpoint])
        if not metrics:
            return {
                'endpoint': endpoint,
                'sample_count': 0,
                'avg_duration_ms': 0,
                'min_duration_ms': 0,
                'max_duration_ms': 0,
                'p50_duration_ms': 0,
                'p95_duration_ms': 0,
                'p99_duration_ms': 0,
                'error_count': 0,
                'error_rate': 0
            }
        
        durations = sorted([m['duration_ms'] for m in metrics])
        total_requests = len(metrics)
        
        def percentile(data, p):
            k = (len(data) - 1) * p
            f = int(k)
            c = f + 1
            if c >= len(data):
                return data[-1]
            d0 = data[f] * (c - k)
            d1 = data[c] * (k - f)
            return d0 + d1
        
        return {
            'endpoint': endpoint,
            'sample_count': total_requests,
            'avg_duration_ms': sum(durations) / len(durations),
            'min_duration_ms': min(durations),
            'max_duration_ms': max(durations),
            'p50_duration_ms': percentile(durations, 0.50),
            'p95_duration_ms': percentile(durations, 0.95),
            'p99_duration_ms': percentile(durations, 0.99),
            'error_count': self.error_count.get(endpoint, 0),
            'error_rate': self.error_count.get(endpoint, 0) / total_requests * 100
        }
    
    def get_all_stats(self) -> List[Dict]:
        """Get statistics for all endpoints"""
        return [
            self.get_endpoint_stats(endpoint)
            for endpoint in self.endpoint_metrics.keys()
        ]
    
    def get_slow_queries(self, limit: int = 20) -> List[Dict]:
        """Get recent slow queries"""
        return list(self.slow_queries)[-limit:]
    
    def get_top_slow_endpoints(self, limit: int = 10) -> List[Dict]:
        """Get endpoints with highest average response time"""
        stats = self.get_all_stats()
        return sorted(stats, key=lambda x: x['avg_duration_ms'], reverse=True)[:limit]
    
    def get_error_summary(self) -> Dict:
        """Get error summary across all endpoints"""
        total_errors = sum(self.error_count.values())
        return {
            'total_errors': total_errors,
            'endpoints_with_errors': len(self.error_count),
            'top_error_endpoints': sorted(
                [{'endpoint': k, 'error_count': v} for k, v in self.error_count.items()],
                key=lambda x: x['error_count'],
                reverse=True
            )[:10]
        }
    
    def reset_stats(self):
        """Reset all statistics"""
        self.endpoint_metrics.clear()
        self.slow_queries.clear()
        self.error_count.clear()


# Global performance tracker instance
performance_tracker = PerformanceTracker()
