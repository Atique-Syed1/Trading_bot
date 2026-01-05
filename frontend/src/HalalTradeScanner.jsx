import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ShieldCheck,
    Search,
    Filter,
    RefreshCw,
    Server,
    Wifi,
    WifiOff,
    Zap,
    TrendingUp,
    Target,
    BarChart2
} from 'lucide-react';

// Import components from subfolders
import { ConnectionStatus, ExportButton } from './components/common';
import { StockTable, StockDetailPanel, WatchlistPanel, WatchlistIndicator, CompareStocks } from './components/scanner';
import { TelegramSettings, TelegramButton, StockListSettings, StockListButton, AlertSettings } from './components/settings';
import { Portfolio } from './components/portfolio';

// Import hooks
import { useWatchlist, useLocalStorage } from './hooks/useLocalStorage';

// Import data utilities
import { generateMockData } from './data/stockData';

// Import API config
import API from './config/api';

/**
 * ====================================================================
 * MAIN APP COMPONENT
 * ====================================================================
 */
const HalalTradeApp = () => {
    // Core state
    const [useLiveMode, setUseLiveMode] = useState(false);
    const [stocks, setStocks] = useState([]);
    const [previousPrices, setPreviousPrices] = useState({});
    const [isScanning, setIsScanning] = useState(false);
    const [showHalalOnly, setShowHalalOnly] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [watchlistOpen, setWatchlistOpen] = useState(false);
    const [telegramOpen, setTelegramOpen] = useState(false);
    const [stockListOpen, setStockListOpen] = useState(false);
    const [portfolioOpen, setPortfolioOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [compareOpen, setCompareOpen] = useState(false);
    const [stockListInfo, setStockListInfo] = useState({ count: 25, name: 'Default' });

    // Telegram config from localStorage
    const [telegramConfig] = useLocalStorage('halaltrade_telegram', { enabled: false });

    // Fetch stock list info on mount
    useEffect(() => {
        const fetchStockList = async () => {
            try {
                const response = await fetch(API.STOCKS_LIST);
                const data = await response.json();
                setStockListInfo(data);
            } catch (err) {
                // Backend not available yet
            }
        };
        fetchStockList();
    }, []);

    // Watchlist hook
    const {
        watchlist,
        toggleWatchlist,
        isInWatchlist,
        removeFromWatchlist,
        clearWatchlist,
        watchlistCount
    } = useWatchlist();

    // WebSocket state
    const [wsConnected, setWsConnected] = useState(false);
    const [wsConnecting, setWsConnecting] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [priceUpdates, setPriceUpdates] = useState(0);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // WebSocket connection handler
    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setWsConnecting(true);
        setErrorMsg('');

        try {
            const ws = new WebSocket(API.WS_PRICES);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected to price stream');
                setWsConnected(true);
                setWsConnecting(false);
                setErrorMsg('');
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'initial') {
                        setStocks(message.data);
                        console.log('[WS] Received initial data:', message.data.length, 'stocks');
                    }
                    else if (message.type === 'price_update') {
                        setLastUpdate(message.timestamp);
                        setPriceUpdates(prev => prev + 1);

                        const newPreviousPrices = {};

                        setStocks(prevStocks => {
                            const updatedStocks = [...prevStocks];

                            message.data.forEach(update => {
                                const stockIndex = updatedStocks.findIndex(s => s.symbol === update.symbol);
                                if (stockIndex !== -1) {
                                    newPreviousPrices[update.symbol] = updatedStocks[stockIndex].price;
                                    updatedStocks[stockIndex] = {
                                        ...updatedStocks[stockIndex],
                                        price: update.price,
                                        priceChange: update.change,
                                        priceChangePercent: update.changePercent
                                    };
                                }
                            });

                            return updatedStocks;
                        });

                        setPreviousPrices(prev => ({ ...prev, ...newPreviousPrices }));

                        setSelectedStock(prev => {
                            if (!prev) return null;
                            const update = message.data.find(u => u.symbol === prev.symbol);
                            if (update) {
                                return { ...prev, price: update.price };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    console.error('[WS] Message parse error:', err);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Connection closed');
                setWsConnected(false);
                setWsConnecting(false);
                wsRef.current = null;

                if (useLiveMode) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[WS] Attempting reconnect...');
                        connectWebSocket();
                    }, 3000);
                }
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                setErrorMsg('WebSocket connection failed. Is the backend running?');
                setWsConnecting(false);
            };

        } catch (err) {
            console.error('[WS] Connection error:', err);
            setErrorMsg('Failed to connect to WebSocket');
            setWsConnecting(false);
        }
    }, [useLiveMode]);

    const disconnectWebSocket = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsConnected(false);
        setWsConnecting(false);
    }, []);

    // Handle mode toggle
    useEffect(() => {
        if (useLiveMode) {
            connectWebSocket();
        } else {
            disconnectWebSocket();
            setStocks(generateMockData());
            setPreviousPrices({});
        }

        return () => {
            disconnectWebSocket();
        };
    }, [useLiveMode, connectWebSocket, disconnectWebSocket]);

    const handleScan = async () => {
        setIsScanning(true);
        setErrorMsg('');
        setSelectedStock(null);

        if (useLiveMode) {
            try {
                const response = await fetch(API.SCAN);
                if (!response.ok) throw new Error('Failed to connect to Local Backend');

                const data = await response.json();
                setStocks(data);

                if (!wsConnected) {
                    connectWebSocket();
                }
            } catch (err) {
                console.error(err);
                setErrorMsg('Connection Failed: Is "trade_bot_backend.py" running?');
            } finally {
                setIsScanning(false);
            }
        } else {
            setTimeout(() => {
                setStocks(generateMockData());
                setIsScanning(false);
            }, 1000);
        }
    };

    // Filter stocks
    const displayedStocks = showHalalOnly
        ? stocks.filter(s => s.shariahStatus === 'Halal' || s.shariahStatus === 'Likely Halal')
        : stocks;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
            {/* HEADER */}
            <Header
                useLiveMode={useLiveMode}
                setUseLiveMode={setUseLiveMode}
                showHalalOnly={showHalalOnly}
                setShowHalalOnly={setShowHalalOnly}
                isScanning={isScanning}
                handleScan={handleScan}
                wsConnected={wsConnected}
                wsConnecting={wsConnecting}
                lastUpdate={lastUpdate}
                watchlistCount={watchlistCount}
                onOpenWatchlist={() => setWatchlistOpen(true)}
                telegramEnabled={telegramConfig.enabled}
                onOpenTelegram={() => setTelegramOpen(true)}
                stockListCount={stockListInfo.count}
                onOpenStockList={() => setStockListOpen(true)}
                onOpenPortfolio={() => setPortfolioOpen(true)}
                onOpenAlerts={() => setAlertOpen(true)}
                onOpenCompare={() => setCompareOpen(true)}
                stocks={stocks}
            />

            {/* ERROR MESSAGE */}
            {errorMsg && <ErrorBanner message={errorMsg} />}

            {/* STATS CARDS */}
            <StatsCards
                stocks={stocks}
                useLiveMode={useLiveMode}
                priceUpdates={priceUpdates}
            />

            {/* MAIN CONTENT */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <StockTable
                    stocks={displayedStocks}
                    selectedStock={selectedStock}
                    onSelectStock={setSelectedStock}
                    previousPrices={previousPrices}
                    useLiveMode={useLiveMode}
                    wsConnected={wsConnected}
                    isInWatchlist={isInWatchlist}
                    onToggleWatchlist={toggleWatchlist}
                />

                <div className="flex flex-col gap-4">
                    {selectedStock ? (
                        <StockDetailPanel
                            stock={selectedStock}
                            useLiveMode={useLiveMode}
                            wsConnected={wsConnected}
                        />
                    ) : (
                        <EmptyDetailPanel />
                    )}
                </div>
            </div>

            {/* WATCHLIST MODAL */}
            <WatchlistPanel
                isOpen={watchlistOpen}
                onClose={() => setWatchlistOpen(false)}
                watchlist={watchlist}
                stocks={stocks}
                onRemove={removeFromWatchlist}
                onSelectStock={setSelectedStock}
                onClear={clearWatchlist}
            />

            {/* TELEGRAM SETTINGS MODAL */}
            <TelegramSettings
                isOpen={telegramOpen}
                onClose={() => setTelegramOpen(false)}
            />

            {/* STOCK LIST SETTINGS MODAL */}
            <StockListSettings
                isOpen={stockListOpen}
                onClose={() => setStockListOpen(false)}
                onListChange={() => {
                    // Refresh stock list info
                    fetch(`${API_BASE}/api/stocks/list`)
                        .then(res => res.json())
                        .then(data => setStockListInfo(data));
                }}
            />

            {/* PORTFOLIO MODAL */}
            <Portfolio
                isOpen={portfolioOpen}
                onClose={() => setPortfolioOpen(false)}
            />

            {/* ALERTS MODAL */}
            <AlertSettings
                isOpen={alertOpen}
                onClose={() => setAlertOpen(false)}
            />

            {/* COMPARE MODAL */}
            <CompareStocks
                isOpen={compareOpen}
                onClose={() => setCompareOpen(false)}
                stocks={stocks}
            />
        </div>
    );
};

