import React, { useState } from 'react';
import { X, Scale, ArrowRight, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

export const CompareStocks = ({ isOpen, onClose, stocks }) => {
    const [selectedA, setSelectedA] = useState('');
    const [selectedB, setSelectedB] = useState('');

    if (!isOpen) return null;

    const stockA = stocks.find(s => s.symbol === selectedA);
    const stockB = stocks.find(s => s.symbol === selectedB);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-purple-900/50 to-indigo-900/50">
                    <div className="flex items-center gap-3">
                        <Scale className="w-6 h-6 text-purple-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Compare Stocks</h2>
                            <p className="text-xs text-purple-300">Side-by-side technical analysis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Selection */}
                <div className="p-4 bg-gray-800/50 border-b border-gray-800 flex gap-4 items-center justify-center">
                    <div className="flex-1">
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={selectedA}
                            onChange={(e) => setSelectedA(e.target.value)}
                        >
                            <option value="">Select Stock A</option>
                            {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-gray-700 rounded-full p-2">
                        <div className="text-gray-400 font-bold text-xs">VS</div>
                    </div>
                    <div className="flex-1">
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={selectedB}
                            onChange={(e) => setSelectedB(e.target.value)}
                        >
                            <option value="">Select Stock B</option>
                            {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Comparison Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {stockA && stockB ? (
                        <div className="grid grid-cols-3 gap-6">
                            {/* Stock A */}
                            <StockColumn stock={stockA} color="blue" />

                            {/* Labels */}
                            <div className="flex flex-col gap-4 py-16">
                                <Label text="Current Price" icon={DollarSign} />
                                <Label text="Change %" icon={Activity} />
                                <Label text="RSI (14)" />
                                <Label text="MACD" />
                                <Label text="Signal" />
                                <Label text="Shariah Status" />
                                <Label text="Setup Target" />
                                <Label text="Risk/Reward" />
                            </div>

                            {/* Stock B */}
                            <StockColumn stock={stockB} color="purple" />
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            <Scale className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">Select two stocks to compare</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StockColumn = ({ stock, color }) => {
    const isHalal = stock.shariahStatus === 'Halal';
    const signalColor = stock.technicals.signal === 'Buy' ? 'text-green-400' : stock.technicals.signal === 'Sell' ? 'text-red-400' : 'text-gray-400';

    // Calculate Risk/Reward if Buy
    let rr = '-';
    if (stock.technicals.signal === 'Buy') {
        const risk = stock.price - stock.technicals.sl;
        const reward = stock.technicals.tp - stock.price;
        if (risk > 0) rr = `1:${(reward / risk).toFixed(1)}`;
    }

    return (
        <div className={`text-center space-y-4 rounded-xl bg-${color}-900/10 border border-${color}-900/30 p-4`}>
            <div className="mb-8">
                <div className="text-2xl font-bold text-white">{stock.symbol}</div>
                <div className="text-xs text-gray-400">{stock.name}</div>
            </div>

            <Metric value={`₹${stock.price.toFixed(1)}`} />
            <Metric
                value={`${stock.priceChange >= 0 ? '+' : ''}${stock.priceChangePercent?.toFixed(2)}%`}
                className={stock.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <Metric value={stock.technicals.rsi.toFixed(1)} />
            <Metric value={stock.technicals.macd.toFixed(2)} />
            <Metric value={stock.technicals.signal.toUpperCase()} className={`font-bold ${signalColor}`} />
            <Metric
                value={stock.shariahStatus}
                className={`font-bold px-2 py-0.5 rounded-full inline-block text-xs ${isHalal ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
            />
            <Metric value={stock.technicals.signal === 'Buy' ? `₹${stock.technicals.tp}` : '-'} className="text-green-300" />
            <Metric value={rr} />
        </div>
    );
};

const Label = ({ text, icon: Icon }) => (
    <div className="h-12 flex items-center justify-center text-gray-500 text-sm font-medium border-b border-gray-800 last:border-0">
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {text}
    </div>
);

const Metric = ({ value, className = 'text-white' }) => (
    <div className={`h-12 flex items-center justify-center text-lg font-mono border-b border-gray-800/50 last:border-0 ${className}`}>
        {value}
    </div>
);
