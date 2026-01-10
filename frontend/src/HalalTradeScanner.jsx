import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
    BarChart2,
    Moon,
    Sun,
    LayoutDashboard,
    ScanLine
} from 'lucide-react';

// Import components from subfolders
import { ConnectionStatus, ExportButton, PWAInstallPrompt, NotificationToggle, PageLoadingSkeleton, ModalSkeleton } from './components/common';
import ErrorBoundary from './components/common/ErrorBoundary';
import { StockTable, WatchlistPanel, WatchlistIndicator } from './components/scanner';

// Lazy load heavy components for code splitting
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const StockDetailPanel = lazy(() => import('./components/scanner/StockDetailPanel'));
const CompareStocks = lazy(() => import('./components/scanner/CompareStocks'));
const TelegramSettings = lazy(() => import('./components/settings/TelegramSettings'));
const StockListSettings = lazy(() => import('./components/settings/StockListSettings'));
const AlertSettings = lazy(() => import('./components/settings/AlertSettings'));
const Portfolio = lazy(() => import('./components/portfolio/Portfolio'));

// Import non-lazy settings buttons (small components - direct import)
const TelegramButton = lazy(() => import('./components/settings/TelegramSettings').then(m => ({ default: m.TelegramButton })));
const StockListButton = lazy(() => import('./components/settings/StockListSettings').then(m => ({ default: m.StockListButton })));

