import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Calendar, Loader } from 'lucide-react';
import API from '../../config/api';

export const NewsPanel = ({ symbol }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (symbol) {
            fetchNews();
        }
    }, [symbol]);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await fetch(API.NEWS(symbol));
            const data = await res.json();
            setNews(data);
        } catch (e) {
            console.error("Failed to fetch news", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Loader className="w-6 h-6 animate-spin mb-2" />
                <p>Fetching latest news...</p>
            </div>
        );
    }

    if (news.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Newspaper className="w-8 h-8 mb-2 opacity-50" />
                <p>No recent news found for {symbol}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-400" />
                Recent News
            </h3>

            <div className="grid grid-cols-1 gap-3">
                {news.map((item) => (
                    <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg p-3 transition-colors group"
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                                <div className="text-xs text-blue-400 mb-1 flex items-center gap-2">
                                    <span className="font-bold">{item.publisher}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {item.date}
                                    </span>
                                </div>
                                <h4 className="text-white group-hover:text-blue-300 font-medium leading-snug mb-2">
                                    {item.title}
                                </h4>
                            </div>
                            {item.thumbnail && (
                                <img
                                    src={item.thumbnail}
                                    alt="News"
                                    className="w-16 h-16 object-cover rounded-md bg-gray-700"
                                />
                            )}
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};
