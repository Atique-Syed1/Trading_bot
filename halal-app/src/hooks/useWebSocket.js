import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for WebSocket connection management
 */
export const useWebSocket = (url, options = {}) => {
    const {
        onMessage,
        onConnect,
        onDisconnect,
        onError,
        autoReconnect = true,
        reconnectDelay = 3000,
        enabled = true
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (!enabled) return;

        setIsConnecting(true);

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected');
                setIsConnected(true);
                setIsConnecting(false);
                onConnect?.();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage?.(data);
                } catch (err) {
                    console.error('[WS] Parse error:', err);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected');
                setIsConnected(false);
                setIsConnecting(false);
                wsRef.current = null;
                onDisconnect?.();

                // Auto-reconnect
                if (autoReconnect && enabled) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[WS] Reconnecting...');
                        connect();
                    }, reconnectDelay);
                }
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                setIsConnecting(false);
                onError?.(error);
            };

        } catch (err) {
            console.error('[WS] Connection error:', err);
            setIsConnecting(false);
            onError?.(err);
        }
    }, [url, enabled, autoReconnect, reconnectDelay, onMessage, onConnect, onDisconnect, onError]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
    }, []);

    const send = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isConnecting,
        connect,
        disconnect,
        send
    };
};