// Import hooks
import { useWatchlist } from './hooks/useWatchlist';
import { useLocalStorage } from './hooks/useLocalStorage';


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

    // Navigation & Theme state
    const [activeTab, setActiveTab] = useLocalStorage('halaltrade-tab', 'dashboard');
    const [darkMode, setDarkMode] = useLocalStorage('halaltrade-darkmode', true);

    // UI state
    const [watchlistOpen, setWatchlistOpen] = useState(false);
    const [telegramOpen, setTelegramOpen] = useState(false);
    const [stockListOpen, setStockListOpen] = useState(false);
    const [portfolioOpen, setPortfolioOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [compareOpen, setCompareOpen] = useState(false);

    // Data state
    const [universeInfo, setUniverseInfo] = useState({ count: 25, name: 'Default' });
    const [telegramEnabled, setTelegramEnabled] = useState(false);

    // Apply dark/light mode to document
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.remove('light-mode');
        } else {
            document.documentElement.classList.add('light-mode');
        }
    }, [darkMode]);



    // Fetch basic info on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch stock list info
                const stockRes = await fetch(API.STOCKS_LIST);
                const stockData = await stockRes.json();
                setUniverseInfo(stockData);

                // Fetch telegram status
                const tgRes = await fetch(API.TELEGRAM_CONFIG);
                const tgData = await tgRes.json();
                setTelegramEnabled(tgData.enabled && tgData.configured);
            } catch (err) {
                console.error("Failed to fetch initial data", err);
            }
        };
        fetchInitialData();
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

                            // Defensive: Ensure data is array
                            if (Array.isArray(message.data)) {
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
                            }

                            return updatedStocks;
                        });

                        setPreviousPrices(prev => ({ ...prev, ...newPreviousPrices }));

                        setSelectedStock(prev => {
                            if (!prev) return null;
                            // Defensive: Ensure data is array
                            if (Array.isArray(message.data)) {
                                const update = message.data.find(u => u.symbol === prev.symbol);
                                if (update) {
                                    return { ...prev, price: update.price };
                                }
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
        <div className={`min-h-screen bg-gray-900 text-gray-100 font-sans`}>
            {/* TOP NAVIGATION BAR */}
            <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* LOGO & TABS */}
                        <div className="flex items-center gap-8">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-2">
                                <ShieldCheck className="w-7 h-7 text-emerald-400" />
                                HalalTrade Pro
                            </h1>
                            
                            {/* Navigation Tabs */}
                            <div className="hidden md:flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                        activeTab === 'dashboard'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }`}
                                >
                                    <LayoutDashboard size={16} />
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => setActiveTab('scanner')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                        activeTab === 'scanner'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }`}
                                >
                                    <ScanLine size={16} />
                                    Scanner
                                </button>
                            </div>
                        </div>

                        {/* RIGHT SIDE CONTROLS */}
                        <div className="flex items-center gap-3">
                            {/* Live Mode Badge */}
                            {useLiveMode && wsConnected && (
                                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                                    <Wifi className="w-3 h-3 animate-pulse" />
                                    Live
                                </div>
                            )}

                            {/* Notification Toggle */}
                            <NotificationToggle />

                            {/* Dark Mode Toggle */}
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>

                            {/* Mobile Tabs */}
                            <div className="flex md:hidden items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className={`p-2 rounded-md transition-all ${
                                        activeTab === 'dashboard'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'text-gray-400'
                                    }`}
                                >
                                    <LayoutDashboard size={18} />
                                </button>
                                <button
                                    onClick={() => setActiveTab('scanner')}
                                    className={`p-2 rounded-md transition-all ${
                                        activeTab === 'scanner'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'text-gray-400'
                                    }`}
                                >
                                    <ScanLine size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* MAIN CONTENT */}
            <main className="p-4 md:p-8">
                {activeTab === 'dashboard' ? (
                    <div className="max-w-7xl mx-auto">
                        <ErrorBoundary>
                            <Suspense fallback={<PageLoadingSkeleton />}>
                                <Dashboard onNavigateToScanner={() => setActiveTab('scanner')} />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                ) : (
                    <>
                        {/* SCANNER HEADER */}
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
                            telegramEnabled={telegramEnabled}
                            onOpenTelegram={() => setTelegramOpen(true)}

                            stockListCount={universeInfo.count}
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
                                    <ErrorBoundary>
                                        <Suspense fallback={<PageLoadingSkeleton />}>
                                            <StockDetailPanel
                                                stock={selectedStock}
                                                useLiveMode={useLiveMode}
                                                wsConnected={wsConnected}
                                            />
                                        </Suspense>
                                    </ErrorBoundary>
                                ) : (
                                    <EmptyDetailPanel />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

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

            {/* TELEGRAM SETTINGS MODAL - Lazy loaded */}
            {telegramOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <TelegramSettings
                        isOpen={telegramOpen}
                        onClose={() => setTelegramOpen(false)}
                    />
                </Suspense>
            )}

            {/* STOCK LIST SETTINGS MODAL - Lazy loaded */}
            {stockListOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <StockListSettings
                        isOpen={stockListOpen}
                        onClose={() => setStockListOpen(false)}
                        onListChange={async () => {
                            try {
                                const res = await fetch(API.STOCKS_LIST);
                                const data = await res.json();
                                setUniverseInfo(data);
                            } catch (err) {
                                console.error("Failed to refresh stock list info", err);
                            }
                        }}
                    />
                </Suspense>
            )}

            {/* PORTFOLIO MODAL - Lazy loaded */}
            {portfolioOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <Portfolio
                        isOpen={portfolioOpen}
                        onClose={() => setPortfolioOpen(false)}
                    />
                </Suspense>
            )}

            {/* ALERTS MODAL - Lazy loaded */}
            {alertOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <AlertSettings
                        isOpen={alertOpen}
                        onClose={() => setAlertOpen(false)}
                    />
                </Suspense>
            )}

            {/* COMPARE MODAL - Lazy loaded */}
            {compareOpen && (
                <Suspense fallback={<ModalSkeleton />}>
                    <CompareStocks
                        isOpen={compareOpen}
                        onClose={() => setCompareOpen(false)}
                        stocks={stocks}
                    />
                </Suspense>
            )}

            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
        </div>
    );
};

/**
 * Header Component (Scanner Tab Only)
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
    <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6 p-1">
            {/* BRANDING SECTION */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-3">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                        HalalTrade Pro
                    </h1>
                    <div className="flex items-center gap-2 mt-2 ml-1">
                        {useLiveMode ? (
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${wsConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                                <Wifi className={`w-3 h-3 ${wsConnected ? 'animate-pulse' : ''}`} />
                                {wsConnected ? 'Live Market Active' : 'Connecting...'}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider border bg-gray-700/30 border-gray-600 text-gray-400">
                                <Server className="w-3 h-3" />
                                Simulation Mode
                            </div>
                        )}
                        {useLiveMode && wsConnected && (
                            <span className="text-[10px] text-gray-500 font-mono">
                                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ACTION TOOLBAR */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-gray-800/40 p-2 rounded-2xl border border-gray-700/50 backdrop-blur-sm">

                {/* GROUP 1: NAVIGATION */}
                <div className="flex items-center gap-2 pr-4 md:border-r border-gray-700/50">
                    <button
                        onClick={onOpenPortfolio}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all text-gray-400 hover:text-white hover:bg-gray-700/50"
                    >
                        <div className="md:hidden">💼</div>
                        <span className="hidden md:inline">Portfolio</span>
                    </button>

                    <WatchlistIndicator
                        count={watchlistCount}
                        onClick={onOpenWatchlist}
                    />
                </div>

                {/* GROUP 2: TOOLS */}
                <div className="flex items-center gap-2 pr-4 md:border-r border-gray-700/50">
                    <StockListButton
                        onClick={onOpenStockList}
                        count={stockListCount}
                    />

                    <button
                        onClick={onOpenCompare}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all tooltip"
                        title="Compare Stocks"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M21 3l-7 7" /><path d="M21 21v-5h-5" /><path d="M21 21l-7-7" /><path d="M3 21h5v-5" /><path d="M3 21l7-7" /><path d="M3 3h5v5" /><path d="M3 3l7 7" /></svg>
                    </button>

                    <button
                        onClick={onOpenAlerts}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all tooltip"
                        title="Alerts"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                    </button>

                    <TelegramButton
                        onClick={onOpenTelegram}
                        isEnabled={telegramEnabled}
                    />

                    <ExportButton stocks={stocks} type="scan" />
                </div>

                {/* GROUP 3: SYSTEM & PRIMARY ACTION */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="flex items-center bg-gray-900/50 rounded-lg p-1 border border-gray-700/50">
                        <button
                            onClick={() => setUseLiveMode(false)}
                            className={`p-1.5 rounded-md transition-all ${!useLiveMode ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Simulation Mode"
                        >
                            <Server className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setUseLiveMode(true)}
                            className={`p-1.5 rounded-md transition-all ${useLiveMode ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Live Mode"
                        >
                            <Wifi className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowHalalOnly(!showHalalOnly)}
                        className={`p-2 rounded-lg transition-all border ${showHalalOnly
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                            : 'border-transparent text-gray-400 hover:bg-gray-700/50'}`}
                        title={showHalalOnly ? "Showing Halal Only" : "Filter Halal"}
                    >
                        <Filter className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${useLiveMode
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-900/20'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-900/20'
                            }`}
                    >
                        {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        <span>{isScanning ? 'Scanning...' : 'Scan Market'}</span>
                    </button>
                </div>
            </div>
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