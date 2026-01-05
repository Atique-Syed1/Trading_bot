import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign, Target, AlertTriangle, Play, Loader, X, BarChart3, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { exportBacktestPDF } from '../../utils/exportUtils';
import API from '../../config/api';

/**
 * Backtest Modal Component
 */
export const BacktestModal = ({ isOpen, onClose, symbol, stockName }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [config, setConfig] = useState({
        period: '1y',
        strategy: 'rsi_sma',
        initialCapital: 100000,
        // RSI+SMA params
        rsiOversold: 30,
        rsiOverbought: 70,
        // MACD params
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        // Bollinger params
        bbPeriod: 20,
        bbStd: 2.0,
        // MA Crossover params
        maFast: 10,
        maSlow: 50
    });

    const strategies = [
        { id: 'rsi_sma', name: 'RSI + SMA50', desc: 'RSI oversold + price above SMA' },
        { id: 'macd', name: 'MACD Crossover', desc: 'MACD histogram crossover' },
        { id: 'bollinger', name: 'Bollinger Bands', desc: 'Buy at lower band, sell at upper' },
        { id: 'ma_crossover', name: 'MA Crossover', desc: 'Golden cross / death cross' }
    ];

    const runBacktest = async () => {
        setIsLoading(true);
        setError('');
        setResults(null);

        try {
            const response = await fetch(API.BACKTEST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol,
                    period: config.period,
                    strategy: config.strategy,
                    initial_capital: config.initialCapital,
                    rsi_oversold: config.rsiOversold,
                    rsi_overbought: config.rsiOverbought,
                    macd_fast: config.macdFast,
                    macd_slow: config.macdSlow,
                    macd_signal: config.macdSignal,
                    bb_period: config.bbPeriod,
                    bb_std: config.bbStd,
                    ma_fast: config.maFast,
                    ma_slow: config.maSlow
                })
            });

            const data = await response.json();

            if (data.success) {
                setResults(data);
            } else {
                setError(data.error || 'Backtest failed');
            }
        } catch (err) {
            setError('Failed to connect to backend');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-orange-900/50 to-red-900/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-orange-400" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Backtest Engine</h2>
                            <p className="text-sm text-gray-400">{symbol} - {stockName || 'Stock'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Strategy Selector */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {strategies.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setConfig(prev => ({ ...prev, strategy: s.id }))}
                                className={`p-3 rounded-lg border text-left transition-all ${config.strategy === s.id
                                    ? 'bg-orange-900/30 border-orange-600 text-orange-400'
                                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-sm font-bold">{s.name}</div>
                                <div className="text-xs opacity-70">{s.desc}</div>
                            </button>
                        ))}
                    </div>

                    {/* Config Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Period</label>
                            <select
                                value={config.period}
                                onChange={(e) => setConfig(prev => ({ ...prev, period: e.target.value }))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                            >
                                <option value="3mo">3 Months</option>
                                <option value="6mo">6 Months</option>
                                <option value="1y">1 Year</option>
                                <option value="2y">2 Years</option>
                                <option value="5y">5 Years</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Capital (₹)</label>
                            <input
                                type="number"
                                value={config.initialCapital}
                                onChange={(e) => setConfig(prev => ({ ...prev, initialCapital: parseInt(e.target.value) || 100000 }))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>

                        {/* RSI+SMA Params */}
                        {config.strategy === 'rsi_sma' && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">RSI Oversold</label>
                                    <input
                                        type="number"
                                        value={config.rsiOversold}
                                        onChange={(e) => setConfig(prev => ({ ...prev, rsiOversold: parseInt(e.target.value) || 30 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">RSI Overbought</label>
                                    <input
                                        type="number"
                                        value={config.rsiOverbought}
                                        onChange={(e) => setConfig(prev => ({ ...prev, rsiOverbought: parseInt(e.target.value) || 70 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {/* MACD Params */}
                        {config.strategy === 'macd' && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Fast EMA</label>
                                    <input
                                        type="number"
                                        value={config.macdFast}
                                        onChange={(e) => setConfig(prev => ({ ...prev, macdFast: parseInt(e.target.value) || 12 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Slow EMA</label>
                                    <input
                                        type="number"
                                        value={config.macdSlow}
                                        onChange={(e) => setConfig(prev => ({ ...prev, macdSlow: parseInt(e.target.value) || 26 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {/* Bollinger Params */}
                        {config.strategy === 'bollinger' && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Period</label>
                                    <input
                                        type="number"
                                        value={config.bbPeriod}
                                        onChange={(e) => setConfig(prev => ({ ...prev, bbPeriod: parseInt(e.target.value) || 20 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Std Dev (σ)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={config.bbStd}
                                        onChange={(e) => setConfig(prev => ({ ...prev, bbStd: parseFloat(e.target.value) || 2.0 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {/* MA Crossover Params */}
                        {config.strategy === 'ma_crossover' && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Fast MA</label>
                                    <input
                                        type="number"
                                        value={config.maFast}
                                        onChange={(e) => setConfig(prev => ({ ...prev, maFast: parseInt(e.target.value) || 10 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Slow MA</label>
                                    <input
                                        type="number"
                                        value={config.maSlow}
                                        onChange={(e) => setConfig(prev => ({ ...prev, maSlow: parseInt(e.target.value) || 50 }))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Run Button */}
                    <button
                        onClick={runBacktest}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Running Backtest...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                Run Backtest
                            </>
                        )}
                    </button>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {results && (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <MetricCard
                                    label="Total Return"
                                    value={`${results.summary.totalReturn >= 0 ? '+' : ''}${results.summary.totalReturn}%`}
                                    color={results.summary.totalReturn >= 0 ? 'green' : 'red'}
                                    icon={results.summary.totalReturn >= 0 ? TrendingUp : TrendingDown}
                                />
                                <MetricCard
                                    label="Win Rate"
                                    value={`${results.summary.winRate}%`}
                                    color={results.summary.winRate >= 50 ? 'green' : 'yellow'}
                                    icon={Target}
                                />
                                <MetricCard
                                    label="Max Drawdown"
                                    value={`-${results.summary.maxDrawdown}%`}
                                    color="red"
                                    icon={AlertTriangle}
                                />
                                <MetricCard
                                    label="Final Capital"
                                    value={`₹${results.summary.finalCapital.toLocaleString()}`}
                                    color="blue"
                                    icon={DollarSign}
                                />
                            </div>

                            {/* Comparison */}
                            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                                <h3 className="text-sm font-bold text-gray-300 mb-3">Strategy vs Buy & Hold</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500">RSI+SMA Strategy</div>
                                        <div className={`text-xl font-bold ${results.summary.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {results.summary.totalReturn >= 0 ? '+' : ''}{results.summary.totalReturn}%
                                        </div>
                                    </div>
                                    <div className="text-2xl text-gray-600">vs</div>
                                    <div className="flex-1 text-right">
                                        <div className="text-xs text-gray-500">Buy & Hold</div>
                                        <div className={`text-xl font-bold ${results.summary.buyHoldReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {results.summary.buyHoldReturn >= 0 ? '+' : ''}{results.summary.buyHoldReturn}%
                                        </div>
                                    </div>
                                </div>
                                <div className={`mt-2 text-center text-sm ${results.summary.outperformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {results.summary.outperformance >= 0 ? '📈 Outperformed' : '📉 Underperformed'} by {Math.abs(results.summary.outperformance)}%
                                </div>
                            </div>

                            {/* Equity Curve */}
                            {results.equityCurve && results.equityCurve.length > 0 && (
                                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                                    <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" /> Equity Curve
                                    </h3>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={results.equityCurve}>
                                                <defs>
                                                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                                    tickFormatter={(val) => val.slice(5)}
                                                />
                                                <YAxis
                                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                                    labelStyle={{ color: '#9ca3af' }}
                                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Equity']}
                                                />
                                                <ReferenceLine y={results.summary.initialCapital} stroke="#6b7280" strokeDasharray="3 3" />
                                                <Area
                                                    type="monotone"
                                                    dataKey="equity"
                                                    stroke="#10b981"
                                                    fill="url(#equityGradient)"
                                                    strokeWidth={2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Trade History */}
                            {results.trades && results.trades.length > 0 && (
                                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                                    <h3 className="text-sm font-bold text-gray-300 mb-3">
                                        Trade History ({results.summary.totalTrades} trades)
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="text-gray-500 border-b border-gray-700">
                                                <tr>
                                                    <th className="py-2 text-left">Date</th>
                                                    <th className="py-2 text-left">Type</th>
                                                    <th className="py-2 text-right">Price</th>
                                                    <th className="py-2 text-right">RSI</th>
                                                    <th className="py-2 text-right">P&L</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {results.trades.map((trade, i) => (
                                                    <tr key={i} className="text-gray-300">
                                                        <td className="py-2">{trade.date}</td>
                                                        <td className={`py-2 font-bold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {trade.type}
                                                        </td>
                                                        <td className="py-2 text-right">₹{trade.price}</td>
                                                        <td className="py-2 text-right">{trade.rsi || '-'}</td>
                                                        <td className={`py-2 text-right font-bold ${trade.profit > 0 ? 'text-green-400' :
                                                            trade.profit < 0 ? 'text-red-400' : ''
                                                            }`}>
                                                            {trade.profit !== undefined ? (
                                                                `${trade.profit >= 0 ? '+' : ''}₹${trade.profit}`
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Export & Info */}
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                    Backtest period: {results.summary.startDate} to {results.summary.endDate}
                                </div>
                                <button
                                    onClick={() => exportBacktestPDF(results)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Export PDF
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Metric Card Component
 */
const MetricCard = ({ label, value, color, icon: Icon }) => {
    const colorClasses = {
        green: 'text-green-400 bg-green-900/30 border-green-800',
        red: 'text-red-400 bg-red-900/30 border-red-800',
        yellow: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
        blue: 'text-blue-400 bg-blue-900/30 border-blue-800'
    };

    return (
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                <Icon className="w-3 h-3" />
                {label}
            </div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    );
};

/**
 * Backtest Button for Stock Detail Panel
 */
export const BacktestButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 bg-orange-900/30 hover:bg-orange-900/50 text-orange-400 border border-orange-800 rounded-lg text-sm font-medium transition-colors"
    >
        <Activity className="w-4 h-4" />
        Backtest
    </button>
);

export default BacktestModal;