/**
 * Header Component
 */
const Header = ({
    useLiveMode, setUseLiveMode,
    showHalalOnly, setShowHalalOnly,
    isScanning, handleScan,
    wsConnected, wsConnecting, lastUpdate,
    watchlistCount, onOpenWatchlist,
    telegramEnabled, onOpenTelegram,
    stockListCount, onOpenStockList,
    onOpenPortfolio, onOpenAlerts, onOpenCompare,
    stocks
}) => (
    <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                HalalTrade Pro
            </h1>
            <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-400 text-sm">
                    {useLiveMode ? 'LIVE MARKET MODE' : 'SIMULATION MODE'}
                </p>
                {useLiveMode && (
                    <ConnectionStatus
                        isConnected={wsConnected}
                        isConnecting={wsConnecting}
                        lastUpdate={lastUpdate}
                    />
                )}
            </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
            {/* Stock List Button */}
            <StockListButton
                onClick={onOpenStockList}
                count={stockListCount}
            />

            {/* Alerts Button */}
            <button
                onClick={onOpenAlerts}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
            >
                <div className="md:hidden">🔔</div>
                <span className="hidden md:inline">Alerts</span>
            </button>

            <button
                onClick={onOpenCompare}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
            >
                <div className="md:hidden">⚖️</div>
                <span className="hidden md:inline">Compare</span>
            </button>

            {/* Portfolio Button */}
            <button
                onClick={onOpenPortfolio}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
            >
                <div className="md:hidden">💼</div>
                <span className="hidden md:inline">Portfolio</span>
            </button>

            {/* Telegram Button */}
            <TelegramButton
                onClick={onOpenTelegram}
                isEnabled={telegramEnabled}
            />

            {/* Watchlist Button */}
            <WatchlistIndicator
                count={watchlistCount}
                onClick={onOpenWatchlist}
            />

            {/* Export Button */}
            <ExportButton stocks={stocks} type="scan" />

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
                <button
                    onClick={() => setUseLiveMode(false)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${!useLiveMode ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Server className="w-3 h-3" /> Simulation
                </button>
                <button
                    onClick={() => setUseLiveMode(true)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${useLiveMode ? 'bg-red-600 text-white animate-pulse' : 'text-gray-400 hover:text-white'}`}
                >
                    <Wifi className="w-3 h-3" /> LIVE MODE
                </button>
            </div>

            {/* Filter Toggle */}
            <button
                onClick={() => setShowHalalOnly(!showHalalOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showHalalOnly
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
            >
                <Filter className="w-4 h-4" />
                {showHalalOnly ? 'Halal Only' : 'Show All'}
            </button>

            {/* Scan Button */}
            <button
                onClick={handleScan}
                disabled={isScanning}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${useLiveMode ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'}`}
            >
                {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isScanning ? 'Scanning...' : useLiveMode ? 'Scan Live' : 'Scan'}
            </button>
        </div>
    </div>
);

/**
 * Error Banner
 */
const ErrorBanner = ({ message }) => (
    <div className="max-w-7xl mx-auto mb-6 bg-red-900/30 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200">
        <WifiOff className="w-5 h-5" />
        <div>
            <p className="font-bold">Connection Error</p>
            <p className="text-sm">{message}</p>
            <p className="text-xs mt-1 text-red-300">To use Live Mode, you must run `trade_bot_backend.py` locally on port 8000.</p>
        </div>
    </div>
);

/**
 * Stats Cards
 */
const StatsCards = ({ stocks, useLiveMode, priceUpdates }) => (
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
            label="Total Scanned"
            value={stocks.length}
            icon={<BarChart2 className="w-4 h-4" />}
        />
        <StatCard
            label="Halal Compliant"
            value={stocks.filter(s => s.shariahStatus === 'Halal').length}
            color="emerald"
            icon={<ShieldCheck className="w-4 h-4" />}
        />
        <StatCard
            label="Buy Signals"
            value={stocks.filter(s => s.technicals.signal === 'Buy' && s.shariahStatus === 'Halal').length}
            color="blue"
            icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
            label="Avg Potential"
            value={stocks.length > 0 ? '3.2%' : '0%'}
            color="yellow"
            icon={<Target className="w-4 h-4" />}
        />
        {useLiveMode && (
            <div className="stat-card card-hover group">
                <p className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-yellow-400 animate-pulse" /> Live Updates
                </p>
                <p className="text-2xl font-bold text-yellow-400 group-hover:scale-105 transition-transform">
                    {priceUpdates}
                </p>
            </div>
        )}
    </div>
);

const StatCard = ({ label, value, color = 'gray', icon }) => {
    const colorClasses = {
        gray: 'text-white',
        emerald: 'text-emerald-400',
        blue: 'text-blue-400',
        yellow: 'text-yellow-400',
        red: 'text-red-400'
    };

    const borderClasses = {
        gray: 'group-hover:border-gray-600',
        emerald: 'group-hover:border-emerald-600/50',
        blue: 'group-hover:border-blue-600/50',
        yellow: 'group-hover:border-yellow-600/50',
        red: 'group-hover:border-red-600/50'
    };

    return (
        <div className={`stat-card card-hover group ${borderClasses[color]}`}>
            <p className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1">
                {icon} {label}
            </p>
            <p className={`text-2xl font-bold ${colorClasses[color]} group-hover:scale-105 transition-transform`}>
                {value}
            </p>
        </div>
    );
};

/**
 * Empty Detail Panel
 */
const EmptyDetailPanel = () => (
    <div className="glass-card rounded-xl p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 opacity-30" />
        </div>
        <p className="text-gray-400 font-medium">Select a stock</p>
        <p className="text-sm text-gray-500 mt-1">View detailed Shariah & Technical Report</p>
    </div>
);

export default HalalTradeApp;