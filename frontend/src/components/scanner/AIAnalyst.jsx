import React, { useState, useEffect } from 'react';
import { Bot, X, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import API from '../../config/api';
import ReactMarkdown from 'react-markdown'; // Assuming react-markdown is not installed, I'll use simple rendering

export const AIAnalystModal = ({ isOpen, onClose, stock }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && stock) {
            fetchAnalysis();
        }
    }, [isOpen, stock]);

    const fetchAnalysis = async () => {
        setLoading(true);
        try {
            const res = await fetch(API.AI_ANALYZE(stock.symbol));
            const data = await res.json();
            setAnalysis(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                    <X className="w-6 h-6" />
                </button>

                {/* Header with Animation */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 pt-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-xl shadow-purple-900/50">
                            <Bot className="w-10 h-10 text-cyan-300" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">AI Analyst</h2>
                    <p className="text-indigo-200 text-sm">Analyzing {stock?.name}</p>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[300px] max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 py-10">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                            </div>
                            <p className="text-gray-400 text-sm animate-pulse">Processing technical indicators...</p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className={`p-4 rounded-xl border ${analysis.sentiment === 'BULLISH' ? 'bg-green-900/20 border-green-800' :
                                analysis.sentiment === 'BEARISH' ? 'bg-red-900/20 border-red-800' :
                                    'bg-gray-800 border-gray-700'
                                }`}>
                                <div className="flex items-center gap-3 mb-1">
                                    {analysis.sentiment === 'BULLISH' ? <TrendingUp className="text-green-400" /> :
                                        analysis.sentiment === 'BEARISH' ? <TrendingDown className="text-red-400" /> :
                                            <Minus className="text-gray-400" />}
                                    <h3 className={`font-bold text-lg ${analysis.sentiment === 'BULLISH' ? 'text-green-400' :
                                        analysis.sentiment === 'BEARISH' ? 'text-red-400' :
                                            'text-gray-200'
                                        }`}>
                                        {analysis.summary}
                                    </h3>
                                </div>
                            </div>

                            {/* Detailed Text */}
                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                <div className="prose prose-invert prose-sm text-gray-300">
                                    <ReactMarkdown>
                                        {analysis.details}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-gray-500">
                                    Generated by HalalTrade AI Engine
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-red-400">Analysis failed.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
