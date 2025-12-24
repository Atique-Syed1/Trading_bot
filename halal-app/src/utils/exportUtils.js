import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export utilities for CSV and PDF generation
 */

// ====================================================================
// CSV EXPORT
// ====================================================================

/**
 * Export data as CSV file
 */
export const exportToCSV = (data, filename, headers) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Create CSV content
    const csvRows = [];

    // Add headers
    if (headers) {
        csvRows.push(headers.join(','));
    } else {
        csvRows.push(Object.keys(data[0]).join(','));
    }

    // Add data rows
    data.forEach(row => {
        const values = headers
            ? headers.map(h => {
                const val = row[h] ?? '';
                // Escape quotes and wrap in quotes if contains comma
                return typeof val === 'string' && val.includes(',')
                    ? `"${val.replace(/"/g, '""')}"`
                    : val;
            })
            : Object.values(row).map(val => {
                return typeof val === 'string' && val.includes(',')
                    ? `"${val.replace(/"/g, '""')}"`
                    : val;
            });
        csvRows.push(values.join(','));
    });

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
};

/**
 * Export scan results to CSV
 */
export const exportScanResultsCSV = (stocks) => {
    const data = stocks.map(stock => ({
        Symbol: stock.symbol,
        Name: stock.name,
        Sector: stock.sector,
        Price: stock.price,
        'Shariah Status': stock.shariahStatus,
        RSI: stock.technicals?.rsi || 'N/A',
        Signal: stock.technicals?.signal || 'N/A',
        'Stop Loss': stock.technicals?.sl || 'N/A',
        Target: stock.technicals?.tp || 'N/A',
        'Potential Gain %': stock.technicals?.gain || 'N/A'
    }));

    exportToCSV(data, `halaltrade_scan_${getDateStr()}`, [
        'Symbol', 'Name', 'Sector', 'Price', 'Shariah Status',
        'RSI', 'Signal', 'Stop Loss', 'Target', 'Potential Gain %'
    ]);
};

/**
 * Export watchlist to CSV
 */
export const exportWatchlistCSV = (watchlist, stocks) => {
    const data = watchlist.map(item => {
        const stock = stocks.find(s => s.symbol === item.symbol) || {};
        return {
            Symbol: item.symbol,
            Name: stock.name || item.symbol,
            'Added Price': item.addedPrice,
            'Current Price': stock.price || 'N/A',
            'P&L %': stock.price
                ? (((stock.price - item.addedPrice) / item.addedPrice) * 100).toFixed(2)
                : 'N/A',
            'Added Date': new Date(item.addedAt).toLocaleDateString()
        };
    });

    exportToCSV(data, `halaltrade_watchlist_${getDateStr()}`, [
        'Symbol', 'Name', 'Added Price', 'Current Price', 'P&L %', 'Added Date'
    ]);
};

// ====================================================================
// PDF EXPORT
// ====================================================================

/**
 * Export scan results to PDF
 */
