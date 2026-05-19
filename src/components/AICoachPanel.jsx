import { useEffect, useRef, useState } from 'react';
import { askAICoach } from '../services/aiCoachApiService';
import { getUserProfile } from '../services/userProfileService';
import { getRecommendedExercises, getRecommendedLessons, getRecommendedOpenings } from '../services/recommendationService';
import coachAvatar from '../assets/avatarcoach.webp';

const COACH_NAME = 'ninh lốp trưởng';
const MAX_COACH_LINES = 2;
const MAX_COACH_CHARS = 240;

const QUICK_ACTIONS = [
  { id: 'hint', label: 'Gợi ý chiến thuật', mode: 'hint', question: 'Dựa trên PGN và thế hiện tại, gợi ý 1 nước chiến thuật nên cân nhắc. Trả lời tối đa 2 ý.' },
  { id: 'explain', label: 'Hỏi AI Coach', mode: 'explain_position', question: 'Dựa trên PGN ván đấu hiện tại, giải thích thế trận bằng tiếng Việt trong tối đa 3 dòng.' },
  { id: 'review', label: 'Review ván', mode: 'review_game', question: 'Review thật ngắn: 1 lỗi chính và 1 việc cần sửa.' },
  { id: 'plan', label: 'Luyện hôm nay', mode: 'training_plan', question: 'Cho tôi 1 bài cần luyện hôm nay, trả lời cực ngắn.' },
];

