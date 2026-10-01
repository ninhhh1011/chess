import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Learn from './Learn';

// Mock react-chessboard
vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="mock-chessboard" />,
}));

describe('Learn page', () => {
  it('renders lessons list and selects a lesson', () => {
    render(
      <MemoryRouter>
        <Learn />
      </MemoryRouter>
    );

    expect(screen.getByText('Học cờ cơ bản')).toBeInTheDocument();
    // Click on the first lesson card
    const firstLessonTitle = screen.getByText('Bàn cờ và tọa độ');
    expect(firstLessonTitle).toBeInTheDocument();

    const lessonCard = firstLessonTitle.closest('[data-slot="card"]') || firstLessonTitle.closest('div');
    fireEvent.click(lessonCard);

    // After clicking, detail view is shown
    expect(screen.getByText('Quay lại danh sách bài học')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chessboard')).toBeInTheDocument();
  });
});
