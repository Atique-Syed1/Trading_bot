import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    AlertTriangle,
    Filter,
    RefreshCw,
    Info,
    Server,
    Wifi,
    WifiOff
} from 'lucide-react';

/**
 * ====================================================================
 * HALAL & TECHNICAL LOGIC ENGINE
 * ====================================================================
 */

// --- 1. Shariah Screening Constants (AAOIFI) ---
const MAX_DEBT_RATIO = 0.30;
const MAX_CASH_RATIO = 0.30;
const PROHIBITED_SECTORS = [
    'Banking', 'Finance', 'Insurance', 'Alcohol',
    'Tobacco', 'Gambling', 'Pork', 'Defense', 'Entertainment'
];

// --- 2. Mock Data Generator (Fallback when backend is off) ---
const SECTOR_DATABASE = {
    'RELIANCE': { name: 'Reliance Industries', sector: 'Oil & Gas', debt: 0.24, cash: 0.05 },
    'TCS': { name: 'Tata Consultancy Svcs', sector: 'Technology', debt: 0.00, cash: 0.15 },
    'HDFCBANK': { name: 'HDFC Bank', sector: 'Banking', debt: 0.85, cash: 0.10 },
    'INFY': { name: 'Infosys', sector: 'Technology', debt: 0.01, cash: 0.12 },
    'ITC': { name: 'ITC Ltd', sector: 'Tobacco', debt: 0.00, cash: 0.18 },
    'HINDUNILVR': { name: 'Hindustan Unilever', sector: 'Consumer Goods', debt: 0.01, cash: 0.08 },
    'BAJFINANCE': { name: 'Bajaj Finance', sector: 'Finance', debt: 0.75, cash: 0.05 },
    'ASIANPAINT': { name: 'Asian Paints', sector: 'Consumer Goods', debt: 0.02, cash: 0.06 },
    'MARUTI': { name: 'Maruti Suzuki', sector: 'Automotive', debt: 0.01, cash: 0.25 },
    'TITAN': { name: 'Titan Company', sector: 'Consumer Goods', debt: 0.12, cash: 0.04 },
    'SUNPHARMA': { name: 'Sun Pharma', sector: 'Healthcare', debt: 0.08, cash: 0.11 },
    'ULTRACEMCO': { name: 'UltraTech Cement', sector: 'Materials', debt: 0.28, cash: 0.02 },
    'POWERGRID': { name: 'Power Grid Corp', sector: 'Utilities', debt: 0.60, cash: 0.03 },
    'NTPC': { name: 'NTPC Ltd', sector: 'Utilities', debt: 0.65, cash: 0.02 },
    'M&M': { name: 'Mahindra & Mahindra', sector: 'Automotive', debt: 0.45, cash: 0.10 },
    'CIPLA': { name: 'Cipla', sector: 'Healthcare', debt: 0.05, cash: 0.09 },
    'SBIN': { name: 'State Bank of India', sector: 'Banking', debt: 0.92, cash: 0.05 },
};

const generatePriceHistory = (basePrice) => {
    const prices = [basePrice];
    for (let i = 0; i < 50; i++) {
        const change = (Math.random() - 0.5) * (basePrice * 0.05);
        prices.push(prices[prices.length - 1] + change);
    }
    return prices;
};

