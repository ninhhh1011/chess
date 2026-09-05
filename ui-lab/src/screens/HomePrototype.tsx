import { useNavigate } from 'react-router-dom';
import { AppButton } from '../ui/AppButton';
import { ChessBoardPrototype } from '../components/ChessBoardPrototype';
import { Play, Calendar, CheckCircle2, ChevronRight, Swords, Search, BookOpen, TrendingUp } from 'lucide-react';

export function HomePrototype() {
  const navigate = useNavigate();

  const flowSteps = [
    {
      step: 1,
      title: '1. Chơi',
      desc: 'Thi đấu với Bot ở nhịp độ thoải mái, không áp lực tính điểm.',
      icon: Swords,
    },
    {
      step: 2,
      title: '2. Review bằng Stockfish',
      desc: 'Phân tích tự động 3 lỗi quan trọng nhất và gợi ý nước đi tối ưu.',
      icon: Search,
    },
    {
      step: 3,
      title: '3. Luyện đúng lỗi',
      desc: 'Thực hành bài tập chiến thuật được chọn lọc đúng điểm yếu vừa mắc.',
      icon: BookOpen,
    },
    {
      step: 4,
      title: '4. Theo dõi tiến bộ',
      desc: 'Cập nhật chỉ số kỹ năng và duy trì lộ trình rèn luyện mỗi ngày.',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-10 py-2 sm:py-6">
      {/* Hero Section: Left content, Right chessboard preview */}
      <section className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-10 lg:p-12 shadow-xs">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Headline & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[var(--app-accent-soft)] text-[var(--app-accent)] text-xs font-semibold border border-[var(--app-accent)]/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Phương pháp rèn luyện cờ thực chiến</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--app-foreground)] leading-tight">
              Học từ chính những nước cờ của bạn
            </h1>

            <p className="text-base sm:text-lg text-[var(--app-muted)] leading-relaxed max-w-xl">
              Chơi một ván, xem các lỗi quan trọng và luyện đúng kỹ năng cần cải thiện. Không áp đặt lý thuyết hàn lâm, tập trung vào thói quen tư duy thực tế.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AppButton
                size="lg"
                variant="primary"
                onClick={() => navigate('/lobby')}
                leftIcon={<Play className="h-4 w-4" />}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Chơi ván đầu tiên
              </AppButton>

              <AppButton
                size="lg"
                variant="secondary"
                onClick={() => navigate('/progress')}
                leftIcon={<Calendar className="h-4 w-4" />}
              >
                Xem kế hoạch hôm nay
              </AppButton>
            </div>
          </div>

          {/* Right Column: Chess board preview */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[380px]">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--app-muted)]">
                <span className="font-semibold">Ván cờ minh họa</span>
                <span className="font-mono text-[var(--app-chess-gold)] font-bold">12. Qh5?</span>
              </div>
              <ChessBoardPrototype
                lastMove={{ from: 'd1', to: 'h5' }}
                interactive={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Flow Strip: 4 Clear Steps */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--app-foreground)]">
            Quy trình tiến bộ 4 bước
          </h2>
          <span className="text-xs text-[var(--app-muted)]">Thiết kế cho người chơi muốn tiến bộ thực sự</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-2.5 transition-all hover:border-[var(--app-accent)]/30"
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
