import { describe, it, expect } from 'vitest';

// Utility functions to test
const formatCurrency = (value, currency = 'INR') => {
  if (value === null || value === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const calculateProfitLoss = (currentPrice, buyPrice, quantity) => {
  const invested = buyPrice * quantity;
  const current = currentPrice * quantity;
  const profitLoss = current - invested;
  const percentage = ((current - invested) / invested) * 100;
  return { profitLoss, percentage, invested, current };
};

const isHalalStock = (stock) => {
  if (!stock) return false;
  const { debtToEquity, interestIncome, revenueFromHaram } = stock;
  
  // Simple halal screening criteria
  if (debtToEquity > 33) return false;
  if (interestIncome > 5) return false;
  if (revenueFromHaram > 5) return false;
  
  return true;
};

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00');
    expect(formatCurrency(1234567.89)).toBe('₹12,34,567.89');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('handles null and undefined', () => {
    expect(formatCurrency(null)).toBe('₹0.00');
    expect(formatCurrency(undefined)).toBe('₹0.00');
  });

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-500)).toBe('-₹500.00');
  });
});

describe('formatPercentage', () => {
  it('formats positive percentages with + sign', () => {
    expect(formatPercentage(5.5)).toBe('+5.50%');
    expect(formatPercentage(100)).toBe('+100.00%');
  });

  it('formats negative percentages', () => {
    expect(formatPercentage(-3.25)).toBe('-3.25%');
  });

  it('formats zero', () => {
    expect(formatPercentage(0)).toBe('+0.00%');
  });

  it('handles null and undefined', () => {
    expect(formatPercentage(null)).toBe('0.00%');
    expect(formatPercentage(undefined)).toBe('0.00%');
  });
});

describe('calculateProfitLoss', () => {
  it('calculates profit correctly', () => {
    const result = calculateProfitLoss(150, 100, 10);
    expect(result.profitLoss).toBe(500);
    expect(result.percentage).toBe(50);
    expect(result.invested).toBe(1000);
    expect(result.current).toBe(1500);
  });

  it('calculates loss correctly', () => {
    const result = calculateProfitLoss(80, 100, 10);
    expect(result.profitLoss).toBe(-200);
    expect(result.percentage).toBe(-20);
  });

  it('handles zero quantity', () => {
    const result = calculateProfitLoss(150, 100, 0);
    expect(result.profitLoss).toBe(0);
    expect(result.current).toBe(0);
  });
});

describe('isHalalStock', () => {
  it('returns true for halal-compliant stock', () => {
    const stock = { debtToEquity: 20, interestIncome: 2, revenueFromHaram: 1 };
    expect(isHalalStock(stock)).toBe(true);
  });

  it('returns false for high debt-to-equity', () => {
    const stock = { debtToEquity: 50, interestIncome: 2, revenueFromHaram: 1 };
    expect(isHalalStock(stock)).toBe(false);
  });

  it('returns false for high interest income', () => {
    const stock = { debtToEquity: 20, interestIncome: 10, revenueFromHaram: 1 };
    expect(isHalalStock(stock)).toBe(false);
  });

  it('returns false for haram revenue', () => {
    const stock = { debtToEquity: 20, interestIncome: 2, revenueFromHaram: 10 };
    expect(isHalalStock(stock)).toBe(false);
  });

  it('handles null input', () => {
    expect(isHalalStock(null)).toBe(false);
  });
});