export const exportScanResultsPDF = (stocks, title = 'HalalTrade Pro - Scan Report') => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Green
    doc.text('HalalTrade Pro', 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Shariah-Compliant Stock Scanner', 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

    // Summary stats
    const halalCount = stocks.filter(s => s.shariahStatus === 'Halal').length;
    const buySignals = stocks.filter(s => s.technicals?.signal === 'Buy').length;

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`Total Stocks: ${stocks.length}  |  Halal: ${halalCount}  |  Buy Signals: ${buySignals}`, 14, 45);

    // Table
    const tableData = stocks.map(stock => [
        stock.symbol,
        stock.name?.substring(0, 20) || '',
        `₹${stock.price?.toFixed(2) || 'N/A'}`,
        stock.shariahStatus,
        stock.technicals?.rsi || 'N/A',
        stock.technicals?.signal || 'N/A'
    ]);

    doc.autoTable({
        head: [['Symbol', 'Name', 'Price', 'Shariah', 'RSI', 'Signal']],
        body: tableData,
        startY: 52,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didParseCell: function (data) {
            // Color code Shariah status
            if (data.column.index === 3) {
                if (data.cell.raw === 'Halal') {
                    data.cell.styles.textColor = [16, 185, 129];
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.raw === 'Non-Halal') {
                    data.cell.styles.textColor = [239, 68, 68];
                }
            }
            // Color code Signal
            if (data.column.index === 5) {
                if (data.cell.raw === 'Buy') {
                    data.cell.styles.textColor = [16, 185, 129];
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.raw === 'Sell') {
                    data.cell.styles.textColor = [239, 68, 68];
                }
            }
        }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount} | HalalTrade Pro`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    doc.save(`halaltrade_scan_${getDateStr()}.pdf`);
};

/**
 * Export backtest results to PDF
 */
export const exportBacktestPDF = (results) => {
    if (!results || !results.success) {
        alert('No backtest results to export');
        return;
    }

    const doc = new jsPDF();
    const { summary, trades } = results;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(249, 115, 22); // Orange
    doc.text('Backtest Report', 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(`${results.symbol} - RSI+SMA Strategy`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Period: ${summary.startDate} to ${summary.endDate}`, 14, 38);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

    // Performance Summary Box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 52, 180, 45, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setTextColor(50);

    // Row 1
    doc.text(`Initial Capital: ₹${summary.initialCapital.toLocaleString()}`, 20, 62);
    doc.text(`Final Capital: ₹${summary.finalCapital.toLocaleString()}`, 80, 62);

    // Row 2
    const returnColor = summary.totalReturn >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(...returnColor);
    doc.text(`Total Return: ${summary.totalReturn >= 0 ? '+' : ''}${summary.totalReturn}%`, 20, 72);

    doc.setTextColor(50);
    doc.text(`Buy & Hold: ${summary.buyHoldReturn >= 0 ? '+' : ''}${summary.buyHoldReturn}%`, 80, 72);

    // Row 3
    doc.text(`Win Rate: ${summary.winRate}%`, 20, 82);
    doc.text(`Max Drawdown: -${summary.maxDrawdown}%`, 80, 82);
    doc.text(`Total Trades: ${summary.totalTrades}`, 140, 82);

    // Row 4
    doc.text(`Winning: ${summary.winningTrades}`, 20, 92);
    doc.text(`Losing: ${summary.losingTrades}`, 80, 92);

    const outColor = summary.outperformance >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(...outColor);
    doc.text(`Outperformance: ${summary.outperformance >= 0 ? '+' : ''}${summary.outperformance}%`, 140, 92);

    // Trade History
    if (trades && trades.length > 0) {
        doc.setTextColor(50);
        doc.setFontSize(12);
        doc.text('Trade History', 14, 110);

        const tradeData = trades.map(t => [
            t.date,
            t.type,
            `₹${t.price}`,
            t.shares,
            t.rsi || '-',
            t.profit !== undefined ? `₹${t.profit}` : '-',
            t.profitPct !== undefined ? `${t.profitPct}%` : '-'
        ]);

        doc.autoTable({
            head: [['Date', 'Type', 'Price', 'Shares', 'RSI', 'P&L', 'P&L %']],
            body: tradeData,
            startY: 115,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [249, 115, 22] },
            didParseCell: function (data) {
                // Color code buy/sell
                if (data.column.index === 1) {
                    if (data.cell.raw === 'BUY') {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else if (data.cell.raw?.startsWith('SELL')) {
                        data.cell.styles.textColor = [239, 68, 68];
                    }
                }
            }
        });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
        'HalalTrade Pro - Backtest Report',
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
    );

    doc.save(`backtest_${results.symbol}_${getDateStr()}.pdf`);
};

// ====================================================================
// HELPERS
// ====================================================================

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getDateStr() {
    return new Date().toISOString().split('T')[0];
}

export default {
    exportToCSV,
    exportScanResultsCSV,
    exportWatchlistCSV,
    exportScanResultsPDF,
    exportBacktestPDF
};
