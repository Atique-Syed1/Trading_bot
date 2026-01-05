import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, Loader } from 'lucide-react';
import API from '../../config/api';

export const AlertSettings = ({ isOpen, onClose }) => {
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newAlert, setNewAlert] = useState({ symbol: '', condition: 'ABOVE', price: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) fetchAlerts();
    }, [isOpen]);

    const fetchAlerts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API.API_BASE}/api/alerts/`);
            const data = await res.json();
            setAlerts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await fetch(`${API.API_BASE}/api/alerts/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newAlert,
                    symbol: newAlert.symbol.toUpperCase(),
                    price: parseFloat(newAlert.price)
                })
            });
            setNewAlert({ symbol: '', condition: 'ABOVE', price: '' });
            fetchAlerts();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${API.API_BASE}/api/alerts/${id}`, { method: 'DELETE' });
            setAlerts(alerts.filter(a => a.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-bold text-white">Price Alerts</h3>
                    </div>
                </div>

                <div className="p-6">
                    {/* Add Alert Form */}
                    <form onSubmit={handleAdd} className="flex gap-2 mb-6 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Symbol</label>
                            <input
                                placeholder="TCS"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white uppercase text-sm"
                                value={newAlert.symbol}
                                required
                                onChange={e => setNewAlert({ ...newAlert, symbol: e.target.value })}
                            />
                        </div>
                        <div className="w-28">
                            <label className="text-xs text-gray-500 block mb-1">Condition</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-2 text-white text-sm"
                                value={newAlert.condition}
                                onChange={e => setNewAlert({ ...newAlert, condition: e.target.value })}
                            >
                                <option value="ABOVE">Above (&gt;)</option>
                                <option value="BELOW">Below (&lt;)</option>
                            </select>
                        </div>
                        <div className="w-28">
                            <label className="text-xs text-gray-500 block mb-1">Price</label>
                            <input
                                type="number"
                                placeholder="1000"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                                value={newAlert.price}
                                required
                                onChange={e => setNewAlert({ ...newAlert, price: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded transition-colors"
                        >
                            {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </form>

                    {/* Alert List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center py-4"><Loader className="w-6 h-6 animate-spin mx-auto text-gray-500" /></div>
                        ) : alerts.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-4">No alerts set.</p>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`flex justify-between items-center p-3 rounded border ${alert.active ? 'bg-gray-700/50 border-gray-600' : 'bg-red-900/10 border-red-900/30 opacity-60'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-full ${alert.active ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-700 text-gray-500'}`}>
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm flex gap-2">
                                                {alert.symbol}
                                                <span className="text-gray-400 font-normal">
                                                    is {alert.condition.toLowerCase()}
                                                </span>
                                                <span className="text-yellow-400">₹{alert.price}</span>
                                            </div>
                                            {!alert.active && <div className="text-xs text-red-400">Triggered: {new Date(alert.triggered_at).toLocaleString()}</div>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(alert.id)} className="text-gray-500 hover:text-red-400 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
