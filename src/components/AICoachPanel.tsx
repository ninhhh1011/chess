import React, { useState } from 'react';
import { askCoach, type CoachResponseV1 } from '../services/coachService';
import { getUserProfile } from '../services/userProfileService';
import coachAvatar from '../assets/avatarcoach.webp';
import { BRAND_NAMES } from '../config/brand';
import { isInstagramIntent, NINH_INSTAGRAM_URL } from '../utils/socialIntent';
import type { CoachLevel, Evaluation } from '../types/ChessTypes';
import { AppButton } from '@/ui/AppButton';
import { AppField } from '@/ui/AppField';
import { AppAvatar } from '@/ui/AppAvatar';
import { AppSpinner } from '@/ui/AppSpinner';
import { AppSurface } from '@/ui/AppSurface';
import { SourceDisclosure } from './common/SourceDisclosure';
import { Send, Zap, Eye, Lightbulb } from 'lucide-react';

const COACH_NAME = BRAND_NAMES.coach;

type AdviceType = 'quick' | 'focus' | 'hint' | 'social' | 'custom';

interface CoachAdvice {
  type: AdviceType;
  text: string;
  instagramUrl?: string;
  source?: 'llm' | 'basic' | 'unavailable';
}

interface AICoachPanelProps {
  fen?: string;
  history?: string[];
  pgn?: string;
  turn?: string;
  status?: string;
  stockfish?: {
    evaluation: Evaluation | null;
    bestMove: string | null;
  } | undefined;
  openingContext?: unknown;
}

function renderCoachAdvice(advice: CoachAdvice): React.ReactElement {
  if (advice.type === 'social') {
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-[var(--app-foreground)]">{advice.text}</p>
        {advice.instagramUrl && (
          <a
            href={advice.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--app-accent)] hover:opacity-90 transition-opacity"
          >
            Mở Instagram
          </a>
        )}
      </div>
    );
  }

  // Quick advice
  if (advice.type === 'quick') {
    const parts = (advice.text || '').split(/Điểm cần nhớ:/i);
    const mainText = parts[0].replace(/Nhận xét nhanh/i, '').trim();
    const bullet = parts[1] ? parts[1].trim() : '';

    return (
      <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-[var(--app-foreground)]">{mainText}</p>
        {bullet && (
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2.5 text-xs text-[var(--app-muted)]">
            <span className="font-semibold text-[var(--app-foreground)]">Điểm cần nhớ: </span>
            {bullet}
          </div>
        )}
      </div>
    );
  }

  // Focus advice
  if (advice.type === 'focus') {
    const mainText = (advice.text || '').replace(/Nên chú ý/i, '').trim();
    return <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--app-foreground)]">{mainText}</p>;
  }

  // Hint advice
  if (advice.type === 'hint') {
    const parts = (advice.text || '').split(/Vì sao:/i);
    const mainText = parts[0].replace(/Gợi ý nước đi|Ninh mách nước/i, '').trim();
    const reason = parts[1] ? parts[1].trim() : '';

    return (
      <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-[var(--app-foreground)]">{mainText}</p>
        {reason && (
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2.5 text-xs text-[var(--app-muted)]">
            <span className="font-semibold text-[var(--app-foreground)]">Vì sao: </span>
            {reason}
          </div>
        )}
      </div>
    );
  }

  return <p className="text-xs leading-relaxed text-[var(--app-foreground)]">{advice.text}</p>;
}

