import { useState, useEffect, useCallback } from 'react';
import API from '../config/api';

export const useWatchlist = () => {
    const [watchlist, setWatchlist] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchWatchlist = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API.WATCHLIST);
            if (response.ok) {
                const data = await response.json();
                setWatchlist(data);
            }
        } catch (err) {
            console.error("Failed to fetch watchlist", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWatchlist();
    }, [fetchWatchlist]);

    const addToWatchlist = async (stock) => {
        try {
            const response = await fetch(API.WATCHLIST_ITEM(stock.symbol), {
                method: 'POST'
            });
            if (response.ok) {
                fetchWatchlist();
            }
        } catch (err) {
            console.error("Failed to add to watchlist", err);
        }
    };

    const removeFromWatchlist = async (symbol) => {
        try {
            const response = await fetch(API.WATCHLIST_ITEM(symbol), {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchWatchlist();
            }
        } catch (err) {
            console.error("Failed to remove from watchlist", err);
        }
    };

    const toggleWatchlist = async (stock) => {
        if (watchlist.some(s => s.symbol === stock.symbol)) {
            await removeFromWatchlist(stock.symbol);
        } else {
            await addToWatchlist(stock);
        }
    };

    const isInWatchlist = (symbol) => {
        return watchlist.some(s => s.symbol === symbol);
    };

    const clearWatchlist = async () => {
        try {
            await fetch(API.WATCHLIST, { method: 'DELETE' });
            fetchWatchlist();
        } catch (err) {
            console.error("Failed to clear watchlist", err);
        }
    };

    return {
        watchlist,
        isLoading,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isInWatchlist,
        clearWatchlist,
        watchlistCount: watchlist.length
    };
};

export default useWatchlist;
