import React, { useState } from 'react';
import { askCoach, getCoachStatus, type CoachResponseV1 } from '../services/coachService';
import { getUserProfile } from '../services/userProfileService';
import { isEngineReady } from '../services/stockfishService';
import coachAvatar from '../assets/avatarcoach.webp';
import { BRAND_NAMES, UI_COPY } from '../config/brand';
import { isInstagramIntent, NINH_INSTAGRAM_URL } from '../utils/socialIntent';
import type { CoachLevel, Evaluation } from '../types/ChessTypes';

const COACH_NAME = BRAND_NAMES.coach;

type AdviceType = 'quick' | 'focus' | 'hint' | 'social' | 'custom';

interface CoachAdvice {
  type: AdviceType;
  text: string;
  instagramUrl?: string;
  source?: 'llm' | 'basic' | 'unavailable';
}

interface CoachStatusBadgeProps {
  engineReady: boolean;
  coachProvider: 'llm' | 'basic' | 'unavailable';
  knowledgeReady: boolean;
}

function CoachStatusBadge({ engineReady, coachProvider, knowledgeReady }: CoachStatusBadgeProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {engineReady && (
        <span className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
          Engine
        </span>
      )}
      {!engineReady && (
        <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
          Engine fallback
        </span>
      )}
      {coachProvider === 'llm' && (
        <span className="rounded border border-primary-400/30 bg-primary-400/10 px-1.5 py-0.5 text-[10px] font-medium text-primary-300">
          AI
        </span>
      )}
      {coachProvider === 'basic' && (
        <span className="rounded border border-gray-500/30 bg-gray-500/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
          Basic
        </span>
      )}
      {coachProvider === 'unavailable' && (
        <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
          Unavailable
        </span>
      )}
      {!knowledgeReady && (
        <span className="rounded border border-gray-500/30 bg-gray-500/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          Knowledge off
        </span>
      )}
    </div>
  );
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
      <div>
        <p className="text-sm leading-6 text-text-primary">{advice.text}</p>
        {advice.instagramUrl && (
          <a
            href={advice.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-md border border-primary-400/30 bg-primary-400/10 px-3 py-2 text-sm font-medium text-primary-300 transition hover:bg-primary-400/15"
          >
            Mở Instagram
          </a>
        )}
      </div>
    );
  }

  // Fallback for custom / non-structured
  if (advice.type === 'custom') {
    const safeText = advice.text.length > 300 ? advice.text.substring(0, 300) + '...' : advice.text;
    return <p className="text-sm leading-6 text-text-primary">{safeText}</p>;
  }

  // Parsing structured responses
  let rawText = advice.text || '';
  if (rawText.length > 300) {
    rawText = rawText.substring(0, 300) + '...';
  }

  // Quick
  if (advice.type === 'quick') {
    const parts = rawText.split(/Điểm cần nhớ:/i);
    const mainText = parts[0].replace(/Nhận xét nhanh/i, '').trim();
    const bullet = parts[1] ? parts[1].trim() : '';

    return (
      <div>
        <p className="text-sm leading-6 text-text-primary">{mainText}</p>
        {bullet && (
          <div className="mt-3 rounded-md border border-border bg-bg-surface p-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Điểm cần nhớ: </span>
            {bullet}
          </div>
        )}
      </div>
    );
  }

  // Focus
  if (advice.type === 'focus') {
    const mainText = rawText.replace(/Nên chú ý/i, '').trim();
    return <p className="whitespace-pre-line text-sm leading-6 text-text-primary">{mainText}</p>;
  }

  // Hint
  if (advice.type === 'hint') {
    const parts = rawText.split(/Vì sao:/i);
    const mainText = parts[0].replace(/Gợi ý nước đi|Ninh mách nước/i, '').trim();
    const reason = parts[1] ? parts[1].trim() : '';

    return (
      <div>
        <p className="text-sm leading-6 text-text-primary">{mainText}</p>
        {reason && (
          <div className="mt-3 rounded-md border border-border bg-bg-surface p-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Vì sao: </span>
            {reason}
          </div>
        )}
      </div>
    );
  }

  return <p className="text-sm leading-6 text-text-primary">{rawText}</p>;
}

export default function AICoachPanel({ fen, history = [], pgn = '', status, stockfish }: AICoachPanelProps) {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const engineReady = isEngineReady();
  const coachStatus = getCoachStatus();

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
      setAdvice({ type: 'custom', text: 'Không thể tải nhận xét. Vui lòng thử lại.' });
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <img
          src={coachAvatar}
          alt={COACH_NAME}
          className="h-10 w-10 rounded-md border border-border object-cover shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-text-primary">{COACH_NAME}</h3>
          <p className="text-xs text-text-tertiary">Mổ thế cờ, gáy vừa đủ</p>
        </div>
        <CoachStatusBadge
          engineReady={engineReady}
          coachProvider={coachStatus.provider}
          knowledgeReady={false}
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={() => getAdvice('Nhận xét nhanh')}
          disabled={isLoading}
          className="rounded-md border border-border bg-bg-surface px-2 py-2.5 text-xs font-medium text-text-secondary transition hover:bg-bg-elevated disabled:opacity-50"
        >
          Nhận xét nhanh
        </button>
        <button
          onClick={() => getAdvice('Nên chú ý điều gì?')}
          disabled={isLoading}
          className="rounded-md border border-border bg-bg-surface px-2 py-2.5 text-xs font-medium text-text-secondary transition hover:bg-bg-elevated disabled:opacity-50"
        >
          Nên chú ý
        </button>
        <button
          onClick={() => getAdvice('Gợi ý nước đi tốt nhất')}
          disabled={isLoading}
          className="rounded-md border border-primary-400/25 bg-primary-400/10 px-2 py-2.5 text-xs font-medium text-primary-300 transition hover:bg-primary-400/15 disabled:opacity-50"
        >
          {UI_COPY.hint}
        </button>
      </div>

      {/* Custom Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          disabled={isLoading}
          placeholder="Hỏi Quân sư Ninh về thế cờ..."
          className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-primary-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !customMessage.trim()}
          className="rounded-md bg-primary-400 px-4 py-2 text-sm font-medium text-bg-base transition hover:bg-primary-300 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>

      {/* Advice Display */}
      <div className="min-h-[120px] rounded-lg border border-border bg-bg-surface p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-primary-400">
            <span className="text-sm font-medium">{UI_COPY.botThinking}</span>
          </div>
        ) : advice ? (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {advice.type === 'quick' && 'Nhận xét nhanh'}
                {advice.type === 'focus' && 'Nên chú ý'}
                {advice.type === 'hint' && UI_COPY.hint}
                {advice.type === 'social' && 'Social'}
                {advice.type === 'custom' && 'Trả lời'}
              </span>
              {advice.source && advice.source !== 'llm' && (
                <span className="text-[10px] text-text-tertiary">({advice.source})</span>
              )}
            </div>
            {renderCoachAdvice(advice)}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-text-tertiary">
            <p className="text-sm">Hỏi hoặc bấm nút ở trên để nhận lời khuyên từ {COACH_NAME}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
