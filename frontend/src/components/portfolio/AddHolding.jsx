import React, { useState } from 'react';
import { X, Save, Loader } from 'lucide-react';
import API from '../../config/api';

export const AddHoldingModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        symbol: '',
        type: 'BUY',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(API.PORTFOLIO_TRANSACTION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    quantity: parseInt(formData.quantity),
                    price: parseFloat(formData.price)
                })
            });

            if (response.ok) {
                onSuccess();
                onClose();
                setFormData({
                    symbol: '',
                    type: 'BUY',
                    quantity: '',
                    price: '',
                    date: new Date().toISOString().split('T')[0]
                });
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to add transaction');
            }
        } catch (err) {
            setError('Failed to connect to backend');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h3 className="font-bold text-white">Add Transaction</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Symbol */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Stock Symbol</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white uppercase"
                            placeholder="e.g. RELIANCE"
                            value={formData.symbol}
                            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Type */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Type</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                            </select>
                        </div>
                        {/* Date */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            />
                        </div>
                        {/* Price */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Price (₹)</label>
                            <input
                                type="number"
                                required
                                min="0.1"
                                step="0.05"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Transaction
                    </button>
                </form>
            </div>
        </div>
    );
};
