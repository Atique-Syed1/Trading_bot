import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock useLocalStorage hook
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

describe('useLocalStorage', () => {
  beforeEach(() => {
    global.localStorage.getItem.mockClear();
    global.localStorage.setItem.mockClear();
  });

  it('returns initial value when localStorage is empty', () => {
    global.localStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current[0]).toBe('default');
  });

  it('returns stored value from localStorage', () => {
    global.localStorage.getItem.mockReturnValue(JSON.stringify('stored-value'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current[0]).toBe('stored-value');
  });

  it('updates localStorage when value changes', () => {
    global.localStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(global.localStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
    expect(result.current[0]).toBe('new-value');
  });

  it('handles objects correctly', () => {
    global.localStorage.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }));
    
    act(() => {
      result.current[1]({ count: 5 });
    });
    
    expect(global.localStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify({ count: 5 }));
  });

  it('handles function updates', () => {
    global.localStorage.getItem.mockReturnValue(JSON.stringify(10));
    
    const { result } = renderHook(() => useLocalStorage('counter', 0));
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    
    expect(result.current[0]).toBe(11);
  });
});
