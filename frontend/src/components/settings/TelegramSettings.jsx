import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Send, Settings, CheckCircle, XCircle, Loader, X, ExternalLink } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import API from '../../config/api';

/**
 * Telegram Settings Modal
 */
export const TelegramSettings = ({ isOpen, onClose }) => {
    // Store config in localStorage for UI persistence
    const [savedConfig, setSavedConfig] = useLocalStorage('halaltrade_telegram', {
        bot_token: '',
        chat_id: '',
        enabled: false
    });

    const [config, setConfig] = useState(savedConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        setConfig(savedConfig);
    }, [savedConfig, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(API.TELEGRAM_CONFIG, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_token: config.bot_token,
                    chat_id: config.chat_id,
                    enabled: config.enabled,
                    alert_on_buy: true,
                    alert_on_watchlist_only: false
                })
            });

            const result = await response.json();

            if (result.success) {
                setSavedConfig(config);
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to save configuration' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to connect to backend. Is it running?' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setMessage({ type: '', text: '' });

        try {
            // First save the config
            await fetch(API.TELEGRAM_CONFIG, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_token: config.bot_token,
                    chat_id: config.chat_id,
                    enabled: true,
                    alert_on_buy: true
                })
            });

            // Then send test message
            const response = await fetch(API.TELEGRAM_TEST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: '🔔 HalalTrade Pro Test Alert!\n\nYour Telegram alerts are working correctly. You will receive notifications when Halal stocks hit Buy signals.'
                })
            });

            const result = await response.json();

            if (result.success) {
                setMessage({ type: 'success', text: '✅ Test message sent! Check your Telegram.' });
                setSavedConfig({ ...config, enabled: true });
                setConfig(prev => ({ ...prev, enabled: true }));
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to send test message' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to connect to backend' });
        } finally {
            setIsTesting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-900/50 to-purple-900/50">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-bold text-white">Telegram Alerts</h2>
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
                    {/* Instructions */}
                    <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 text-sm">
                        <p className="text-blue-300 mb-2">📱 <strong>How to set up:</strong></p>
                        <ol className="text-blue-200/80 space-y-1 list-decimal list-inside">
                            <li>Message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@BotFather</a> on Telegram</li>
                            <li>Send <code className="bg-blue-900/50 px-1 rounded">/newbot</code> and follow prompts</li>
                            <li>Copy the Bot Token here</li>
                            <li>Message <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@userinfobot</a> to get your Chat ID</li>
                        </ol>
                    </div>

                    {/* Bot Token */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Bot Token
                        </label>
                        <input
                            type="password"
                            value={config.bot_token}
                            onChange={(e) => setConfig(prev => ({ ...prev, bot_token: e.target.value }))}
                            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Chat ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Chat ID
                        </label>
                        <input
                            type="text"
                            value={config.chat_id}
                            onChange={(e) => setConfig(prev => ({ ...prev, chat_id: e.target.value }))}
                            placeholder="123456789"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                            {config.enabled ? (
                                <Bell className="w-4 h-4 text-green-400" />
                            ) : (
                                <BellOff className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="text-gray-300">Enable Alerts</span>
                        </div>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-green-600' : 'bg-gray-600'
                                }`}
                        >
                            <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
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
                    <button
                        onClick={handleTest}
                        disabled={!config.bot_token || !config.chat_id || isTesting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                        {isTesting ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Test Alert
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                        {isSaving ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <Settings className="w-4 h-4" />
                        )}
                        Save Config
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Telegram Button for Header
 */
export const TelegramButton = ({ onClick, isEnabled }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${isEnabled
            ? 'bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
        title="Configure Telegram Alerts"
    >
        {isEnabled ? (
            <Bell className="w-4 h-4 fill-blue-400" />
        ) : (
            <BellOff className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Alerts</span>
    </button>
);

export default TelegramSettings;
