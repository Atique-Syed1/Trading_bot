import React, { useState, useEffect, useRef } from 'react';
import { Radio, RefreshCw, WifiOff } from 'lucide-react';

/**
 * Live Price Cell with flash animation on price change
 */
export const LivePriceCell = ({ price, previousPrice, isLive }) => {
    const [flashClass, setFlashClass] = useState('');

    useEffect(() => {
        if (previousPrice !== undefined && previousPrice !== price) {
            const direction = price > previousPrice ? 'up' : price < previousPrice ? 'down' : '';
            if (direction) {
                setFlashClass(direction);
                const timer = setTimeout(() => setFlashClass(''), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [price, previousPrice]);

    const flashStyles = {
        up: 'bg-green-500/30 text-green-300 scale-105',
        down: 'bg-red-500/30 text-red-300 scale-105',
    };

    return (
        <div className={`font-mono text-gray-300 transition-all duration-300 px-2 py-1 rounded ${flashClass ? flashStyles[flashClass] : ''}`}>
            ₹{price.toFixed(1)}
            {isLive && flashClass && (
                <span className={`ml-1 text-xs ${flashClass === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {flashClass === 'up' ? '▲' : '▼'}
                </span>
            )}
        </div>
    );
};

/**
 * WebSocket Connection Status Indicator
 */
export const ConnectionStatus = ({ isConnected, isConnecting, lastUpdate }) => {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isConnected
                ? 'bg-green-900/30 border border-green-700 text-green-400'
                : isConnecting
                    ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-400'
                    : 'bg-gray-800 border border-gray-700 text-gray-500'
            }`}>
            {isConnected ? (
                <>
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>LIVE STREAM</span>
                    {lastUpdate && (
                        <span className="text-gray-500 ml-1">
                            · {new Date(lastUpdate).toLocaleTimeString()}
                        </span>
                    )}
                </>
            ) : isConnecting ? (
                <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Connecting...</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-3 h-3" />
                    <span>Disconnected</span>
                </>
            )}
        </div>
    );
};
