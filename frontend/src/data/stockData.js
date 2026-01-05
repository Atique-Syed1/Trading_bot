// Stock sector database and mock data generation
export const SECTOR_DATABASE = {
    'RELIANCE': { name: 'Reliance Industries', sector: 'Oil & Gas', debt: 0.24, cash: 0.05 },
    'TCS': { name: 'Tata Consultancy Svcs', sector: 'Technology', debt: 0.00, cash: 0.15 },
    'HDFCBANK': { name: 'HDFC Bank', sector: 'Banking', debt: 0.85, cash: 0.10 },
    'INFY': { name: 'Infosys', sector: 'Technology', debt: 0.01, cash: 0.12 },
    'ITC': { name: 'ITC Ltd', sector: 'Tobacco', debt: 0.00, cash: 0.18 },
    'HINDUNILVR': { name: 'Hindustan Unilever', sector: 'Consumer Goods', debt: 0.01, cash: 0.08 },
    'BAJFINANCE': { name: 'Bajaj Finance', sector: 'Finance', debt: 0.75, cash: 0.05 },
    'ASIANPAINT': { name: 'Asian Paints', sector: 'Consumer Goods', debt: 0.02, cash: 0.06 },
    'MARUTI': { name: 'Maruti Suzuki', sector: 'Automotive', debt: 0.01, cash: 0.25 },
    'TITAN': { name: 'Titan Company', sector: 'Consumer Goods', debt: 0.12, cash: 0.04 },
    'SUNPHARMA': { name: 'Sun Pharma', sector: 'Healthcare', debt: 0.08, cash: 0.11 },
    'ULTRACEMCO': { name: 'UltraTech Cement', sector: 'Materials', debt: 0.28, cash: 0.02 },
    'POWERGRID': { name: 'Power Grid Corp', sector: 'Utilities', debt: 0.60, cash: 0.03 },
    'NTPC': { name: 'NTPC Ltd', sector: 'Utilities', debt: 0.65, cash: 0.02 },
    'M&M': { name: 'Mahindra & Mahindra', sector: 'Automotive', debt: 0.45, cash: 0.10 },
    'CIPLA': { name: 'Cipla', sector: 'Healthcare', debt: 0.05, cash: 0.09 },
    'SBIN': { name: 'State Bank of India', sector: 'Banking', debt: 0.92, cash: 0.05 },
};

// Shariah Screening Constants (AAOIFI)
export const MAX_DEBT_RATIO = 0.30;
export const MAX_CASH_RATIO = 0.30;
export const PROHIBITED_SECTORS = [
    'Banking', 'Finance', 'Insurance', 'Alcohol',
    'Tobacco', 'Gambling', 'Pork', 'Defense', 'Entertainment'
];

// Generate mock price history
export const generatePriceHistory = (basePrice) => {
    const prices = [basePrice];
    for (let i = 0; i < 50; i++) {
        const change = (Math.random() - 0.5) * (basePrice * 0.05);
        prices.push(prices[prices.length - 1] + change);
    }
    return prices;
};

// Calculate RSI locally for Simulation mode
export const calculateRSI = (prices, period = 14) => {
    if (!prices || prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

// Generate mock stock data for simulation mode
export const generateMockData = () => {
    return Object.keys(SECTOR_DATABASE).map(symbol => {
        const baseData = SECTOR_DATABASE[symbol];
        const basePrice = Math.floor(Math.random() * 3000) + 500;
        const history = generatePriceHistory(basePrice);
        const currentPrice = history[history.length - 1];
        const rsi = calculateRSI(history);

        // Simulate Shariah Check
        let shariahStatus = 'Halal';
        let shariahReason = 'Compliant';
        if (PROHIBITED_SECTORS.some(s => baseData.sector.includes(s))) {
            shariahStatus = 'Non-Halal';
            shariahReason = `Sector: ${baseData.sector}`;
        } else if (baseData.debt > MAX_DEBT_RATIO) {
            shariahStatus = 'Non-Halal';
            shariahReason = 'High Debt';
        }

        // Simulate Signal
        let signal = 'Neutral';
        if (rsi < 40) signal = 'Buy';
        if (rsi > 70) signal = 'Sell';

        const atr = currentPrice * 0.02;

        return {
            symbol,
            name: baseData.name,
            sector: baseData.sector,
            price: currentPrice,
            priceHistory: history.slice(-20), // Last 20 prices for sparkline
            financials: { debtToMcap: baseData.debt, cashToMcap: baseData.cash },
            shariahStatus,
            shariahReason,
            technicals: {
                rsi: rsi.toFixed(1),
                signal,
                signalStrength: signal === 'Buy' ? 80 : 0,
                sl: (currentPrice - 2 * atr).toFixed(1),
                tp: (currentPrice + 3 * atr).toFixed(1),
                gain: 3.5
            }
        };
    });
};
