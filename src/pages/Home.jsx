import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Search, BookOpen, TrendingUp, Play, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import { AppButton, AppCard, AppSurface } from '@/ui';

export default function Home() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setProfile(getUserProfile());
  }, [user]);

  const flowSteps = [
    {
      step: 1,
      title: '1. Chơi ván cờ',
      desc: 'Thi đấu với Bot AI ở nhịp độ tập trung, thoải mái rèn luyện chiến thuật thực chiến.',
      icon: Swords,
    },
    {
      step: 2,
      title: '2. Đánh giá Stockfish',
      desc: 'Tự động trích xuất các lỗi quan trọng nhất ván đấu kèm phân tích tối ưu từ engine.',
      icon: Search,
    },
    {
      step: 3,
      title: '3. Khắc phục sai sót',
      desc: 'Hệ thống bài tập chiến thuật sát với tình huống cờ bạn vừa mắc lỗi.',
      icon: BookOpen,
    },
    {
      step: 4,
      title: '4. Theo dõi tiến bộ',
      desc: 'Lộ trình rèn luyện cá nhân hóa tự cập nhật thông minh sau từng nước đi.',
      icon: TrendingUp,
    },
  ];

  // Starting position pieces for the visual preview board
  const startingPieces = [
    '♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜',
    '♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '',
    '♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙',
    '♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖',
  ];

  const isWhitePiece = (piece) => ['♔', '♕', '♖', '♗', '♘', '♙'].includes(piece);

  return (
    <div className="space-y-12 sm:space-y-16 py-2 sm:py-4">
      {/* Hero Section */}
      <AppSurface className="rounded-[28px] sm:rounded-[36px] border border-[var(--app-border)] bg-white p-7 sm:p-12 lg:p-16 shadow-[var(--shadow-card)]">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--app-muted-surface)] text-[#030302] text-xs font-medium border border-[var(--app-border)]">
              <span className="h-2 w-2 rounded-full bg-[var(--app-secondary)]" />
              <span>Phương pháp rèn luyện cờ thực chiến</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#030302] leading-[1.12]">
                Học từ chính những nước cờ của bạn
              </h1>

              <p className="font-sans text-base sm:text-lg text-[var(--app-muted)] leading-relaxed max-w-xl">
                Chơi một ván, khám phá các bước ngoặt chiến thuật và luyện đúng kỹ năng cần cải thiện để tiến bộ bền vững.
              </p>
            </div>

            {isAuthenticated && profile && (
              <AppCard className="p-5 max-w-lg rounded-[20px] bg-[var(--app-muted-surface)]/50 border border-[var(--app-border)]">
                <AppCard.Header className="pb-1 p-0">
                  <AppCard.Title className="text-[11px] font-semibold uppercase tracking-wider text-[var(--app-subtle)]">
                    Tiến độ cá nhân
                  </AppCard.Title>
                </AppCard.Header>
                <AppCard.Content className="p-0">
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-serif text-2xl font-bold text-[#030302]">{profile.gamesPlayed}</p>
                      <p className="text-xs text-[var(--app-muted)]">Ván đã chơi</p>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold text-[#030302] capitalize">{profile.currentLevel}</p>
                      <p className="text-xs text-[var(--app-muted)]">Cấp độ</p>
                    </div>
                    <div>
                      <p className="font-serif text-2xl font-bold text-[var(--app-secondary)]">{profile.exerciseStats?.accuracy || 0}%</p>
                      <p className="text-xs text-[var(--app-muted)]">Chính xác</p>
                    </div>
                  </div>
                </AppCard.Content>
              </AppCard>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AppButton
                size="lg"
                variant="primary"
                onClick={() => navigate('/play')}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Chơi ván đầu tiên
              </AppButton>

              <AppButton
                size="lg"
                variant="secondary"
                onClick={() => navigate('/training')}
                leftIcon={<Calendar className="h-4 w-4" />}
              >
                Xem kế hoạch hôm nay
              </AppButton>
            </div>
          </div>

          {/* Right Column: Clean Visual Board Preview */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[380px]">
              <div className="mb-2.5 flex items-center justify-between text-xs text-[var(--app-muted)]">
                <span className="font-medium text-[#030302]">Ván cờ mẫu</span>
                <span className="font-mono text-[var(--app-secondary)] font-medium">Thế cờ khởi đầu</span>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] p-3 bg-white shadow-[var(--shadow-floating)]">
                <div className="grid grid-cols-8 overflow-hidden rounded-[16px] border border-[var(--app-border)] aspect-square shadow-inner">
                  {startingPieces.map((piece, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isDark = (row + col) % 2 === 1;
                    const pieceColor = isWhitePiece(piece)
                      ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                      : 'text-[#030302] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]';

                    return (
                      <div
                        key={i}
                        className={`aspect-square grid place-items-center text-2xl sm:text-3xl select-none ${
                          isDark ? 'bg-[#587982]' : 'bg-[#FBF9F5]'
                        } ${pieceColor}`}
                      >
                        {piece}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppSurface>

      {/* 4-Step Improvement Loop */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <span className="text-xs uppercase tracking-widest font-semibold text-[var(--app-secondary)]">Phương pháp luận</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#030302] mt-0.5">
              Vòng lặp tiến bộ 4 bước
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">Quy trình rèn luyện cờ thực chất và hiệu quả</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <AppCard
                key={step.step}
                className="p-6 sm:p-7 space-y-4 hover:shadow-[var(--shadow-floating)] transition-all rounded-[24px]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--app-tertiary)]/60 text-[var(--app-secondary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#030302]">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--app-muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </AppCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}
