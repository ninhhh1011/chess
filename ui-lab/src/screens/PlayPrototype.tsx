import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoardPrototype } from '../components/ChessBoardPrototype';
import { EvaluationBarPrototype } from '../components/EvaluationBarPrototype';
import { MoveHistoryPrototype } from '../components/MoveHistoryPrototype';
import { CoachPanelPrototype } from '../components/CoachPanelPrototype';
import { SourceDisclosure } from '../components/SourceDisclosure';
import { AppTabs } from '../ui/AppTabs';
import { AppButton } from '../ui/AppButton';
import { AppDialog } from '../ui/AppDialog';
import { AppPopover } from '../ui/AppPopover';
import { AppStatus } from '../ui/AppStatus';
import { Settings, Flag, RotateCcw, ShieldAlert, Cpu, Bot, ScrollText } from 'lucide-react';

export function PlayPrototype() {
  const [activeTab, setActiveTab] = useState<string>('moves');
  const [showResignModal, setShowResignModal] = useState<boolean>(false);
  const [isEvaluationVisible, setIsEvaluationVisible] = useState<boolean>(true);
  const [boardSound, setBoardSound] = useState<boolean>(true);
  const navigate = useNavigate();

  const tabs = [
    { id: 'moves', label: 'Ván đấu', icon: <ScrollText className="h-3.5 w-3.5" /> },
    { id: 'analysis', label: 'Phân tích', icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: 'coach', label: 'Huấn luyện', icon: <Bot className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Top Secondary Action Bar (Discreet, non-competing) */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-[var(--app-muted)]">
        <div className="flex items-center gap-2">
          <AppStatus variant="engine" size="sm">
            Stockfish 18 sẵn sàng
          </AppStatus>
          <span className="hidden sm:inline text-[var(--app-subtle)]">|</span>
          <span className="hidden sm:inline">Mức độ: Vừa · Tập trung kiểm soát trung tâm</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings in AppPopover */}
          <AppPopover
            title="Cài đặt ván cờ"
            trigger={
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] transition-colors"
                title="Cài đặt ván cờ"
                aria-label="Cài đặt ván cờ"
              >
                <Settings className="h-4 w-4" />
              </button>
            }
          >
            <div className="space-y-2.5 min-w-[200px]">
              <label className="flex items-center justify-between text-xs text-[var(--app-muted)] cursor-pointer">
                <span>Hiện thanh đánh giá</span>
                <input
                  type="checkbox"
                  checked={isEvaluationVisible}
                  onChange={(e) => setIsEvaluationVisible(e.target.checked)}
                  className="rounded-[4px] accent-[var(--app-accent)]"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-[var(--app-muted)] cursor-pointer">
                <span>Âm thanh nước cờ</span>
                <input
                  type="checkbox"
                  checked={boardSound}
                  onChange={(e) => setBoardSound(e.target.checked)}
                  className="rounded-[4px] accent-[var(--app-accent)]"
                />
              </label>
            </div>
          </AppPopover>

          <AppButton
            variant="tertiary"
            size="sm"
            onClick={() => setShowResignModal(true)}
            leftIcon={<Flag className="h-3.5 w-3.5 text-[var(--app-danger)]" />}
          >
            Đầu hàng
          </AppButton>
        </div>
      </div>

      {/* Main Chess Area: Desktop 65% board, 35% sidebar */}
      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Board Area (65% width on desktop) */}
        <section className="lg:col-span-8 flex flex-col items-center justify-center rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3 sm:p-5 shadow-xs">
          {/* Opponent Player Bar */}
          <div className="w-full max-w-[540px] flex items-center justify-between pb-2 mb-1 border-b border-[var(--app-border)] text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--app-surface-raised)] text-sm border border-[var(--app-border)]">
                ♚
              </div>
              <div>
                <span className="font-bold text-[var(--app-foreground)] block">Ninh Lốp Trưởng Bot</span>
                <span className="text-[10px] text-[var(--app-muted)]">Cấp độ: Vừa</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-[var(--app-foreground)] bg-[var(--app-surface-raised)] px-2 py-1 rounded-[4px] border border-[var(--app-border)]">
              09:42
            </span>
          </div>

          {/* Board Centerpiece with discreet vertical evaluation bar */}
          <div className="flex items-center justify-center gap-3 w-full my-1">
            {isEvaluationVisible && (
              <EvaluationBarPrototype score={-1.4} />
            )}
            <div className="flex-1 flex justify-center">
              <ChessBoardPrototype
                lastMove={{ from: 'd1', to: 'h5' }}
                interactive={true}
              />
            </div>
          </div>

          {/* Player Bar */}
          <div className="w-full max-w-[540px] flex items-center justify-between pt-2 mt-1 border-t border-[var(--app-border)] text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--app-accent)] text-[var(--app-bg)] text-sm font-bold">
                ♔
              </div>
              <div>
                <span className="font-bold text-[var(--app-foreground)] block">Bạn (Quân Trắng)</span>
                <span className="text-[10px] text-[var(--app-accent)]">Lượt của bạn</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-[var(--app-foreground)] bg-[var(--app-surface-raised)] px-2 py-1 rounded-[4px] border border-[var(--app-border)]">
              08:15
            </span>
          </div>
        </section>

        {/* RIGHT COLUMN: Streamlined Sidebar (320-350px on desktop) */}
        <aside className="lg:col-span-4 rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs flex flex-col h-[580px] overflow-hidden">
          {/* Sidebar Tabs: Only 3 Main Tabs */}
          <AppTabs
            tabs={tabs}
            selectedId={activeTab}
            onSelectionChange={setActiveTab}
          />

          {/* Sidebar Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'moves' && (
              <div className="flex flex-col h-full justify-between space-y-3">
                <MoveHistoryPrototype />
                <div className="pt-2 border-t border-[var(--app-border)] flex items-center gap-2">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => navigate('/review')}
                  >
                    Xem đánh giá ván cờ
                  </AppButton>
                  <AppButton
                    variant="tertiary"
                    size="sm"
                    leftIcon={<RotateCcw className="h-3 w-3" />}
                    onClick={() => setActiveTab('coach')}
                  >
                    Hỏi Coach
                  </AppButton>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-4 text-xs">
                <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--app-foreground)]">Đánh giá máy tính</span>
                    <span className="font-mono font-bold text-[var(--app-danger)] text-sm">-1.4</span>
                  </div>
                  <p className="text-[11px] text-[var(--app-muted)]">
                    Đen đang chiếm ưu thế nhẹ nhờ kiểm soát ô trung tâm d5 và đe dọa Nf4.
                  </p>
                </div>

                <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3.5 space-y-2">
                  <span className="font-bold text-[var(--app-foreground)] block">Nước đi đề xuất (Candidate Move)</span>
                  <div className="font-mono text-sm font-bold text-[var(--app-success)] bg-[var(--app-surface)] p-2 rounded-[6px] border border-[var(--app-border)]">
                    12. Rfe1 (Độ sâu 18)
                  </div>
                  <p className="text-[11px] text-[var(--app-muted)] leading-relaxed">
                    Đưa Xe vào cột e mở để hỗ trợ Tốt d4 và giảm bớt áp lực sau khi Đen đi Nf4.
                  </p>
                </div>

                <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3.5 space-y-2">
                  <span className="font-bold text-[var(--app-foreground)] block">Biến chính (Principal Variation)</span>
                  <p className="font-mono text-[11px] text-[var(--app-muted)]">
                    12. Rfe1 Nf4 13. Bf1 Bg4 14. h3 Bh5
                  </p>
                </div>

                <SourceDisclosure source="stockfish" engineDepth={18} />
              </div>
            )}

            {activeTab === 'coach' && (
              <CoachPanelPrototype sourceMode="basic" />
            )}
          </div>
        </aside>
      </div>

      {/* Resign Modal Dialog */}
      <AppDialog
        isOpen={showResignModal}
        onOpenChange={setShowResignModal}
        title="Xác nhận đầu hàng ván đấu?"
        description="Bạn sẽ kết thúc ván cờ hiện tại và chuyển sang phần phân tích các nước cờ quan trọng."
        footer={
          <>
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => setShowResignModal(false)}
            >
              Tiếp tục chơi
            </AppButton>
            <AppButton
              variant="danger"
              size="sm"
              onClick={() => {
                setShowResignModal(false);
                navigate('/review');
              }}
            >
              Xác nhận đầu hàng
            </AppButton>
          </>
        }
      >
        <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--app-danger)]/10 border border-[var(--app-danger)]/20 text-xs text-[var(--app-danger)]">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>Ván cờ này sẽ được ghi nhận vào lịch sử để Huấn luyện viên phân tích lỗi sai và tạo lộ trình luyện tập cho bạn.</span>
        </div>
      </AppDialog>
    </div>
  );
}
