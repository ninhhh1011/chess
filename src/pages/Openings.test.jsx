import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Openings from './Openings';

describe('Openings page', () => {
  it('renders title and filters openings', () => {
    render(
      <MemoryRouter>
        <Openings />
      </MemoryRouter>
    );

    expect(screen.getByText('Lò luyện khai cuộc')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cho Trắng' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cho Đen' })).toBeInTheDocument();

    // Click Cho Đen tab
    const blackTab = screen.getByRole('tab', { name: 'Cho Đen' });
    fireEvent.click(blackTab);
    expect(blackTab).toHaveAttribute('aria-selected', 'true');
  });
});
