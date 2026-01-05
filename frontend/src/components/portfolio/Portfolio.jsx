import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, TrendingUp, TrendingDown, DollarSign, PieChart, X, Loader } from 'lucide-react';
import { AddHoldingModal } from './AddHolding';
import API from '../../config/api';

/**
 * Portfolio Dashboard Component
 */
export const Portfolio = ({ isOpen, onClose }) => {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const fetchPortfolio = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API.PORTFOLIO);
            const data = await response.json();
            setSummary(data);
        } catch (err) {
            console.error("Failed to fetch portfolio", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPortfolio();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-900/50 to-indigo-900/50">
                    <div className="flex items-center gap-3">
                        <Briefcase className="w-6 h-6 text-blue-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white">My Portfolio</h2>
                            <p className="text-xs text-blue-300">Track your shariah-compliant holdings</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading && !summary ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <StatCard
                                    label="Current Value"
                                    value={`₹${summary.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    icon={DollarSign}
                                    color="blue"
                                />
                                <StatCard
                                    label="Total Invested"
                                    value={`₹${summary.total_invested.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    icon={Briefcase}
                                    color="purple"
                                />
                                <StatCard
                                    label="Total P&L"
                                    value={`₹${Math.abs(summary.total_pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    subValue={`${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl_percent.toFixed(2)}%`}
                                    icon={summary.total_pnl >= 0 ? TrendingUp : TrendingDown}
                                    color={summary.total_pnl >= 0 ? "green" : "red"}
                                />
                                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col justify-center items-center cursor-pointer hover:bg-gray-750 transition-colors"
                                    onClick={() => setIsAddOpen(true)}>
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mb-2 shadow-lg shadow-blue-900/50">
                                        <Plus className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-blue-400">Add Transaction</span>
                                </div>
                            </div>

                            {/* Holdings Table */}
                            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                                        <PieChart className="w-4 h-4" /> Current Holdings
                                    </h3>
                                    <span className="text-xs text-gray-500">{summary.holdings.length} Positions</span>
                                </div>

                                {summary.holdings.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No holdings found</p>
                                        <button
                                            onClick={() => setIsAddOpen(true)}
                                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Add your first stock
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                                                <tr>
                                                    <th className="p-4">Symbol</th>
                                                    <th className="p-4 text-right">Qty</th>
                                                    <th className="p-4 text-right">Avg Price</th>
                                                    <th className="p-4 text-right">LTP</th>
                                                    <th className="p-4 text-right">Current Val</th>
                                                    <th className="p-4 text-right">P&L</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {summary.holdings.map((stock) => (
                                                    <tr key={stock.symbol} className="hover:bg-gray-700/30">
                                                        <td className="p-4 font-bold text-white">{stock.symbol}</td>
                                                        <td className="p-4 text-right text-gray-300">{stock.quantity}</td>
                                                        <td className="p-4 text-right text-gray-400">₹{stock.average_price.toFixed(1)}</td>
                                                        <td className="p-4 text-right font-mono text-white">₹{stock.current_price.toFixed(1)}</td>
                                                        <td className="p-4 text-right text-white">₹{stock.current_value.toLocaleString()}</td>
                                                        <td className={`p-4 text-right font-bold ${stock.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            <div>{stock.pnl >= 0 ? '+' : ''}₹{Math.abs(stock.pnl).toLocaleString()}</div>
                                                            <div className="text-xs opacity-70">{stock.pnl >= 0 ? '+' : ''}{stock.pnl_percent.toFixed(2)}%</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AddHoldingModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={fetchPortfolio}
            />
        </div>
    );
};

const StatCard = ({ label, value, subValue, icon: Icon, color }) => {
    const colorClasses = {
        blue: "text-blue-400 bg-blue-900/20 border-blue-800",
        purple: "text-purple-400 bg-purple-900/20 border-purple-800",
        green: "text-green-400 bg-green-900/20 border-green-800",
        red: "text-red-400 bg-red-900/20 border-red-800"
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
                <Icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {subValue && <div className="text-sm font-medium mt-1 opacity-80">{subValue}</div>}
        </div>
    );
};
