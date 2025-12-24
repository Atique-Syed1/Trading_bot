import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage with React state sync
 * Production-ready with error handling and SSR safety
 */
export const useLocalStorage = (key, initialValue) => {
    // Get initial value from localStorage or use default
    const [storedValue, setStoredValue] = useState(() => {
        try {
            if (typeof window === 'undefined') return initialValue;

            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage when state changes
    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function for prev state updates
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Remove item from localStorage
    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch (error) {
            console.warn(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
};

/**
 * Hook specifically for managing watchlist
 */
export const useWatchlist = () => {
    const [watchlist, setWatchlist, clearWatchlist] = useLocalStorage('halaltrade_watchlist', []);

    // Add stock to watchlist
    const addToWatchlist = useCallback((stock) => {
        setWatchlist(prev => {
            // Check if already exists
            if (prev.some(s => s.symbol === stock.symbol)) {
                return prev;
            }
            return [...prev, {
                symbol: stock.symbol,
                name: stock.name,
                sector: stock.sector,
                shariahStatus: stock.shariahStatus,
                addedAt: new Date().toISOString(),
                addedPrice: stock.price
            }];
        });
    }, [setWatchlist]);

    // Remove stock from watchlist
    const removeFromWatchlist = useCallback((symbol) => {
        setWatchlist(prev => prev.filter(s => s.symbol !== symbol));
    }, [setWatchlist]);

    // Toggle stock in watchlist
    const toggleWatchlist = useCallback((stock) => {
        if (watchlist.some(s => s.symbol === stock.symbol)) {
            removeFromWatchlist(stock.symbol);
        } else {
            addToWatchlist(stock);
        }
    }, [watchlist, addToWatchlist, removeFromWatchlist]);

    // Check if stock is in watchlist
    const isInWatchlist = useCallback((symbol) => {
        return watchlist.some(s => s.symbol === symbol);
    }, [watchlist]);

    return {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isInWatchlist,
        clearWatchlist,
        watchlistCount: watchlist.length
    };
};

export default useLocalStorage;
