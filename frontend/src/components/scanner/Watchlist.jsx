import React from 'react';
import { Star, Trash2, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';

/**
 * Watchlist Star Button - Add/Remove from watchlist
 */
export const WatchlistButton = ({ isWatched, onClick, size = 'md' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`p-1 rounded-full transition-all duration-200 ${isWatched
                ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-900/20'
                : 'text-gray-500 hover:text-yellow-400 hover:bg-gray-700'
                }`}
            title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
            <Star
                className={`${sizes[size]} transition-transform ${isWatched ? 'fill-yellow-400 scale-110' : ''}`}
            />
        </button>
    );
};

/**
 * Watchlist Panel - Shows all watched stocks
 */
export const WatchlistPanel = ({
    watchlist,
    stocks,
    onRemove,
    onSelectStock,
    onClear,
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    // Match watchlist items with current stock data for live prices
    const watchlistWithPrices = watchlist.map(item => {
        const liveStock = stocks.find(s => s.symbol === item.symbol);
        return {
            ...item,
            currentPrice: liveStock?.price || null,
            priceChange: liveStock?.price ? liveStock.price - item.addedPrice : null,
            priceChangePercent: liveStock?.price
                ? ((liveStock.price - item.addedPrice) / item.addedPrice * 100)
                : null,
            technicals: liveStock?.technicals || null
        };
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
                    <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <h2 className="text-lg font-bold text-white">My Watchlist</h2>
                        <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded-full">
                            {watchlist.length} stocks
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {watchlist.length > 0 && (
                            <button
                                onClick={onClear}
                                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[60vh]">
                    {watchlist.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Your watchlist is empty</p>
                            <p className="text-sm mt-2">Click the ⭐ icon on any stock to add it</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {watchlistWithPrices.map((item) => (
                                <div
                                    key={item.symbol}
                                    className="p-4 hover:bg-gray-700/50 cursor-pointer transition-colors flex items-center justify-between"
                                    onClick={() => {
                                        const stock = stocks.find(s => s.symbol === item.symbol);
                                        if (stock) {
                                            onSelectStock(stock);
                                            onClose();
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{item.symbol}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.shariahStatus === 'Halal'
                                                    ? 'bg-emerald-900/30 text-emerald-400'
                                                    : 'bg-red-900/30 text-red-400'
                                                    }`}>
                                                    {item.shariahStatus}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">{item.name}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* Price Info */}
                                        <div className="text-right">
                                            {item.currentPrice ? (
                                                <>
                                                    <div className="font-mono text-white">
                                                        ₹{item.currentPrice.toFixed(1)}
                                                    </div>
                                                    <div className={`text-xs flex items-center justify-end gap-1 ${item.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                        {item.priceChange >= 0
                                                            ? <TrendingUp className="w-3 h-3" />
                                                            : <TrendingDown className="w-3 h-3" />
                                                        }
                                                        {item.priceChange >= 0 ? '+' : ''}
                                                        {item.priceChangePercent?.toFixed(2)}%
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-gray-500 text-sm">—</div>
                                            )}
                                        </div>

                                        {/* Signal */}
                                        {item.technicals && (
                                            <div className={`text-xs font-bold px-2 py-1 rounded ${item.technicals.signal === 'Buy'
                                                ? 'bg-green-900/30 text-green-400'
                                                : item.technicals.signal === 'Sell'
                                                    ? 'bg-red-900/30 text-red-400'
                                                    : 'bg-gray-700 text-gray-400'
                                                }`}>
                                                {item.technicals.signal.toUpperCase()}
                                            </div>
                                        )}

                                        {/* Remove Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(item.symbol);
                                            }}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 bg-gray-900/50 text-center">
                    <p className="text-xs text-gray-500">
                        ☁️ Saved in database • Synced on all devices
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * Watchlist Indicator Button for Header
 */
export const WatchlistIndicator = ({ count, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${count > 0
            ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800 hover:bg-yellow-900/50'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
    >
        <Star className={`w-4 h-4 ${count > 0 ? 'fill-yellow-400' : ''}`} />
        Watchlist
        {count > 0 && (
            <span className="text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded-full min-w-[20px]">
                {count}
            </span>
        )}
    </button>
);

export default WatchlistPanel;
