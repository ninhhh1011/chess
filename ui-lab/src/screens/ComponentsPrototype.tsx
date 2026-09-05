import { useState } from 'react';
import { AppButton } from '../ui/AppButton';
import { AppDialog } from '../ui/AppDialog';
import { AppTabs } from '../ui/AppTabs';
import { AppField } from '../ui/AppField';
import { AppSelect } from '../ui/AppSelect';
import { AppStatus } from '../ui/AppStatus';
import { AppTooltip } from '../ui/AppTooltip';
import { AppPopover } from '../ui/AppPopover';
import { AppProgress } from '../ui/AppProgress';
import { Play, Sparkles, Check, Search } from 'lucide-react';

export function ComponentsPrototype() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('tab1');
  const [selectVal, setSelectVal] = useState('opt2');
  const [fieldVal, setFieldVal] = useState('e4');
  const [progressVal, setProgressVal] = useState(68);

  const tabs = [
    { id: 'tab1', label: 'Ván đấu', badge: 12 },
    { id: 'tab2', label: 'Phân tích' },
    { id: 'tab3', label: 'Huấn luyện', badge: 'AI' },
  ];

  const selectOptions = [
    { value: 'opt1', label: 'Cấp độ: Dễ', hint: 'Mới tập' },
    { value: 'opt2', label: 'Cấp độ: Vừa', hint: 'Tiêu chuẩn' },
    { value: 'opt3', label: 'Cấp độ: Khó', hint: 'Nâng cao' },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="border-b border-[var(--app-border)] pb-4">
        <h1 className="text-2xl font-extrabold text-[var(--app-foreground)]">
          HeroUI v3.2.4 Wrapper Component Catalog
        </h1>
        <p className="text-xs text-[var(--app-muted)] mt-1">
          Tập trung quản lý các thành phần giao diện HeroUI v3 theo Compound Component Pattern và Option C Design Tokens.
        </p>
      </div>

      {/* 1. AppButton */}
      <section className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-subtle)]">
          1. AppButton (Radius: 8px · Quiet Motion · 6 Variants)
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <AppButton variant="primary" leftIcon={<Play className="h-4 w-4" />}>
            Primary (Pine Green)
          </AppButton>
          <AppButton variant="secondary">
            Secondary
          </AppButton>
          <AppButton variant="tertiary">
            Tertiary
          </AppButton>
          <AppButton variant="outline">
            Outline
          </AppButton>
          <AppButton variant="danger">
            Danger
          </AppButton>
          <AppButton variant="ghost">
            Ghost
          </AppButton>
          <AppButton variant="primary" isLoading>
            Loading
          </AppButton>
        </div>
      </section>

      {/* 2. AppStatus & Badges */}
      <section className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-subtle)]">
          2. AppStatus (Radius: 6px · Semantic Roles)
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <AppStatus variant="engine" icon={<Sparkles className="h-3.5 w-3.5" />}>
            Stockfish Engine
          </AppStatus>
          <AppStatus variant="ai">
            Trợ lý AI
          </AppStatus>
          <AppStatus variant="basic">
            Diễn giải cơ bản
          </AppStatus>
          <AppStatus variant="warning">
            Cảnh báo Inaccuracy
          </AppStatus>
          <AppStatus variant="danger">
            Sai lầm Blunder
          </AppStatus>
          <AppStatus variant="gold">
            Thế cờ Tối ưu
          </AppStatus>
        </div>
      </section>

      {/* 3. AppTabs */}
      <section className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-subtle)]">
          3. AppTabs (Underline & Segmented variants)
        </h2>
        <div className="space-y-4 max-w-md">
          <AppTabs
            tabs={tabs}
            selectedId={selectedTab}
            onSelectionChange={setSelectedTab}
            variant="underline"
          />
          <AppTabs
            tabs={tabs}
            selectedId={selectedTab}
            onSelectionChange={setSelectedTab}
            variant="segment"
          />
        </div>
      </section>

      {/* 4. AppField & AppSelect */}
      <section className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-subtle)]">
          4. AppField & AppSelect (Radius: 8px · Accessible focus ring)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <AppField
            label="Nước cờ San"
            placeholder="e.g. e4, Nf3"
            value={fieldVal}
            onChange={(e) => setFieldVal(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            description="Nhập nước đi để phân tích thế cờ"
          />
          <AppSelect
            label="Mức độ chơi"
            options={selectOptions}
            value={selectVal}
            onChange={setSelectVal}
          />
        </div>
      </section>

      {/* 5. AppProgress */}
      <section className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-subtle)]">
          5. AppProgress (Radius: 6px · Option C Variants)
        </h2>
        <div className="space-y-3 max-w-lg">
          <AppProgress
            value={progressVal}
            label="Khai cuộc & Phát triển quân"
            showValue
            variant="pine"
          />
          <AppProgress
            value={85}
            label="Chiến thuật cơ bản (Tactics)"
            showValue
            variant="teal"
          />
          <AppProgress
            value={45}
            label="Nhận diện quân bị treo"
            showValue
            variant="copper"
          />
          <div className="flex gap-2 pt-2">
            <AppButton size="sm" variant="secondary" onClick={() => setProgressVal((p) => Math.max(0, p - 10))}>
              -10%
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={() => setProgressVal((p) => Math.min(100, p + 10))}>
              +10%
            </AppButton>
          </div>
        </div>
      </section>

      {/* 6. AppTooltip & AppPopover & AppDialog */}
      <section className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-subtle)]">
          6. AppTooltip, AppPopover & AppDialog (Overlays)
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <AppTooltip content="Tính toán bởi Stockfish 18 Wasm">
            <button type="button" className="px-3 py-1.5 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-xs text-[var(--app-muted)] hover:text-[var(--app-foreground)]">
              Rê chuột xem Tooltip
            </button>
          </AppTooltip>

          <AppPopover
            title="Tùy chọn nhanh"
            trigger={
              <button type="button" className="px-3 py-1.5 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-xs text-[var(--app-muted)] hover:text-[var(--app-foreground)]">
                Bấm mở AppPopover
              </button>
            }
          >
            <div className="space-y-2">
              <p className="text-xs text-[var(--app-muted)]">Nội dung Popover mẫu với radius 12px và border Option C.</p>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--app-accent)] font-semibold">
                <Check className="h-3.5 w-3.5" />
                <span>Thiết lập đã lưu</span>
              </div>
            </div>
          </AppPopover>

          <AppButton variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            Mở AppDialog Modal
          </AppButton>
        </div>
      </section>

      {/* Modal dialog instance */}
      <AppDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Tiêu chuẩn Hộp thoại AppDialog"
        description="Được thiết kế tuân thủ nghiêm ngặt HeroUI v3 với Focus Trap, ESC handling và Option C styling"
        footer={
          <>
            <AppButton variant="secondary" size="sm" onClick={() => setDialogOpen(false)}>
              Đóng
            </AppButton>
            <AppButton variant="primary" size="sm" onClick={() => setDialogOpen(false)}>
              Đồng ý
            </AppButton>
          </>
        }
      >
        <div className="space-y-2 text-xs text-[var(--app-muted)] leading-relaxed">
          <p>
            Mọi modal dialog trong hệ thống đều dùng chung wrapper này, đảm bảo không có nested card, bán kính góc 12px, nền surface raised và phím Escape đóng hộp thoại một cách chuẩn mực.
          </p>
        </div>
      </AppDialog>
    </div>
  );
}
