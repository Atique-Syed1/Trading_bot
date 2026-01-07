import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, Loader, X, CheckCircle, Clock } from 'lucide-react';
import API from '../../config/api';

export const AlertSettings = ({ isOpen, onClose }) => {
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newAlert, setNewAlert] = useState({ symbol: '', condition: 'ABOVE', price: '' });
    const [availableSymbols, setAvailableSymbols] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'triggered'
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
            fetchSymbols();
        }
    }, [isOpen]);

    const fetchSymbols = async () => {
        try {
            const response = await fetch(API.STOCKS_LIST);
            const data = await response.json();
            setAvailableSymbols(data.symbols || []);
        } catch (err) {
            console.error("Failed to fetch symbols", err);
        }
    };

    const fetchAlerts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API.ALERTS);
            const data = await response.json();
            setAlerts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');

        if (!availableSymbols.includes(newAlert.symbol.toUpperCase())) {
            setError(`"${newAlert.symbol}" is not in our stock list.`);
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(API.ALERTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: newAlert.symbol.toUpperCase(),
                    condition: newAlert.condition,
                    price: parseFloat(newAlert.price)
                })
            });

            if (response.ok) {
                setNewAlert({ symbol: '', condition: 'ABOVE', price: '' });
                fetchAlerts();
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to save alert');
            }
        } catch (e) {
            setError('Connection failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(API.ALERT_ITEM(id), { method: 'DELETE' });
            setAlerts(alerts.filter(a => a.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const activeAlerts = alerts.filter(a => a.active);
    const triggeredAlerts = alerts.filter(a => !a.active);
    const currentList = activeTab === 'active' ? activeAlerts : triggeredAlerts;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-yellow-900/40 to-orange-900/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center border border-yellow-500/30">
                            <Bell className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Price Alerts</h3>
                            <p className="text-[10px] text-yellow-300 uppercase tracking-widest">Real-time Notifications</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Tabs */}
                    <div className="flex bg-gray-800 rounded-lg p-1 mb-6 border border-gray-700">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'active' ? 'bg-yellow-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Bell className="w-3.5 h-3.5" />
                            ACTIVE ({activeAlerts.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('triggered')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'triggered' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            TRIGGERED ({triggeredAlerts.length})
                        </button>
                    </div>

                    {/* Add Alert Form */}
                    {activeTab === 'active' && (
                        <form onSubmit={handleAdd} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Stock Symbol</label>
                                    <input
                                        list="alert-symbols"
                                        placeholder="SYMBOL"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white uppercase text-sm focus:border-yellow-500 outline-none transition-colors"
                                        value={newAlert.symbol}
                                        required
                                        onChange={e => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '') })}
                                    />
                                    <datalist id="alert-symbols">
                                        {availableSymbols.map(s => <option key={s} value={s} />)}
                                    </datalist>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Condition</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm focus:border-yellow-500 outline-none transition-colors"
                                        value={newAlert.condition}
                                        onChange={e => setNewAlert({ ...newAlert, condition: e.target.value })}
                                    >
                                        <option value="ABOVE">ABOVE (≥)</option>
                                        <option value="BELOW">BELOW (≤)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Target Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        placeholder="0.00"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 outline-none transition-colors"
                                        value={newAlert.price}
                                        required
                                        onChange={e => setNewAlert({ ...newAlert, price: e.target.value })}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="self-end bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-yellow-900/20 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    SET ALERT
                                </button>
                            </div>
                            {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
                        </form>
                    )}

                    {/* Alert List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center py-12"><Loader className="w-8 h-8 animate-spin text-yellow-500" /></div>
                        ) : currentList.length === 0 ? (
                            <div className="text-center py-12 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
                                <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3 opacity-20" />
                                <p className="text-gray-500 text-sm">No {activeTab} alerts found.</p>
                            </div>
                        ) : (
                            currentList.map(alert => (
                                <div key={alert.id} className="group relative bg-gray-800 border border-gray-700 p-4 rounded-xl hover:border-yellow-500/50 transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.active ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {alert.active ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white">{alert.symbol}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${alert.condition === 'ABOVE' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>
                                                        {alert.condition}
                                                    </span>
                                                </div>
                                                <div className="text-xl font-bold text-yellow-500">₹{alert.target_price || alert.price}</div>
                                                {!alert.active && alert.triggered_at && (
                                                    <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Triggered {new Date(alert.triggered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(alert.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