// Calculate RSI locally for Simulation mode
const calculateRSI = (prices, period = 14) => {
    if (!prices || prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const generateMockData = () => {
    return Object.keys(SECTOR_DATABASE).map(symbol => {
        const baseData = SECTOR_DATABASE[symbol];
        const basePrice = Math.floor(Math.random() * 3000) + 500;
        const history = generatePriceHistory(basePrice);
        const currentPrice = history[history.length - 1];
        const rsi = calculateRSI(history);

        // Simulate Shariah Check
        let shariahStatus = 'Halal';
        let shariahReason = 'Compliant';
        if (PROHIBITED_SECTORS.some(s => baseData.sector.includes(s))) {
            shariahStatus = 'Non-Halal';
            shariahReason = `Sector: ${baseData.sector}`;
        } else if (baseData.debt > MAX_DEBT_RATIO) {
            shariahStatus = 'Non-Halal';
            shariahReason = 'High Debt';
        }

        // Simulate Signal
        let signal = 'Neutral';
        if (rsi < 40) signal = 'Buy';
        if (rsi > 70) signal = 'Sell';

        const atr = currentPrice * 0.02;

        return {
            symbol,
            name: baseData.name,
            sector: baseData.sector,
            price: currentPrice,
            financials: { debtToMcap: baseData.debt, cashToMcap: baseData.cash },
            shariahStatus,
            shariahReason,
            technicals: {
                rsi: rsi.toFixed(1),
                signal,
                signalStrength: signal === 'Buy' ? 80 : 0,
                sl: (currentPrice - 2 * atr).toFixed(1),
                tp: (currentPrice + 3 * atr).toFixed(1),
                gain: 3.5
            }
        };
    });
};

/**
 * ====================================================================
 * MAIN APP COMPONENT
 * ====================================================================
 */
const HalalTradeApp = () => {
    const [useLiveMode, setUseLiveMode] = useState(false);
    const [stocks, setStocks] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [showHalalOnly, setShowHalalOnly] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Initial Load (Simulation by default)
    useEffect(() => {
        if (!useLiveMode) {
            setStocks(generateMockData());
        } else {
            setStocks([]); // Clear mock data when switching to live
        }
    }, [useLiveMode]);

    const handleScan = async () => {
        setIsScanning(true);
        setErrorMsg('');
        setSelectedStock(null);

        if (useLiveMode) {
            try {
                // ATTEMPT TO CONNECT TO PYTHON BACKEND
                const response = await fetch('http://localhost:8000/api/scan');
                if (!response.ok) throw new Error('Failed to connect to Local Backend');

                const data = await response.json();
                setStocks(data);
            } catch (err) {
                console.error(err);
                setErrorMsg('Connection Failed: Is "trade_bot_backend.py" running?');
                // Fallback to empty or keep previous
            } finally {
                setIsScanning(false);
            }
        } else {
            // SIMULATION MODE
            setTimeout(() => {
                setStocks(generateMockData());
                setIsScanning(false);
            }, 1000);
        }
    };

    // Filter View
    const displayedStocks = showHalalOnly
        ? stocks.filter(s => s.shariahStatus === 'Halal' || s.shariahStatus === 'Likely Halal')
        : stocks;

    // Sort: Buy signals first, then Halal status
    const sortedStocks = [...displayedStocks].sort((a, b) => {
        if (a.technicals.signal === 'Buy' && b.technicals.signal !== 'Buy') return -1;
        if (b.technicals.signal === 'Buy' && a.technicals.signal !== 'Buy') return 1;
        return 0;
    });

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-emerald-400" />
                        HalalTrade Pro
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {useLiveMode ? 'LIVE MARKET MODE' : 'SIMULATION MODE'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">

                    {/* MODE TOGGLE */}
                    <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700 mr-4">
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

                    <button
                        onClick={() => setShowHalalOnly(!showHalalOnly)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showHalalOnly
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        {showHalalOnly ? 'Show Halal Only' : 'Show All'}
                    </button>

                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${useLiveMode ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'
                            }`}
                    >
                        {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {isScanning ? 'Scanning...' : useLiveMode ? 'Scan Live Market' : 'Scan Simulation'}
                    </button>
                </div>
            </div>

            {/* ERROR MESSAGE */}
            {errorMsg && (
                <div className="max-w-7xl mx-auto mb-6 bg-red-900/30 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200">
                    <WifiOff className="w-5 h-5" />
                    <div>
                        <p className="font-bold">Connection Error</p>
                        <p className="text-sm">{errorMsg}</p>
                        <p className="text-xs mt-1 text-red-300">To use Live Mode, you must run the provided `trade_bot_backend.py` script locally on port 8000.</p>
                    </div>
                </div>
            )}

            {/* STATS CARDS */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Total Scanned</p>
                    <p className="text-2xl font-bold text-white">{stocks.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Halal Compliant</p>
                    <p className="text-2xl font-bold text-emerald-400">
                        {stocks.filter(s => s.shariahStatus === 'Halal').length}
                    </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Buy Signals</p>
                    <p className="text-2xl font-bold text-blue-400">
                        {stocks.filter(s => s.technicals.signal === 'Buy' && s.shariahStatus === 'Halal').length}
                    </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Avg Potential Gain</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        {stocks.length > 0 ? '3.2%' : '0%'}
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: STOCK TABLE */}
                <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                            {useLiveMode && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                            Market Scanner Results
                        </h2>
                        <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">
                            Strategy: RSI(14) + SMA(50)
                        </span>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        {stocks.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                {useLiveMode ? 'Ready to Scan. Ensure Backend is running.' : 'No data. Click Scan.'}
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0">
                                    <tr>
                                        <th className="p-4">Stock</th>
                                        <th className="p-4">Price</th>
                                        <th className="p-4">Shariah</th>
                                        <th className="p-4">RSI</th>
                                        <th className="p-4">Signal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {sortedStocks.map((stock) => (
                                        <tr
                                            key={stock.symbol}
                                            onClick={() => setSelectedStock(stock)}
                                            className={`hover:bg-gray-700/50 cursor-pointer transition-colors ${selectedStock?.symbol === stock.symbol ? 'bg-gray-700/80 border-l-4 border-blue-500' : ''}`}
                                        >
                                            <td className="p-4">
                                                <div className="font-bold text-white">{stock.symbol}</div>
                                                <div className="text-xs text-gray-500">{stock.name}</div>
                                            </td>
                                            <td className="p-4 font-mono text-gray-300">₹{stock.price.toFixed(1)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1
                        ${stock.shariahStatus === 'Halal' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                                                        stock.shariahStatus === 'Non-Halal' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                                                            'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}`}>
                                                    {stock.shariahStatus === 'Halal' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                                    {stock.shariahStatus}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className={`font-mono font-bold ${stock.technicals.rsi < 30 ? 'text-green-400' :
                                                        stock.technicals.rsi > 70 ? 'text-red-400' : 'text-gray-400'
                                                    }`}>
                                                    {stock.technicals.rsi}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {stock.technicals.signal === 'Buy' && (
                                                    <span className="text-green-400 font-bold flex items-center gap-1 animate-pulse">
                                                        <TrendingUp className="w-3 h-3" /> BUY
                                                    </span>
                                                )}
                                                {stock.technicals.signal === 'Sell' && (
                                                    <span className="text-red-400 font-bold flex items-center gap-1">
                                                        <TrendingDown className="w-3 h-3" /> SELL
                                                    </span>
                                                )}
                                                {stock.technicals.signal === 'Neutral' && (
                                                    <span className="text-gray-500 text-xs">WAIT</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* RIGHT: ANALYSIS PANEL */}
                <div className="flex flex-col gap-4">

                    {/* 1. SELECTED STOCK CARD */}
                    {selectedStock ? (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl p-6 sticky top-4">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedStock.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-gray-400 text-sm">{selectedStock.sector}</span>
                                        <span className="text-blue-400 font-mono text-xs px-2 py-0.5 bg-blue-900/30 rounded">{selectedStock.symbol}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-white">₹{selectedStock.price.toFixed(1)}</div>
                                    {useLiveMode && <div className="text-xs text-red-400 animate-pulse mt-1">● Live Data</div>}
                                </div>
                            </div>

                            {/* Shariah Report */}
                            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-700">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Shariah Compliance Report</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Business Activity</span>
                                        <span className={selectedStock.shariahStatus === 'Non-Halal' && selectedStock.shariahReason.includes('Sector') ? 'text-red-400' : 'text-emerald-400'}>
                                            {selectedStock.shariahStatus === 'Non-Halal' && selectedStock.shariahReason.includes('Sector') ? 'Fail' : 'Pass'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Debt to Market Cap</span>
                                        <span className={selectedStock.financials.debtToMcap > MAX_DEBT_RATIO ? 'text-red-400' : 'text-emerald-400'}>
                                            {(selectedStock.financials.debtToMcap * 100).toFixed(1)}% {selectedStock.financials.debtToMcap > MAX_DEBT_RATIO ? '(>30%)' : '(Pass)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Cash to Market Cap</span>
                                        <span className={selectedStock.financials.cashToMcap > MAX_CASH_RATIO ? 'text-yellow-400' : 'text-emerald-400'}>
                                            {(selectedStock.financials.cashToMcap * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center">
                                        <span className="font-bold text-gray-300">Final Status</span>
                                        <span className={`font-bold px-2 py-0.5 rounded ${selectedStock.shariahStatus === 'Halal' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                            }`}>
                                            {selectedStock.shariahStatus.toUpperCase()}
                                        </span>
                                    </div>
                                    {selectedStock.shariahStatus !== 'Halal' && (
                                        <div className="text-xs text-red-300 mt-2 bg-red-900/20 p-2 rounded">
                                            Reason: {selectedStock.shariahReason}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Technical Signal */}
                            {selectedStock.shariahStatus === 'Halal' ? (
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-lg border flex items-center justify-between ${selectedStock.technicals.signal === 'Buy'
                                            ? 'bg-blue-900/20 border-blue-500/50'
                                            : 'bg-gray-700/20 border-gray-600'
                                        }`}>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Algo Signal</p>
                                            <p className={`text-xl font-bold ${selectedStock.technicals.signal === 'Buy' ? 'text-blue-400' : 'text-gray-400'
                                                }`}>
                                                {selectedStock.technicals.signal.toUpperCase()}
                                            </p>
                                        </div>
                                        {selectedStock.technicals.signal === 'Buy' && (
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase">Confidence</p>
                                                <p className="text-xl font-bold text-white">{selectedStock.technicals.signalStrength}%</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Trade Setup */}
                                    {selectedStock.technicals.signal === 'Buy' && (
                                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                            <div className="flex items-center gap-2 mb-3 text-yellow-400">
                                                <Activity className="w-4 h-4" />
                                                <span className="font-bold text-sm uppercase">Trade Setup</span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-gray-800 p-2 rounded">
                                                    <div className="text-xs text-gray-500">Entry</div>
                                                    <div className="font-mono text-white">₹{selectedStock.price.toFixed(0)}</div>
                                                </div>
                                                <div className="bg-red-900/20 p-2 rounded border border-red-900/30">
                                                    <div className="text-xs text-red-400">Stop Loss</div>
                                                    <div className="font-mono text-red-200">₹{selectedStock.technicals.sl}</div>
                                                </div>
                                                <div className="bg-emerald-900/20 p-2 rounded border border-emerald-900/30">
                                                    <div className="text-xs text-emerald-400">Target</div>
                                                    <div className="font-mono text-emerald-200">₹{selectedStock.technicals.tp}</div>
                                                </div>
                                            </div>

                                            <div className="mt-3 text-center">
                                                <span className="text-xs text-gray-500">Potential Gain: </span>
                                                <span className="text-sm font-bold text-emerald-400">+{selectedStock.technicals.gain}%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-red-900/10 border border-red-900/50 p-4 rounded-lg flex items-center gap-3 text-red-200">
                                    <AlertTriangle className="w-5 h-5" />
                                    <p className="text-sm">Technical analysis is disabled for Non-Halal stocks.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select a stock from the list to view detailed Shariah & Technical Report.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HalalTradeApp;