import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

/**
 * Sparkline Mini Chart - Shows price trend
 */
export const Sparkline = ({
    data,
    width = 80,
    height = 32,
    color,
    showGradient = true
}) => {
    if (!data || data.length < 2) {
        return (
            <div
                style={{ width, height }}
                className="bg-gray-700/30 rounded flex items-center justify-center"
            >
                <span className="text-gray-600 text-xs">—</span>
            </div>
        );
    }

    // Convert array of prices to chart data format
    const chartData = data.map((price, index) => ({
        value: price,
        index
    }));

    // Determine color based on trend (first vs last price)
    const firstPrice = data[0];
    const lastPrice = data[data.length - 1];
    const trendColor = color || (lastPrice >= firstPrice ? '#10b981' : '#ef4444');

    // Calculate min/max for proper Y axis
    const minValue = Math.min(...data) * 0.995;
    const maxValue = Math.max(...data) * 1.005;

    return (
        <div style={{ width, height }} className="relative">
            <LineChart
                data={chartData}
                width={width}
                height={height}
                margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
            >
                <defs>
                    <linearGradient id={`gradient-${trendColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <YAxis domain={[minValue, maxValue]} hide />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={trendColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>

            {/* Trend indicator dot */}
            <div
                className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 rounded-full ${lastPrice >= firstPrice ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                style={{ boxShadow: `0 0 4px ${trendColor}` }}
            />
        </div>
    );
};

/**
 * Larger Chart for Detail Panel
 */
export const PriceChart = ({
    data,
    width = '100%',
    height = 120,
    showTooltip = false
}) => {
    if (!data || data.length < 2) {
        return (
            <div
                style={{ width, height }}
                className="bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-700"
            >
                <span className="text-gray-600 text-sm">No chart data</span>
            </div>
        );
    }

    const chartData = data.map((price, index) => ({ value: price, index }));
    const firstPrice = data[0];
    const lastPrice = data[data.length - 1];
    const trendColor = lastPrice >= firstPrice ? '#10b981' : '#ef4444';
    const changePercent = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 uppercase">20-Day Trend</span>
                <span className={`text-xs font-bold ${lastPrice >= firstPrice ? 'text-emerald-400' : 'text-red-400'}`}>
                    {lastPrice >= firstPrice ? '+' : ''}{changePercent}%
                </span>
            </div>
            <div style={{ width, height, minWidth: 200, minHeight: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={trendColor}
                            strokeWidth={2}
                            dot={false}
                            fill="url(#chartGradient)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Sparkline;
