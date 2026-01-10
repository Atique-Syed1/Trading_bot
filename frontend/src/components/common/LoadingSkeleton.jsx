import React from 'react';
import { Loader } from 'lucide-react';

/**
 * Loading skeleton for lazy-loaded components
 */
export const LoadingSkeleton = ({ height = 'h-64', message = 'Loading...' }) => {
    return (
        <div className={`flex flex-col items-center justify-center ${height} bg-gray-800/30 rounded-xl border border-gray-700/50`}>
            <Loader className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-gray-400 text-sm">{message}</p>
        </div>
    );
};

/**
 * Full page loading skeleton
 */
export const PageLoadingSkeleton = () => {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <Loader className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-400">Loading content...</p>
        </div>
    );
};

/**
 * Card skeleton for dashboard
 */
export const CardSkeleton = () => {
    return (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/4"></div>
        </div>
    );
};

/**
 * Table skeleton for stock table
 */
export const TableSkeleton = ({ rows = 5 }) => {
    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700/50">
                <div className="flex gap-4">
                    <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                </div>
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-700/30 flex gap-4">
                    <div className="h-4 bg-gray-700/50 rounded w-28 animate-pulse"></div>
                    <div className="h-4 bg-gray-700/50 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-700/50 rounded w-20 animate-pulse"></div>
                </div>
            ))}
        </div>
    );
};

/**
 * Modal loading skeleton
 */
export const ModalSkeleton = () => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 flex flex-col items-center">
                <Loader className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-gray-300">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingSkeleton;