const LEVELS = [
  { value: 'noob', label: 'Noob' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function CoachAvatar({ compact = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = compact ? 'h-10 w-10' : 'h-16 w-16';

  if (imageFailed) {
    return (
      <div
        aria-label="Avatar ninh lớp trưởng"
        className={`${compact ? 'mt-1 ' : ''}${sizeClass} grid flex-none place-items-center rounded-xl border border-amber-400/40 bg-amber-500 text-xl font-black text-slate-950 shadow-glow`}
      >
        ♔
      </div>
    );
  }

  return (
    <img
      src={coachAvatar}
      alt="Avatar ninh lớp trưởng"
      onError={() => setImageFailed(true)}
      className={`${compact ? 'mt-1 ' : ''}${sizeClass} flex-none rounded-xl border border-amber-400/35 object-cover shadow-glow`}
    />
  );
}

function cleanCoachLine(line) {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*\*(.+)\*\*:?$/, '$1:')
    .replace(/^[-*]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function isNoisyCoachLine(line) {
  const lower = line.toLowerCase();
  return (
    lower.startsWith('lưu ý') ||
    lower.includes('mock mode') ||
    lower.includes('chế độ mock') ||
    lower.includes('fallback') ||
    lower.includes('api key') ||
    lower.startsWith('fen ') ||
    lower.startsWith('fen:') ||
    lower.startsWith('các nước gần đây') ||
    lower.startsWith('với level') ||
    lower.startsWith('profile') ||
    lower.endsWith('nước đi:') ||
    lower.endsWith('thế cờ:') ||
    lower.startsWith('cách tự chọn') ||
    lower.startsWith('bạn nên quan sát') ||
    lower.startsWith('bài học chính') ||
    lower.includes('cá nhân hóa theo tiến độ') ||
    lower.includes('để có đánh giá nước đi chính xác như engine')
  );
}

function compactCoachReply(reply = '', mode = 'chat') {
  const rawLines = String(reply)
    .split('\n')
    .map(cleanCoachLine)
    .filter(Boolean)
    .filter((line) => !isNoisyCoachLine(line));

  const lines = rawLines.length ? rawLines : String(reply).split('\n').map(cleanCoachLine).filter(Boolean);
  const maxLines = mode === 'training_plan' ? 3 : MAX_COACH_LINES;
  const compactLines = lines.slice(0, maxLines);
  let compactReply = compactLines.join('\n');

  if (compactReply.length > MAX_COACH_CHARS) {
    compactReply = `${compactReply.slice(0, MAX_COACH_CHARS).trimEnd()}...`;
  }

  return compactReply || 'Đi ngắn gọn: ưu tiên nước an toàn, không treo quân, rồi phát triển quân.';
}

export default function AICoachPanel({ fen, history = [], pgn = '', turn, status, stockfish = null, openingContext = null }) {
  const [messages, setMessages] = useState([
    {
      role: 'coach',
      content: 'Mình là ninh lốp trưởng. Hỏi gì mình trả lời ngắn: nước nên đi, lý do, việc cần làm.',
      source: 'mock',
    },
  ]);
  const [question, setQuestion] = useState('');
  const [playerLevel, setPlayerLevel] = useState('beginner');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function buildPayload(finalQuestion, mode = 'chat') {
    const userProfile = getUserProfile();
    return {
      message: finalQuestion,
      mode,
      fen,
      history,
      pgn,
      playerColor: 'white',
      level: playerLevel || userProfile.currentLevel,
      userProfile,
      recommendations: {
        lessons: getRecommendedLessons(userProfile),
        exercises: getRecommendedExercises(userProfile),
        openings: getRecommendedOpenings(userProfile),
      },
      responseStyle: 'very_short',
      dailyTrainingPlan: userProfile.dailyTrainingPlan || null,
      stockfish,
      openingContext,
      turn,
      status,
    };
  }

  async function askCoach(customQuestion, mode = 'chat') {
    const finalQuestion = (customQuestion || question).trim();
    if (!finalQuestion || isLoading) return;

    setQuestion('');
    setIsLoading(true);
    setMessages((current) => [...current, { role: 'user', content: finalQuestion }]);

    const result = await askAICoach(buildPayload(finalQuestion, mode));
    setMessages((current) => [...current, { role: 'coach', content: compactCoachReply(result.reply, mode), source: result.source, suggestedActions: result.suggestedActions || [] }]);
    setIsLoading(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    askCoach();
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/60">
    <div className="border-b border-slate-700 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <CoachAvatar />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400/80">AI Coach</p>
            <h2 className="mt-1 text-xl font-black text-slate-50">{COACH_NAME}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Trả lời ngắn theo thế cờ hiện tại</p>
          </div>
        </div>
        <label className="min-w-40 text-sm font-bold text-slate-400" htmlFor="coach-level">
          Level người chơi
          <select id="coach-level" value={playerLevel} onChange={(event) => setPlayerLevel(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-extrabold text-slate-100 outline-none transition focus:border-amber-400">
            {LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => <button key={action.id} id={`coach-${action.id}-button`} type="button" onClick={() => askCoach(action.question, action.mode)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm font-extrabold text-slate-100 transition hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-slate-700 disabled:opacity-60" disabled={isLoading}>{action.label}</button>)}
      </div>
    </div>

    <div className="max-h-80 space-y-3 overflow-auto p-4">
      {messages.map((message, index) => <article key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {message.role === 'coach' && <CoachAvatar compact />}
        <div className={`max-w-[calc(100%-3.25rem)] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-amber-500 text-slate-950' : 'border border-slate-700 bg-slate-800 text-slate-200'}`}>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] opacity-80">
            <span>{message.role === 'user' ? 'Bạn' : COACH_NAME}</span>
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </article>)}
      {isLoading && <div className="mr-8 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-amber-300">Coach đang suy nghĩ...</div>}
      <div ref={chatEndRef} />
    </div>

    <form className="flex gap-2 border-t border-slate-700 p-4" onSubmit={handleSubmit}>
      <input id="coach-question-input" value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400" placeholder="Ví dụ: Mình nên phát triển quân nào tiếp theo?" />
      <button id="coach-send-button" className="btn-primary px-5" disabled={isLoading || !question.trim()} type="submit">Gửi</button>
    </form>
  </section>;
}