export default function AICoachPanel({ fen, history = [], pgn = '', stockfish }: AICoachPanelProps) {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  async function getAdvice(type: string): Promise<void> {
    if (isLoading) return;
    setIsLoading(true);
    setAdvice(null);

    const userProfile = getUserProfile();
    const level = (userProfile.currentLevel || 'beginner') as CoachLevel;

    // Check Instagram Intent
    if (isInstagramIntent(type)) {
      setAdvice({
        type: 'social',
        text: 'Instagram của Ninh ở đây:',
        instagramUrl: NINH_INSTAGRAM_URL,
      });
      setIsLoading(false);
      return;
    }

    try {
      const result: CoachResponseV1 = await askCoach({
        question: type,
        fen,
        history,
        pgn,
        playerLevel: level,
        responseStyle: 'short',
      });

      setAdvice({
        type: type as AdviceType,
        text: result.reply,
        source: result.source,
      });
    } catch {
      setAdvice({ type: 'custom', text: 'Không thể tải nhận xét từ Coach. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!customMessage.trim()) return;
    getAdvice(customMessage);
    setCustomMessage('');
  };

  const disclosureSource = advice?.source === 'llm'
    ? 'coach-llm'
    : advice?.source === 'unavailable'
      ? 'unavailable'
      : 'coach-basic';

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--app-border)] pb-3">
        <AppAvatar src={coachAvatar} name={COACH_NAME} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[var(--app-foreground)]">{COACH_NAME}</h3>
          <p className="text-[11px] text-[var(--app-muted)]">Phân tích nước cờ thực tế</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <AppButton
          size="sm"
          variant="secondary"
          disabled={isLoading}
          onClick={() => getAdvice('Nhận xét nhanh')}
          className="text-xs py-2 px-1"
          leftIcon={<Zap className="h-3 w-3 text-[var(--app-copper)]" />}
        >
          Nhận xét
        </AppButton>
        <AppButton
          size="sm"
          variant="secondary"
          disabled={isLoading}
          onClick={() => getAdvice('Nên chú ý điều gì?')}
          className="text-xs py-2 px-1"
          leftIcon={<Eye className="h-3 w-3 text-[var(--app-warning)]" />}
        >
          Chú ý
        </AppButton>
        <AppButton
          size="sm"
          variant="secondary"
          disabled={isLoading}
          onClick={() => getAdvice('Gợi ý nước đi tốt nhất')}
          className="text-xs py-2 px-1"
          leftIcon={<Lightbulb className="h-3 w-3 text-[var(--app-accent)]" />}
        >
          Gợi ý
        </AppButton>
      </div>

      {/* Custom Input Form */}
      <form onSubmit={handleCustomSubmit} className="flex gap-1.5">
        <div className="flex-1 min-w-0">
          <AppField
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            disabled={isLoading}
            placeholder="Hỏi Coach về thế cờ..."
            className="h-8 text-xs"
          />
        </div>
        <AppButton
          type="submit"
          size="sm"
          variant="primary"
          disabled={isLoading || !customMessage.trim()}
          leftIcon={<Send className="h-3 w-3" />}
          className="h-8 shrink-0"
        >
          Gửi
        </AppButton>
      </form>

      {/* Advice Display Box */}
      <AppSurface
        variant="raised"
        radius="sm"
        className="min-h-[100px] p-3 bg-[var(--app-surface-raised)]/60"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-[var(--app-muted)]">
            <AppSpinner size="md" />
            <span className="text-xs font-medium">Coach đang phân tích...</span>
          </div>
        ) : advice ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                {advice.type === 'quick' && 'Nhận xét nhanh'}
                {advice.type === 'focus' && 'Nên chú ý'}
                {advice.type === 'hint' && 'Gợi ý nước đi'}
                {advice.type === 'social' && 'Thông tin'}
                {advice.type === 'custom' && 'Trả lời'}
              </span>
              {advice.source && (
                <span className="text-[10px] font-mono text-[var(--app-muted)]">
                  {advice.source === 'llm'
                    ? 'AI Coach'
                    : advice.source === 'basic'
                      ? 'Diễn giải cơ bản'
                      : 'Không khả dụng'}
                </span>
              )}
            </div>
            {renderCoachAdvice(advice)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--app-muted)]">
            <p className="text-xs">Bấm các nút phía trên hoặc đặt câu hỏi về thế cờ hiện tại.</p>
          </div>
        )}
      </AppSurface>

      {/* Truthful Source Disclosure */}
      <SourceDisclosure source={disclosureSource} compact={true} />
    </div>
  );
}
