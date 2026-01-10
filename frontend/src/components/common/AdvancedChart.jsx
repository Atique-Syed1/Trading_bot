import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Loader, TrendingUp, TrendingDown, CandlestickChart, LineChart, BarChart3, Maximize2, Minimize2 } from 'lucide-react';
import API from '../../config/api';
import ChartExport from './ChartExport';

/**
 * ====================================================================
 * TRADINGVIEW-STYLE ADVANCED CHART
 * Professional candlestick/line chart with indicators
 * ====================================================================
 */
const AdvancedChart = ({ 
    symbol, 
    height = 400, 
    showVolume = true,
    showIndicators = true,
    defaultPeriod = '1y'
}) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState(defaultPeriod);
    const [chartType, setChartType] = useState('candle');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
    const [chartData, setChartData] = useState([]);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!symbol) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(API.STOCK_HISTORY(symbol, period));
            if (!res.ok) throw new Error('Failed to fetch data');

            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) {
                setError('No data available');
                setChartData([]);
                return;
            }

            // Transform data - lightweight-charts needs time as YYYY-MM-DD string
            const transformed = data.map(d => {
                const date = new Date(d.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return {
                    time: `${year}-${month}-${day}`,
                    open: Number(d.open) || 0,
                    high: Number(d.high) || 0,
                    low: Number(d.low) || 0,
                    close: Number(d.close) || 0,
                    volume: Number(d.volume) || 0,
                };
            }).filter(d => d.close > 0);

            // Remove duplicates (same date)
            const uniqueData = [];
            const seen = new Set();
            for (const item of transformed) {
                if (!seen.has(item.time)) {
                    seen.add(item.time);
                    uniqueData.push(item);
                }
            }

            // Sort by date
            uniqueData.sort((a, b) => a.time.localeCompare(b.time));

            setChartData(uniqueData);

            // Set price info
            if (uniqueData.length > 0) {
                const last = uniqueData[uniqueData.length - 1];
                const first = uniqueData[0];
                setCurrentPrice(last.close);
                const change = last.close - first.open;
                const changePercent = (change / first.open) * 100;
                setPriceChange({ value: change, percent: changePercent });
            }

        } catch (err) {
            console.error('Chart data error:', err);
            setError('Failed to load chart data');
        } finally {
            setLoading(false);
        }
    }, [symbol, period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Create/update chart when data changes
    useEffect(() => {
        if (!chartContainerRef.current || chartData.length === 0) return;

        // Clean up existing chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        // Create new chart
        const chartHeight = isFullscreen ? window.innerHeight - 180 : height;
        
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartHeight,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: 'rgba(55, 65, 81, 0.3)' },
                horzLines: { color: 'rgba(55, 65, 81, 0.3)' },
            },
            crosshair: {
                vertLine: { color: '#10b981', width: 1, style: 2, labelBackgroundColor: '#10b981' },
                horzLine: { color: '#10b981', width: 1, style: 2, labelBackgroundColor: '#10b981' },
            },
            rightPriceScale: {
                borderColor: 'rgba(55, 65, 81, 0.5)',
            },
            timeScale: {
                borderColor: 'rgba(55, 65, 81, 0.5)',
                timeVisible: true,
            },
        });

        chartRef.current = chart;

        // Add series based on chart type
        if (chartType === 'candle') {
            const candleSeries = chart.addCandlestickSeries({
                upColor: '#10b981',
                downColor: '#ef4444',
                borderUpColor: '#10b981',
                borderDownColor: '#ef4444',
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
            candleSeries.setData(chartData);
            seriesRef.current = candleSeries;
        } else if (chartType === 'line') {
            const lineSeries = chart.addLineSeries({
                color: '#10b981',
                lineWidth: 2,
            });
            lineSeries.setData(chartData.map(d => ({ time: d.time, value: d.close })));
            seriesRef.current = lineSeries;
        } else {
            const areaSeries = chart.addAreaSeries({
                topColor: 'rgba(16, 185, 129, 0.4)',
                bottomColor: 'rgba(16, 185, 129, 0.0)',
                lineColor: '#10b981',
                lineWidth: 2,
            });
            areaSeries.setData(chartData.map(d => ({ time: d.time, value: d.close })));
            seriesRef.current = areaSeries;
        }

        // Add volume
        if (showVolume) {
            const volumeSeries = chart.addHistogramSeries({
                color: '#3b82f6',
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.85, bottom: 0 },
            });
            volumeSeries.setData(chartData.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
            })));
            volumeSeriesRef.current = volumeSeries;
        }

        chart.timeScale().fitContent();

        // Handle resize
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [chartData, chartType, showVolume, height, isFullscreen]);

    const periods = [
        { label: '1D', value: '1d' },
        { label: '5D', value: '5d' },
        { label: '1M', value: '1mo' },
        { label: '3M', value: '3mo' },
        { label: '1Y', value: '1y' },
    ];

    return (
        <div className={`bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-700/50">
                {/* Price Info */}
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">
                                {symbol?.replace('.NS', '')}
                            </span>
                            {currentPrice && (
                                <span className="text-xl font-bold text-white">
                                    ₹{currentPrice.toFixed(2)}
                                </span>
                            )}
                        </div>
                        {priceChange.value !== 0 && (
                            <div className={`flex items-center gap-1 text-sm ${priceChange.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {priceChange.value >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                <span>{priceChange.value >= 0 ? '+' : ''}{priceChange.value.toFixed(2)}</span>
                                <span>({priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Period */}
                    <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700/50">
                        {periods.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                                    period === p.value
                                        ? 'bg-emerald-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Chart Type */}
                    <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700/50">
                        <button
                            onClick={() => setChartType('candle')}
                            className={`p-1.5 rounded transition-all ${chartType === 'candle' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Candlestick"
                        >
                            <CandlestickChart size={14} />
                        </button>
                        <button
                            onClick={() => setChartType('line')}
                            className={`p-1.5 rounded transition-all ${chartType === 'line' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Line"
                        >
                            <LineChart size={14} />
                        </button>
                        <button
                            onClick={() => setChartType('area')}
                            className={`p-1.5 rounded transition-all ${chartType === 'area' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Area"
                        >
                            <BarChart3 size={14} />
                        </button>
                    </div>

                    {/* Fullscreen */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>

                    {/* Export Chart */}
                    <ChartExport 
                        chartRef={chartContainerRef} 
                        filename={`${symbol?.replace('.NS', '')}-chart`}
                        title={`${symbol?.replace('.NS', '')} - ${period.toUpperCase()} Chart`}
                    />
                </div>
            </div>

            {/* Chart */}
            <div className="relative" style={{ height: isFullscreen ? 'calc(100vh - 180px)' : height }}>
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                )}
                {error && !loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80">
                        <div className="text-center">
                            <p className="text-gray-400 mb-2">{error}</p>
                            <button 
                                onClick={fetchData}
                                className="px-3 py-1 bg-emerald-500 text-white text-sm rounded hover:bg-emerald-600"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full h-full" />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-700/50 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span className="text-gray-400">Bullish</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-gray-400">Bearish</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-blue-500/50" />
                    <span className="text-gray-400">Volume</span>
                </div>
            </div>
        </div>
    );
};

export default AdvancedChart;
export { AdvancedChart };
