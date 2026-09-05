import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MistakeReviewRow } from '../components/MistakeReviewRow';
import { PROTOTYPE_MISTAKES } from '../fixtures/prototypeOnlyData';
import { AppButton } from '../ui/AppButton';
import { AppDialog } from '../ui/AppDialog';
import { ChevronDown, ChevronUp, RotateCcw, Target, Play, ExternalLink } from 'lucide-react';

export function ReviewPrototype() {
  const [isStatsCollapsed, setIsStatsCollapsed] = useState<boolean>(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [retryModalId, setRetryModalId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRetryMove = (id: string) => {
    setRetryModalId(id);
  };

  const handlePracticeSkill = (_skillTag: string) => {
    navigate('/progress');
  };

  // The 5-step structured review content required by Section 12
  const reviewContent = (
    <div className="space-y-6">
      {/* 1. Kết quả ván */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-subtle)]">
            Kết quả ván đấu
          </span>
          <h2 className="text-xl font-extrabold text-[var(--app-foreground)] flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--app-danger)]" />
            <span>Bạn đã thua do đầu hàng</span>
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--app-muted)] bg-[var(--app-surface)] px-2.5 py-1 rounded-[6px] border border-[var(--app-border)]">
          12 nước cờ
        </span>
      </div>

      {/* 2. Summary một câu */}
      <div className="rounded-[8px] bg-[var(--app-surface-raised)] p-3.5 border border-[var(--app-border)] text-xs text-[var(--app-foreground)] leading-relaxed">
        <p className="font-semibold text-[var(--app-muted)] mb-0.5">Đánh giá chung:</p>
        <p className="text-sm text-[var(--app-foreground)]">
          Thất bại do mất nhịp độ phát triển quân ở khai cuộc và xuất Hậu quá sớm khiến cánh Vua bị phản công.
        </p>
      </div>

      {/* 3. Ba lỗi quan trọng nhất (MistakeReviewRow) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">
            Ba lỗi then chốt cần khắc phục
          </h3>
          <span className="text-[11px] text-[var(--app-muted)]">Phân tích bởi Stockfish 18</span>
        </div>

        <div className="space-y-3">
          {PROTOTYPE_MISTAKES.map((mistake) => (
            <MistakeReviewRow
              key={mistake.id}
              mistake={mistake}
              onRetry={handleRetryMove}
              onPractice={handlePracticeSkill}
            />
          ))}
        </div>
      </div>

      {/* 4. CTA tiếp theo */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--app-border)]">
        <AppButton
          variant="secondary"
          size="md"
          onClick={() => navigate('/play')}
          leftIcon={<Play className="h-4 w-4" />}
        >
          Chơi ván mới
        </AppButton>

        <AppButton
          variant="primary"
          size="md"
          onClick={() => navigate('/progress')}
          leftIcon={<Target className="h-4 w-4" />}
        >
          Luyện 3 bài tập liên quan
        </AppButton>
      </div>

      {/* 5. Thống kê toàn ván ở vùng thu gọn */}
      <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <button
          type="button"
          onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[var(--app-muted)] hover:text-[var(--app-foreground)] transition-colors cursor-pointer"
        >
          <span>Thống kê toàn ván (Chất lượng nước cờ)</span>
          <span className="flex items-center gap-1 text-[11px] text-[var(--app-accent)]">
            {isStatsCollapsed ? 'Mở rộng chi tiết' : 'Thu gọn'}
            {isStatsCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </span>
        </button>

        {!isStatsCollapsed && (
          <div className="grid grid-cols-5 gap-2 pt-3 text-center">
            <div className="rounded-[6px] bg-[var(--app-surface-raised)] p-2 border border-[var(--app-border)]">
              <span className="text-[10px] text-[var(--app-subtle)] block">Tối ưu</span>
              <span className="text-sm font-mono font-bold text-[var(--app-accent)]">6</span>
            </div>
            <div className="rounded-[6px] bg-[var(--app-surface-raised)] p-2 border border-[var(--app-border)]">
              <span className="text-[10px] text-[var(--app-subtle)] block">Tốt</span>
              <span className="text-sm font-mono font-bold text-[var(--app-success)]">3</span>
            </div>
            <div className="rounded-[6px] bg-[var(--app-surface-raised)] p-2 border border-[var(--app-border)]">
              <span className="text-[10px] text-[var(--app-subtle)] block">Thiếu lực</span>
              <span className="text-sm font-mono font-bold text-[var(--app-warning)]">1</span>
            </div>
            <div className="rounded-[6px] bg-[var(--app-surface-raised)] p-2 border border-[var(--app-border)]">
              <span className="text-[10px] text-[var(--app-subtle)] block">Sai lầm</span>
              <span className="text-sm font-mono font-bold text-[var(--app-warning)]">1</span>
            </div>
            <div className="rounded-[6px] bg-[var(--app-surface-raised)] p-2 border border-[var(--app-border)]">
              <span className="text-[10px] text-[var(--app-subtle)] block">Nghiêm trọng</span>
              <span className="text-sm font-mono font-bold text-[var(--app-danger)]">1</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl py-4 space-y-4">
      {/* Modal Trigger Demonstration Button */}
      <div className="flex items-center justify-between bg-[var(--app-surface)] p-3 rounded-[8px] border border-[var(--app-border)] text-xs text-[var(--app-muted)]">
        <span>Giao diện Đánh giá sau ván đấu (Section 12)</span>
        <AppButton
          variant="outline"
          size="sm"
          onClick={() => setIsReviewModalOpen(true)}
          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
        >
          Mở dạng Modal Dialog
        </AppButton>
      </div>

      {/* Main Review Container */}
      <div
        className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
        style={{ borderRadius: '12px' }}
      >
        {reviewContent}
      </div>

      {/* HeroUI Dialog / Modal Representation (Accessible with Focus Trap & ESC Handling) */}
      <AppDialog
        isOpen={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        title="Đánh giá ván cờ (Post-Game Review)"
        description="Phân tích khách quan dựa trên dữ liệu tính toán từ Stockfish 18"
        maxWidth="max-w-2xl"
      >
        {reviewContent}
      </AppDialog>

      {/* Retry Modal Simulation */}
      <AppDialog
        isOpen={Boolean(retryModalId)}
        onOpenChange={(open) => !open && setRetryModalId(null)}
        title="Thử lại nước cờ (Move Retry)"
        description="Đặt lại bàn cờ tại thời điểm trước khi đi nước lỗi để bạn tìm ra nước cờ tối ưu."
        footer={
          <>
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => setRetryModalId(null)}
            >
              Đóng
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => {
                setRetryModalId(null);
                navigate('/play');
              }}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Vào bàn cờ thử lại
            </AppButton>
          </>
        }
      >
        <div className="p-3 rounded-[8px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-xs space-y-2">
          <p className="text-[var(--app-foreground)]">
            Hệ thống sẽ tái lập trạng thái bàn cờ tại nước 12: <span className="font-mono font-bold text-[var(--app-accent)]">12. ?</span>
          </p>
          <p className="text-[var(--app-muted)]">
            Gợi ý: Tìm một nước phát triển quân ở cánh Vua hoặc kiểm soát trung tâm mà không để Hậu bị đe dọa.
          </p>
        </div>
      </AppDialog>
    </div>
  );
}
