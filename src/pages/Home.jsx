import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Search, BookOpen, TrendingUp, Play, Calendar, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import { createGame } from '../services/onlineGameService';
import { AppButton } from '@/ui/AppButton';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setProfile(getUserProfile());
  }, [user]);

  const handleCreateOnlineGame = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setIsCreatingGame(true);
      const { gameId } = await createGame(user.id);
      navigate(`/play/online/${gameId}`);
    } catch (error) {
      console.error(error);
      setIsCreatingGame(false);
      alert('Không thể tạo phòng chơi online');
    }
  };

  const flowSteps = [
    {
      step: 1,
      title: '1. Chơi',
      desc: 'Thi đấu với Bot ở nhịp độ thoải mái, tập trung vào chiến thuật thực tế.',
      icon: Swords,
    },
    {
      step: 2,
      title: '2. Review bằng Stockfish',
      desc: 'Tự động trích xuất tối đa 3 lỗi quan trọng nhất kèm gợi ý tối ưu.',
      icon: Search,
    },
    {
      step: 3,
      title: '3. Luyện đúng lỗi',
      desc: 'Giải bài tập chiến thuật sát với tình huống cờ bạn vừa mắc sai lầm.',
      icon: BookOpen,
    },
    {
      step: 4,
      title: '4. Theo dõi tiến bộ',
      desc: 'Lộ trình rèn luyện cá nhân hóa tự cập nhật theo kết quả từng ván.',
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
    <div className="space-y-12 py-2 sm:py-6">
      {/* Hero Section */}
      <section className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-10 lg:p-12 shadow-xs">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[var(--app-accent-soft)] text-[var(--app-accent)] text-xs font-semibold border border-[var(--app-accent)]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
              <span>Phương pháp rèn luyện cờ thực chiến</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--app-foreground)] leading-tight">
              Học từ chính những nước cờ của bạn
            </h1>

            <p className="text-base sm:text-lg text-[var(--app-muted)] leading-relaxed max-w-xl">
              Chơi một ván, xem các lỗi quan trọng và luyện đúng kỹ năng cần cải thiện.
            </p>

            {isAuthenticated && profile && (
              <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 max-w-lg">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--app-subtle)]">Tiến độ cá nhân</p>
                <div className="mt-2.5 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xl font-bold text-[var(--app-foreground)] font-mono">{profile.gamesPlayed}</p>
                    <p className="text-xs text-[var(--app-muted)]">Ván đã chơi</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--app-foreground)] capitalize">{profile.currentLevel}</p>
                    <p className="text-xs text-[var(--app-muted)]">Cấp độ</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--app-accent)] font-mono">{profile.exerciseStats?.accuracy || 0}%</p>
                    <p className="text-xs text-[var(--app-muted)]">Chính xác</p>
                  </div>
                </div>
              </div>
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

              <AppButton
                size="lg"
                variant="outline"
                onClick={handleCreateOnlineGame}
                disabled={isCreatingGame}
                leftIcon={<Globe className="h-4 w-4" />}
                rightIcon={
                  <span className="rounded-[4px] border border-[var(--app-warning)]/30 bg-[var(--app-warning)]/10 px-1.5 py-0.2 text-[10px] font-semibold text-[var(--app-warning)]">
                    Beta
                  </span>
                }
              >
                {isCreatingGame ? 'Đang tạo...' : 'Chơi Online'}
              </AppButton>
            </div>
          </div>

          {/* Right Column: Clean Visual Board Preview */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[380px]">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--app-muted)]">
                <span className="font-semibold">Ván cờ minh họa</span>
                <span className="font-mono text-[var(--app-copper)] font-bold">Thế cờ khởi đầu</span>
              </div>
              <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2.5 shadow-md">
                <div className="grid grid-cols-8 overflow-hidden rounded-[6px] border border-[var(--app-border)] aspect-square">
                  {startingPieces.map((piece, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isDark = (row + col) % 2 === 1;
                    const pieceColor = isWhitePiece(piece)
                      ? 'text-[#F1F4F2]'
                      : 'text-[#141A17] drop-shadow-[0_1px_1px_rgba(255,255,255,0.2)]';

                    return (
                      <div
                        key={i}
                        className={`aspect-square grid place-items-center text-2xl sm:text-3xl select-none ${
                          isDark ? 'bg-[#66745C]' : 'bg-[#DAD2BD]'
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
      </section>

      {/* 4-Step Improvement Loop */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--app-foreground)]">
            Vòng lặp tiến bộ
          </h2>
          <span className="text-xs text-[var(--app-muted)]">Quy trình rèn luyện cờ thực chất</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-2.5 transition-all hover:border-[var(--app-accent)]/40"
                style={{ borderRadius: '10px' }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--app-surface)] text-[var(--app-accent)] border border-[var(--app-border)]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--app-foreground)]">
                  {step.title}
                </h3>
                <p className="text-xs text-[var(--app-muted)] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
