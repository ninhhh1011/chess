import { useEffect, useRef, useState } from 'react';
import { askAICoach } from '../services/aiCoachApiService';
import { getUserProfile } from '../services/userProfileService';
import { getRecommendedExercises, getRecommendedLessons, getRecommendedOpenings } from '../services/recommendationService';
import coachAvatar from '../assets/avatarcoach.webp';

const COACH_NAME = 'ninh lốp trưởng';

const QUICK_ACTIONS = [
  { id: 'hint', label: 'Gợi ý nước đi', mode: 'hint', question: 'Hãy gợi ý một nước đi tốt trong thế cờ hiện tại và giải thích lý do.' },
  { id: 'explain', label: 'Giải thích thế cờ', mode: 'explain_position', question: 'Hãy giải thích thế cờ hiện tại: bên nào có lợi thế, kế hoạch chính là gì?' },
  { id: 'review', label: 'Review ván', mode: 'review_game', question: 'Hãy review ván cờ đến hiện tại, chỉ ra 2-3 khoảnh khắc quan trọng và bài học.' },
  { id: 'plan', label: 'Lộ trình hôm nay', mode: 'training_plan', question: 'Hôm nay tôi nên luyện gì để tiến bộ nhanh hơn?' },
];

const LEVELS = [
  { value: 'noob', label: 'Noob' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function AICoachPanel({ fen, history = [], pgn = '', turn, status, stockfish = null, openingContext = null }) {
  const [messages, setMessages] = useState([
    {
      role: 'coach',
      content: 'Xin chào! Mình là ninh lốp trưởng, AI Coach của Vua Cờ. Nếu server chưa có API key, mình sẽ tự fallback về Coach cơ bản để app không bị lỗi.',
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
    setMessages((current) => [...current, { role: 'coach', content: result.reply, source: result.source, suggestedActions: result.suggestedActions || [] }]);
    setIsLoading(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    askCoach();
  }

  return <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-gold/20 bg-gradient-to-br from-white/[.12] via-white/[.07] to-gold/[.08] shadow-glow backdrop-blur-xl">
    <div className="border-b border-white/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <img src={coachAvatar} alt="Avatar ninh lốp trưởng" className="h-16 w-16 rounded-2xl border border-gold/40 object-cover shadow-glow" />
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-gold/80">AI Coach Agent</p>
            <h2 className="mt-1 text-2xl font-black text-cream">{COACH_NAME}</h2>
            <p className="mt-1 text-sm font-semibold text-cream/55">Huấn luyện viên AI thật + fallback mock</p>
          </div>
        </div>
        <label className="min-w-40 text-sm font-bold text-cream/65" htmlFor="coach-level">
          Level người chơi
          <select id="coach-level" value={playerLevel} onChange={(event) => setPlayerLevel(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-ink/80 px-3 py-2 font-extrabold text-cream outline-none transition focus:border-gold">
            {LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => <button key={action.id} id={`coach-${action.id}-button`} type="button" onClick={() => askCoach(action.question, action.mode)} className="rounded-2xl border border-white/10 bg-ink/50 px-3 py-3 text-sm font-extrabold text-cream transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold/15 disabled:opacity-60" disabled={isLoading}>{action.label}</button>)}
      </div>
    </div>

    <div className="max-h-96 space-y-3 overflow-auto p-5">
      {messages.map((message, index) => <article key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        {message.role === 'coach' && <img src={coachAvatar} alt="Avatar ninh lốp trưởng" className="mt-1 h-10 w-10 flex-none rounded-2xl border border-gold/35 object-cover" />}
        <div className={`max-w-[calc(100%-3.25rem)] rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-gold text-ink' : 'border border-white/10 bg-ink/55 text-cream/85'}`}>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] opacity-80">
            <span>{message.role === 'user' ? 'Bạn' : COACH_NAME}</span>
            {message.role === 'coach' && <span className="rounded-full bg-white/10 px-2 py-0.5">{message.source === 'ai' ? 'AI thật' : message.source === 'fallback' ? 'Fallback' : 'Mock'}</span>}
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </article>)}
      {isLoading && <div className="mr-8 rounded-3xl border border-white/10 bg-ink/55 px-4 py-3 text-sm font-bold text-gold">Coach đang suy nghĩ...</div>}
      <div ref={chatEndRef} />
    </div>

    <form className="flex gap-2 border-t border-white/10 p-4" onSubmit={handleSubmit}>
      <input id="coach-question-input" value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 text-cream outline-none transition placeholder:text-cream/35 focus:border-gold" placeholder="Ví dụ: Mình nên phát triển quân nào tiếp theo?" />
      <button id="coach-send-button" className="btn-primary px-5" disabled={isLoading || !question.trim()} type="submit">Gửi</button>
    </form>
  </section>;
}
