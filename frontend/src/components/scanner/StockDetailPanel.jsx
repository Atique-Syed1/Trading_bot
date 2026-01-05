import React, { useState } from 'react';
import { AlertTriangle, Activity, Radio, BarChart2, Newspaper, Bot } from 'lucide-react';
import { MAX_DEBT_RATIO, MAX_CASH_RATIO } from '../../data/stockData';
import { PriceChart } from '../common/Sparkline';
import { BacktestModal, BacktestButton } from '../backtest/Backtest';
import { NewsPanel } from './NewsPanel';
import { AIAnalystModal } from './AIAnalyst';

/**
 * Stock Detail Panel - Shows Shariah compliance, chart, and technical analysis
 */
export const StockDetailPanel = ({ stock, useLiveMode, wsConnected }) => {
    const [backtestOpen, setBacktestOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('analysis');
    const [aiOpen, setAiOpen] = useState(false);

    if (!stock) return null;

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl p-6 sticky top-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">{stock.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-sm">{stock.sector}</span>
                        <span className="text-blue-400 font-mono text-xs px-2 py-0.5 bg-blue-900/30 rounded">
                            {stock.symbol}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-3xl font-bold text-white">₹{stock.price.toFixed(1)}</div>

                    {/* AI Button */}
                    <button
                        onClick={() => setAiOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-900/40 transition-all transform hover:scale-105"
                    >
                        <Bot className="w-3 h-3" /> Ask AI
                    </button>

                    {useLiveMode && wsConnected && (
                        <div className="text-xs text-green-400 animate-pulse flex items-center justify-end gap-1">
                            <Radio className="w-3 h-3" /> Live Data
                        </div>
                    )}
                </div>
            </div>

            {/* AI Modal */}
            <AIAnalystModal
                isOpen={aiOpen}
                onClose={() => setAiOpen(false)}
                stock={stock}
            />

            {/* Price Chart */}
            {stock.priceHistory && stock.priceHistory.length > 0 && (
                <div className="mb-6">
                    <PriceChart data={stock.priceHistory} height={100} />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-900/50 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'analysis' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    <BarChart2 className="w-4 h-4" /> Analysis
                </button>
                <button
                    onClick={() => setActiveTab('news')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'news' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                    <Newspaper className="w-4 h-4" /> News
                </button>
            </div>

            {activeTab === 'analysis' ? (
                <>
                    {/* Shariah Compliance Report */}
                    <ShariahReport stock={stock} />

                    {/* Technical Analysis */}
                    {stock.shariahStatus === 'Halal' ? (
                        <>
                            <TechnicalAnalysis stock={stock} />

                            {/* Backtest Button */}
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <BacktestButton onClick={() => setBacktestOpen(true)} />
                            </div>
                        </>
                    ) : (
                        <div className="bg-red-900/10 border border-red-900/50 p-4 rounded-lg flex items-center gap-3 text-red-200">
                            <AlertTriangle className="w-5 h-5" />
                            <p className="text-sm">Technical analysis is disabled for Non-Halal stocks.</p>
                        </div>
                    )}
                </>
            ) : (
                /* News Panel */
                <NewsPanel symbol={stock.symbol} />
            )}


            {/* Backtest Modal */}
            <BacktestModal
                isOpen={backtestOpen}
                onClose={() => setBacktestOpen(false)}
                symbol={stock.symbol}
                stockName={stock.name}
            />
        </div>
    );
};

/**
 * Shariah Compliance Report Component
 */
const ShariahReport = ({ stock }) => (
    <div className="bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-700">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Shariah Compliance Report
        </h3>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Business Activity</span>
                <span className={
                    stock.shariahStatus === 'Non-Halal' && stock.shariahReason.includes('Sector')
                        ? 'text-red-400' : 'text-emerald-400'
                }>
                    {stock.shariahStatus === 'Non-Halal' && stock.shariahReason.includes('Sector') ? 'Fail' : 'Pass'}
                </span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Debt to Market Cap</span>
                <span className={stock.financials.debtToMcap > MAX_DEBT_RATIO ? 'text-red-400' : 'text-emerald-400'}>
                    {(stock.financials.debtToMcap * 100).toFixed(1)}%
                    {stock.financials.debtToMcap > MAX_DEBT_RATIO ? ' (>30%)' : ' (Pass)'}
                </span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Cash to Market Cap</span>
                <span className={stock.financials.cashToMcap > MAX_CASH_RATIO ? 'text-yellow-400' : 'text-emerald-400'}>
                    {(stock.financials.cashToMcap * 100).toFixed(1)}%
                </span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center">
                <span className="font-bold text-gray-300">Final Status</span>
                <span className={`font-bold px-2 py-0.5 rounded ${stock.shariahStatus === 'Halal' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {stock.shariahStatus.toUpperCase()}
                </span>
            </div>
            {stock.shariahStatus !== 'Halal' && (
                <div className="text-xs text-red-300 mt-2 bg-red-900/20 p-2 rounded">
                    Reason: {stock.shariahReason}
                </div>
            )}
        </div>
    </div>
);

/**
 * Technical Analysis Component
 */
const TechnicalAnalysis = ({ stock }) => (
    <div className="space-y-4">
        {/* Signal Card */}
        <div className={`p-4 rounded-lg border flex items-center justify-between ${stock.technicals.signal === 'Buy'
            ? 'bg-blue-900/20 border-blue-500/50'
            : 'bg-gray-700/20 border-gray-600'
            }`}>
            <div>
                <p className="text-xs text-gray-400 uppercase">Algo Signal</p>
                <p className={`text-xl font-bold ${stock.technicals.signal === 'Buy' ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                    {stock.technicals.signal.toUpperCase()}
                </p>
            </div>
            {stock.technicals.signal === 'Buy' && (
                <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase">Confidence</p>
                    <p className="text-xl font-bold text-white">{stock.technicals.signalStrength}%</p>
                </div>
            )}
        </div>

        {/* Trade Setup */}
        {stock.technicals.signal === 'Buy' && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3 text-yellow-400">
                    <Activity className="w-4 h-4" />
                    <span className="font-bold text-sm uppercase">Trade Setup</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500">Entry</div>
                        <div className="font-mono text-white">₹{stock.price.toFixed(0)}</div>
                    </div>
                    <div className="bg-red-900/20 p-2 rounded border border-red-900/30">
                        <div className="text-xs text-red-400">Stop Loss</div>
                        <div className="font-mono text-red-200">₹{stock.technicals.sl}</div>
                    </div>
                    <div className="bg-emerald-900/20 p-2 rounded border border-emerald-900/30">
                        <div className="text-xs text-emerald-400">Target</div>
                        <div className="font-mono text-emerald-200">₹{stock.technicals.tp}</div>
                    </div>
                </div>

                <div className="mt-3 text-center">
                    <span className="text-xs text-gray-500">Potential Gain: </span>
                    <span className="text-sm font-bold text-emerald-400">+{stock.technicals.gain}%</span>
                </div>
            </div>
        )}
    </div>
);

export default StockDetailPanel;
