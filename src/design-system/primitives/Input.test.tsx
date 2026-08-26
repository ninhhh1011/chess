import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('shows hint message', () => {
    render(<Input label="Password" hint="Minimum 8 characters" />);
    expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument();
  });

  it('renders with icons', () => {
    const leftIcon = <span data-testid="left-icon">🔑</span>;
    const rightIcon = <span data-testid="right-icon">👁️</span>;

    render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('disables correctly', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });
});
