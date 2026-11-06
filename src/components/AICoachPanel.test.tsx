import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AICoachPanel from './AICoachPanel';

const mocks = vi.hoisted(() => ({ askCoach: vi.fn(), getUserProfile: vi.fn() }));
vi.mock('../services/coachService', () => ({ askCoach: mocks.askCoach }));
vi.mock('../services/userProfileService', () => ({ getUserProfile: mocks.getUserProfile }));

describe('AICoachPanel request evidence', () => {
  beforeEach(() => {
    mocks.askCoach.mockReset();
    mocks.getUserProfile.mockReturnValue({ currentLevel: 'beginner' });
  });

  it('sends only supported position context and discloses the evidence used', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    mocks.askCoach.mockResolvedValue({
      schemaVersion: 'coach.v1', reply: 'Phát triển mã trước.', source: 'llm',
      engineSource: 'none', knowledgeSource: 'none', evidenceUsed: ['position'], suggestedActions: [],
    });
    render(<AICoachPanel fen={fen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nhận xét' }));

    await waitFor(() => expect(mocks.askCoach).toHaveBeenCalledWith({
      question: 'Nhận xét nhanh', fen, playerLevel: 'beginner', responseStyle: 'short',
    }));
    expect(await screen.findByText('Ngữ cảnh đã dùng: thế cờ hiện tại.')).toBeInTheDocument();
  });

  it('states when no board evidence was used', async () => {
    mocks.askCoach.mockResolvedValue({
      schemaVersion: 'coach.v1', reply: 'Kiểm tra các nước chiếu trước.', source: 'basic',
      engineSource: 'none', knowledgeSource: 'none', evidenceUsed: [], suggestedActions: [],
    });
    render(<AICoachPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Nhận xét' }));

    expect(await screen.findByText('Không dùng phân tích vị trí bàn cờ cho câu trả lời này.')).toBeInTheDocument();
  });
});
