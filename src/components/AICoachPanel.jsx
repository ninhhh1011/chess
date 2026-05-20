import { useEffect, useRef, useState } from 'react';
import { askAICoach } from '../services/aiCoachApiService';
import { getUserProfile } from '../services/userProfileService';
import { getRecommendedExercises, getRecommendedLessons, getRecommendedOpenings } from '../services/recommendationService';
import coachAvatar from '../assets/avatarcoach.webp';

const COACH_NAME = 'ninh lốp trưởng';
const MAX_COACH_LINES = 2;
const MAX_COACH_CHARS = 240;

const QUICK_ACTIONS = [
  { id: 'hint', label: 'Gợi ý', mode: 'hint', question: 'Gợi ý 1 nước chiến thuật.' },
  { id: 'explain', label: 'Giải thích', mode: 'explain_position', question: 'Giải thích thế trận ngắn gọn.' },
  { id: 'review', label: 'Review', mode: 'review_game', question: 'Review ngắn: 1 lỗi chính.' },
];

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

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
    lower.includes('fallback') ||
    lower.includes('api key')
  );
}

function compactCoachReply(reply = '', mode = 'chat') {
  const rawLines = String(reply)
    .split('\n')
    .map(cleanCoachLine)
    .filter(Boolean)
    .filter((line) => !isNoisyCoachLine(line));

  const lines = rawLines.length ? rawLines : String(reply).split('\n').map(cleanCoachLine).filter(Boolean);
  const maxLines = MAX_COACH_LINES;
  const compactLines = lines.slice(0, maxLines);
  let compactReply = compactLines.join('\n');

  if (compactReply.length > MAX_COACH_CHARS) {
    compactReply = `${compactReply.slice(0, MAX_COACH_CHARS).trimEnd()}...`;
  }

  return compactReply || 'Ưu tiên nước an toàn, không treo quân.';
}

/**
 * AICoachPanel - Refactored gọn gàng
 * Bỏ avatar lớn, header phức tạp
 * Giữ chat đơn giản, input ở dưới
 */
export default function AICoachPanel({ fen, history = [], pgn = '', turn, status, stockfish = null, openingContext = null }) {
  const [messages, setMessages] = useState([
    {
      role: 'coach',
      content: 'Xin chào! Tôi là ninh lốp trưởng, AI Coach của bạn.\n\nTôi có thể giúp bạn:\n• Gợi ý chiến thuật\n• Giải thích thế cờ\n• Review ván đấu\n\nDùng các nút bên dưới hoặc hỏi trực tiếp!',
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
    setMessages((current) => [...current, { role: 'coach', content: compactCoachReply(result.reply, mode), source: result.source }]);
    setIsLoading(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    askCoach();
  }

  return (
    <div>
      {/* Header gọn */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={coachAvatar}
            alt="ninh lốp trưởng"
            className="h-8 w-8 rounded-lg border border-slate-600/60 object-cover"
          />
          <div>
            <h3 className="text-sm font-bold text-slate-300">
              <span className="text-amber-300">ninh lốp trưởng</span> · AI Coach
            </h3>
          </div>
        </div>
        <select
          value={playerLevel}
          onChange={(e) => setPlayerLevel(e.target.value)}
          className="rounded bg-slate-700/60 px-2 py-1 text-xs font-bold text-slate-300 outline-none"
        >
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick actions */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => askCoach(action.question, action.mode)}
            className="rounded bg-slate-700/60 px-2 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-600"
            disabled={isLoading}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="mb-3 max-h-[300px] space-y-2 overflow-y-auto rounded-lg border border-slate-700/60 bg-slate-950/30 p-2">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'bg-amber-500 text-slate-950'
                  : 'border border-slate-700/60 bg-slate-800/60 text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-xs font-bold text-amber-300">
            Đang suy nghĩ...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input form */}
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-400"
          placeholder="Hỏi AI Coach..."
        />
        <button
          className="btn-primary px-3 py-2 text-xs"
          disabled={isLoading || !question.trim()}
          type="submit"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
