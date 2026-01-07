/**
 * API Configuration
 * Centralized API URL management
 */

// Use environment variable in production, fallback to localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const API = {
    // Base URLs
    BASE: API_BASE,
    WS: WS_BASE,

    // Scan endpoints
    SCAN: `${API_BASE}/api/scan`,
    STOCK: (symbol) => `${API_BASE}/api/stock/${symbol}`,

    // Stock list endpoints
    STOCKS_LIST: `${API_BASE}/api/stocks/list`,
    STOCKS_UPLOAD: `${API_BASE}/api/stocks/upload`,
    STOCKS_RESET: `${API_BASE}/api/stocks/reset`,
    STOCKS_CUSTOM: `${API_BASE}/api/stocks/custom`,

    // Backtest endpoints
    BACKTEST: `${API_BASE}/api/backtest`,
    QUICK_BACKTEST: (symbol) => `${API_BASE}/api/backtest/${symbol}`,
    STRATEGIES: `${API_BASE}/api/strategies`,

    // Telegram endpoints
    TELEGRAM_CONFIG: `${API_BASE}/api/telegram/config`,
    TELEGRAM_TEST: `${API_BASE}/api/telegram/test`,
    TELEGRAM_ALERT: (symbol) => `${API_BASE}/api/telegram/alert/${symbol}`,

    // Portfolio endpoints
    PORTFOLIO: `${API_BASE}/api/portfolio`,
    PORTFOLIO_TRANSACTION: `${API_BASE}/api/portfolio/transaction`,
    PORTFOLIO_DELETE_TRANSACTION: (id) => `${API_BASE}/api/portfolio/transaction/${id}`,
    PORTFOLIO_TRANSACTIONS: `${API_BASE}/api/portfolio/transactions`,

    // News
    NEWS: (symbol) => `${API_BASE}/api/news/${symbol}`,

    // Alerts
    ALERTS: `${API_BASE}/api/alerts`,
    ALERT_ITEM: (id) => `${API_BASE}/api/alerts/${id}`,

    // AI
    AI_ANALYZE: (symbol) => `${API_BASE}/api/ai/analyze/${symbol}`,

    // Watchlist
    WATCHLIST: `${API_BASE}/api/watchlist`,
    WATCHLIST_ITEM: (symbol) => `${API_BASE}/api/watchlist/${symbol}`,


    // Health check
    HEALTH: `${API_BASE}/api/health`,

    // WebSocket
    WS_PRICES: `${WS_BASE}/ws/prices`,
};

export default API;
