import { useState } from 'react';
import { askAICoach } from '../services/aiCoachApiService';
import { getUserProfile } from '../services/userProfileService';
import coachAvatar from '../assets/avatarcoach.webp';
import { brandName } from '../config/brand';

const COACH_NAME = 'Ninh lốp trưởng';

export default function AICoachPanel({ fen, history = [], pgn = '', turn, status, stockfish = null, openingContext = null }) {
  const [advice, setAdvice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function getAdvice(type) {
    if (isLoading) return;
    setIsLoading(true);
    setAdvice(null);

    let prompt = '';
    if (type === 'quick') prompt = 'Nhận xét thế cờ hiện tại thật ngắn gọn trong 1-2 câu.';
    if (type === 'focus') prompt = 'Tôi nên chú ý điều gì trên bàn cờ lúc này? Ngắn gọn 1-2 câu.';
    if (type === 'hint') prompt = 'Gợi ý cho tôi một nước đi hoặc ý tưởng chiến thuật tiếp theo. Không dài dòng.';

    const userProfile = getUserProfile();
    const payload = {
      message: prompt,
      mode: 'chat',
      fen,
      history,
      pgn,
      playerColor: 'white',
      level: userProfile.currentLevel || 'beginner',
      userProfile,
      responseStyle: 'very_short',
      stockfish,
      openingContext,
      turn,
      status,
    };

    try {
      const result = await askAICoach(payload);
      setAdvice({ type, text: result.reply });
    } catch (error) {
      setAdvice({ type, text: 'Đang bận đánh giải, bạn đợi xíu hỏi lại nhé!' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <img
          src={coachAvatar}
          alt={COACH_NAME}
          className="h-10 w-10 rounded-md border border-slate-700 object-cover shadow-sm"
        />
        <div>
          <h3 className="text-sm font-bold text-slate-100">{COACH_NAME}</h3>
          <p className="text-xs text-slate-400">HLV cá nhân của bạn</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={() => getAdvice('quick')}
          disabled={isLoading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Nhận xét nhanh
        </button>
        <button
          onClick={() => getAdvice('focus')}
          disabled={isLoading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Nên chú ý
        </button>
        <button
          onClick={() => getAdvice('hint')}
          disabled={isLoading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Gợi ý nước đi
        </button>
      </div>

      {/* Advice Display */}
      <div className="min-h-[120px] rounded-xl border border-emerald-500/20 bg-slate-900 p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center space-x-2 text-emerald-500">
            <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: '0.2s' }}></div>
          </div>
        ) : advice ? (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {advice.type === 'quick' && 'Nhận xét'}
              {advice.type === 'focus' && 'Chú ý'}
              {advice.type === 'hint' && 'Gợi ý'}
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{advice.text}</p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
            <p className="text-sm">Bấm vào các nút ở trên để nhận lời khuyên từ {COACH_NAME}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
