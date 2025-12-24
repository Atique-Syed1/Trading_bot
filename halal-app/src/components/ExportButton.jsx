import React from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { exportScanResultsCSV, exportScanResultsPDF, exportWatchlistCSV } from '../utils/exportUtils';

/**
 * Export Dropdown Button
 */
export const ExportButton = ({ stocks, type = 'scan', watchlist = [] }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExportCSV = () => {
        if (type === 'watchlist') {
            exportWatchlistCSV(watchlist, stocks);
        } else {
            exportScanResultsCSV(stocks);
        }
        setIsOpen(false);
    };

    const handleExportPDF = () => {
        if (type === 'scan') {
            exportScanResultsPDF(stocks);
        }
        setIsOpen(false);
    };

    if (!stocks || stocks.length === 0) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors border border-gray-700"
                title="Export Data"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Export</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                        onClick={handleExportCSV}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left text-gray-300 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                        <div>
                            <div className="text-sm font-medium">Export CSV</div>
                            <div className="text-xs text-gray-500">Spreadsheet format</div>
                        </div>
                    </button>
                    {type === 'scan' && (
                        <button
                            onClick={handleExportPDF}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 text-left text-gray-300 transition-colors border-t border-gray-700"
                        >
                            <FileText className="w-4 h-4 text-red-400" />
                            <div>
                                <div className="text-sm font-medium">Export PDF</div>
                                <div className="text-xs text-gray-500">Printable report</div>
                            </div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Simple Export Buttons Row
 */
export const ExportButtons = ({ stocks, onExportCSV, onExportPDF }) => (
    <div className="flex gap-2">
        <button
            onClick={onExportCSV || (() => exportScanResultsCSV(stocks))}
            disabled={!stocks || stocks.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <FileSpreadsheet className="w-4 h-4" />
            CSV
        </button>
        {onExportPDF !== false && (
            <button
                onClick={onExportPDF || (() => exportScanResultsPDF(stocks))}
                disabled={!stocks || stocks.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FileText className="w-4 h-4" />
                PDF
            </button>
        )}
    </div>
);

export default ExportButton;
