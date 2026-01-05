import React, { useState, useEffect, useRef } from 'react';
import { Database, Upload, RefreshCw, X, CheckCircle, XCircle, Loader, FileText, List, Trash2 } from 'lucide-react';
import API from '../../config/api';

/**
 * Stock List Settings Modal
 */
export const StockListSettings = ({ isOpen, onClose, onListChange }) => {
    const [listInfo, setListInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchListInfo();
        }
    }, [isOpen]);

    const fetchListInfo = async () => {
        try {
            const response = await fetch(API.STOCKS_LIST);
            const data = await response.json();
            setListInfo(data);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to fetch stock list info' });
        }
    };

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(API.STOCKS_UPLOAD, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                fetchListInfo();
                onListChange?.();
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to upload file' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleReset = async () => {
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(API.STOCKS_RESET, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                setMessage({ type: 'success', text: 'Reset to default stock list' });
                fetchListInfo();
                onListChange?.();
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to reset' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-purple-900/50 to-indigo-900/50">
                    <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold text-white">Stock Universe</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Current List Info */}
                    {listInfo && (
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-400" />
                                    <span className="text-white font-medium">{listInfo.name}</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ${listInfo.source === 'csv' ? 'bg-green-900/30 text-green-400' :
                                    listInfo.source === 'upload' ? 'bg-blue-900/30 text-blue-400' :
                                        'bg-gray-700 text-gray-400'
                                    }`}>
                                    {listInfo.source.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <List className="w-3 h-3" />
                                    {listInfo.count} stocks
                                </span>
                            </div>
                            {listInfo.symbols && listInfo.symbols.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {listInfo.symbols.slice(0, 10).map(s => (
                                        <span key={s} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                                            {s}
                                        </span>
                                    ))}
                                    {listInfo.count > 10 && (
                                        <span className="text-xs text-gray-500">
                                            +{listInfo.count - 10} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4 text-sm">
                        <p className="text-purple-300 mb-2">📋 <strong>CSV Format:</strong></p>
                        <code className="text-xs bg-purple-900/50 px-2 py-1 rounded text-purple-200 block">
                            symbol,name,sector<br />
                            RELIANCE,Reliance Industries,Oil & Gas<br />
                            TCS,Tata Consultancy,Technology<br />
                            ...
                        </code>
                        <p className="text-purple-200/70 mt-2 text-xs">
                            The <code>symbol</code> column is required. <code>name</code> and <code>sector</code> are optional.
                        </p>
                    </div>

                    {/* Message */}
                    {message.text && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-green-900/30 text-green-400 border border-green-800'
                            : 'bg-red-900/30 text-red-400 border border-red-800'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        Upload CSV
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading || listInfo?.source === 'default'}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Stock List Button for Header
 */
export const StockListButton = ({ onClick, listName, count }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
        title="Manage Stock Universe"
    >
        <Database className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">{count || '?'} stocks</span>
    </button>
);

export default StockListSettings;
