import React from 'react';
import { ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Radio } from 'lucide-react';
import { LivePriceCell } from './LivePriceCell';
import { Sparkline } from './Sparkline';
import { WatchlistButton } from './Watchlist';

/**
 * Stock Table Component - Displays list of stocks with prices, charts, and signals
 */
export const StockTable = ({
    stocks,
    selectedStock,
    onSelectStock,
    previousPrices,
    useLiveMode,
    wsConnected,
    // Watchlist props
    isInWatchlist,
    onToggleWatchlist
}) => {
    // Sort: Buy signals first
    const sortedStocks = [...stocks].sort((a, b) => {
        if (a.technicals.signal === 'Buy' && b.technicals.signal !== 'Buy') return -1;
        if (b.technicals.signal === 'Buy' && a.technicals.signal !== 'Buy') return 1;
        return 0;
    });

    return (
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-gray-800/80 to-gray-900/80">
                <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                    {useLiveMode && wsConnected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse-glow"></span>
                    )}
                    {useLiveMode && !wsConnected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    )}
                    Market Scanner
                </h2>
                <div className="flex items-center gap-2">
                    {useLiveMode && wsConnected && (
                        <span className="text-xs text-green-400 bg-green-900/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-green-800/50">
                            <Radio className="w-3 h-3" /> Streaming
                        </span>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
                        RSI + SMA50
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                {stocks.length === 0 ? (
                    <div className="p-16 text-center text-gray-500 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                            <Radio className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="text-gray-400 font-medium">
                            {useLiveMode ? 'Ready to Scan' : 'No Data'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {useLiveMode ? 'Ensure backend is running' : 'Click Scan to begin'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/80 text-gray-400 uppercase text-xs sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th className="p-4 w-8"></th>
                                <th className="p-4 font-semibold">Stock</th>
                                <th className="p-4 font-semibold">
                                    Price {useLiveMode && wsConnected && <span className="text-green-400 ml-1 animate-pulse">●</span>}
                                </th>
                                <th className="p-4 text-center font-semibold">Trend</th>
                                <th className="p-4 font-semibold">Shariah</th>
                                <th className="p-4 font-semibold">RSI</th>
                                <th className="p-4 font-semibold">Signal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {sortedStocks.map((stock, idx) => (
                                <StockRow
                                    key={stock.symbol}
                                    stock={stock}
                                    isSelected={selectedStock?.symbol === stock.symbol}
                                    onSelect={() => onSelectStock(stock)}
                                    previousPrice={previousPrices[stock.symbol]}
                                    isLive={useLiveMode && wsConnected}
                                    isWatched={isInWatchlist?.(stock.symbol)}
                                    onToggleWatchlist={() => onToggleWatchlist?.(stock)}
                                    animationDelay={idx * 30}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

/**
 * Individual Stock Row
 */
const StockRow = ({ stock, isSelected, onSelect, previousPrice, isLive, isWatched, onToggleWatchlist }) => (
    <tr
        onClick={onSelect}
        className={`hover:bg-gray-700/50 cursor-pointer transition-colors ${isSelected ? 'bg-gray-700/80 border-l-4 border-blue-500' : ''
            }`}
    >
        <td className="p-2 pl-4">
            <WatchlistButton
                isWatched={isWatched}
                onClick={onToggleWatchlist}
                size="sm"
            />
        </td>
        <td className="p-4">
            <div className="font-bold text-white">{stock.symbol}</div>
            <div className="text-xs text-gray-500">{stock.name}</div>
        </td>
        <td className="p-4">
            <LivePriceCell
                price={stock.price}
                previousPrice={previousPrice}
                isLive={isLive}
            />
            {stock.priceChangePercent !== undefined && isLive && (
                <div className={`text-xs mt-0.5 ${stock.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.priceChange >= 0 ? '+' : ''}{stock.priceChangePercent?.toFixed(2)}%
                </div>
            )}
        </td>
        <td className="p-4">
            <Sparkline
                data={stock.priceHistory}
                width={80}
                height={32}
            />
        </td>
        <td className="p-4">
            <ShariahBadge status={stock.shariahStatus} />
        </td>
        <td className="p-4">
            <div className={`font-mono font-bold ${stock.technicals.rsi < 30 ? 'text-green-400' :
                stock.technicals.rsi > 70 ? 'text-red-400' : 'text-gray-400'
                }`}>
                {stock.technicals.rsi}
            </div>
        </td>
        <td className="p-4">
            <SignalBadge signal={stock.technicals.signal} />
        </td>
    </tr>
);

/**
 * Shariah Status Badge
 */
const ShariahBadge = ({ status }) => (
    <span className={`px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1 ${status === 'Halal' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
        status === 'Non-Halal' ? 'bg-red-900/30 text-red-400 border border-red-800' :
            'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
        }`}>
        {status === 'Halal' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
        {status}
    </span>
);

/**
 * Trading Signal Badge
 */
const SignalBadge = ({ signal }) => {
    if (signal === 'Buy') {
        return (
            <span className="text-green-400 font-bold flex items-center gap-1 animate-pulse">
                <TrendingUp className="w-3 h-3" /> BUY
            </span>
        );
    }
    if (signal === 'Sell') {
        return (
            <span className="text-red-400 font-bold flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> SELL
            </span>
        );
    }
    return <span className="text-gray-500 text-xs">WAIT</span>;
};

export default StockTable;
