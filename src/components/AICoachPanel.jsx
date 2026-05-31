import { useState } from 'react';
import { askAICoach } from '../services/aiCoachApiService';
import { getUserProfile } from '../services/userProfileService';
import coachAvatar from '../assets/avatarcoach.webp';
import { brandName } from '../config/brand';
import { isInstagramIntent, NINH_INSTAGRAM_URL } from '../utils/socialIntent';

const COACH_NAME = 'Ninh lốp trưởng';

const COACH_PROMPTS = {
  quick: `Bạn là HLV cờ vua cá nhân của người mới học.
Trả lời bằng tiếng Việt.
Chỉ trả lời đúng format:
Nhận xét nhanh
<1 câu chính>

Điểm cần nhớ:
<1 bullet ngắn>

Không quá 45 từ.
Không marketing.
Không nói lan man.
Không dùng markdown phức tạp.`,
  focus: `Bạn là HLV cờ vua cá nhân của người mới học.
Trả lời bằng tiếng Việt.
Chỉ trả lời đúng format:
Nên chú ý
1. <rủi ro quan trọng nhất>
2. <rủi ro thứ hai nếu thật sự cần>

Không quá 45 từ.
Không quá 2 ý.
Không marketing.
Không nói lan man.`,
  hint: `Bạn là HLV cờ vua cá nhân của người mới học.
Trả lời bằng tiếng Việt.
Chỉ trả lời đúng format:
Gợi ý nước đi
Nên cân nhắc: <nước đi hoặc ý tưởng>

Vì sao:
<1 câu ngắn>

Không quá 45 từ.
Nếu có best move từ engine, ưu tiên dùng.
Không marketing.
Không nói lan man.`
};

function renderCoachAdvice(advice) {
  if (advice.type === 'social') {
    return (
      <div>
        <p className="text-sm leading-6 text-slate-200">{advice.text}</p>
        {advice.instagramUrl && (
          <a
            href={advice.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
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
    return <p className="text-sm leading-6 text-slate-200">{safeText}</p>;
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
        <p className="text-sm leading-6 text-slate-200">{mainText}</p>
        {bullet && (
          <div className="mt-3 rounded-lg bg-slate-900 p-3 text-sm text-slate-300">
            <span className="font-medium text-slate-100">Điểm cần nhớ: </span>
            {bullet}
          </div>
        )}
      </div>
    );
  }

  // Focus
  if (advice.type === 'focus') {
    const mainText = rawText.replace(/Nên chú ý/i, '').trim();
    return <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{mainText}</p>;
  }

  // Hint
  if (advice.type === 'hint') {
    const parts = rawText.split(/Vì sao:/i);
    const mainText = parts[0].replace(/Gợi ý nước đi/i, '').trim();
    const reason = parts[1] ? parts[1].trim() : '';

    return (
      <div>
        <p className="text-sm leading-6 text-slate-200">{mainText}</p>
        {reason && (
          <div className="mt-3 rounded-lg bg-slate-900 p-3 text-sm text-slate-300">
            <span className="font-medium text-slate-100">Vì sao: </span>
            {reason}
          </div>
        )}
      </div>
    );
  }

  return <p className="text-sm leading-6 text-slate-200">{rawText}</p>;
}

export default function AICoachPanel({ fen, history = [], pgn = '', turn, status, stockfish = null, openingContext = null }) {
  const [advice, setAdvice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  async function getAdvice(type) {
    if (isLoading) return;
    setIsLoading(true);
    setAdvice(null);

    let prompt = '';
    if (type === 'quick') prompt = COACH_PROMPTS.quick;
    else if (type === 'focus') prompt = COACH_PROMPTS.focus;
    else if (type === 'hint') prompt = COACH_PROMPTS.hint;
    else prompt = type; // Custom message

    // Check Instagram Intent
    if (isInstagramIntent(prompt)) {
      setAdvice({
        type: 'social',
        text: 'Instagram của Ninh ở đây:',
        instagramUrl: NINH_INSTAGRAM_URL,
      });
      setIsLoading(false);
      return;
    }

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
      responseStyle: 'structured_short',
      stockfish,
      openingContext,
      turn,
      status,
    };

    try {
      const result = await askAICoach(payload);
      setAdvice({ type, text: result.reply });
    } catch (error) {
      setAdvice({ type: type === prompt ? 'custom' : type, text: 'Ninh chưa phân tích được thế này. Thử lại sau vài giây.' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customMessage.trim()) return;
    getAdvice(customMessage);
    setCustomMessage('');
  };

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

      {/* Custom Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          disabled={isLoading}
          placeholder="Hỏi về ván cờ, hoặc xin Instagram của Ninh..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !customMessage.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>

      {/* Advice Display */}
      <div className="min-h-[120px] rounded-xl border border-slate-800 bg-slate-950 p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-emerald-500 [&>span]:h-2.5 [&>span]:w-2.5 [&>span]:overflow-hidden [&>span]:rounded-full [&>span]:bg-emerald-400 [&>span]:text-transparent">
            <span className="text-sm font-medium animate-pulse">Ninh đang xem thế cờ...</span>
          </div>
        ) : advice ? (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {advice.type === 'quick' && 'Nhận xét nhanh'}
              {advice.type === 'focus' && 'Nên chú ý'}
              {advice.type === 'hint' && 'Gợi ý nước đi'}
              {advice.type === 'social' && 'Social'}
              {advice.type === 'custom' && 'Trả lời'}
            </div>
            {renderCoachAdvice(advice)}

          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
            <p className="text-sm">Hỏi hoặc bấm vào các nút ở trên để nhận lời khuyên từ {COACH_NAME}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
