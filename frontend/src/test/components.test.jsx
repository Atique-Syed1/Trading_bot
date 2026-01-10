import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock component for testing
const TestButton = ({ onClick, children, disabled }) => (
  <button onClick={onClick} disabled={disabled} data-testid="test-button">
    {children}
  </button>
);

describe('Component Rendering', () => {
  it('renders button with text', () => {
    render(<TestButton>Click me</TestButton>);
    expect(screen.getByTestId('test-button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('button can be disabled', () => {
    render(<TestButton disabled>Disabled</TestButton>);
    expect(screen.getByTestId('test-button')).toBeDisabled();
  });

  it('button calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<TestButton onClick={handleClick}>Click</TestButton>);
    
    const button = screen.getByTestId('test-button');
    button.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
