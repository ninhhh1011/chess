import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../ui/AppButton';
import { AppStatus } from '../ui/AppStatus';
import { Play, Calendar, Trophy, Swords, Sparkles, ChevronRight, Layers, Lock, Monitor, Smartphone, Component } from 'lucide-react';

export function GalleryPrototype() {
  const navigate = useNavigate();
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile'>('desktop');

  const screens = [
    {
      title: '1. Trang chủ (Home)',
      path: '/home',
      desc: 'Hero typography tinh giản, preview bàn cờ thế cờ thực tế, quy trình 4 bước học tập.',
      icon: Play,
      badge: 'HeroUI Buttons & Layout',
      desktopImg: '/screenshots/option-c/home-desktop.png',
      mobileImg: '/screenshots/option-c/home-mobile.png',
    },
    {
      title: '2. Tiền sảnh (Lobby)',
      path: '/lobby',
      desc: 'Chọn 4 cấp độ Bot (Dễ, Vừa, Khó, Thử thách) dạng segmented, không hiển thị Elo, chọn màu quân.',
      icon: Swords,
      badge: 'Segmented Controls',
      desktopImg: '/screenshots/option-c/lobby-desktop.png',
      mobileImg: '/screenshots/option-c/lobby-mobile.png',
    },
    {
      title: '3. Màn chơi (Play)',
      path: '/play',
      desc: 'Bàn cờ chiếm 65% desktop, sidebar 3 tab tinh gọn, thanh đánh giá, Popover cài đặt, SourceDisclosure.',
      icon: Layers,
      badge: 'Board Centerpiece & Popover',
      desktopImg: '/screenshots/option-c/play-desktop.png',
      mobileImg: '/screenshots/option-c/play-mobile.png',
    },
    {
      title: '4. Đánh giá ván (Review)',
      path: '/review',
      desc: 'Đúng thứ tự 5 phần: Kết quả ván, Summary, 3 lỗi then chốt (MistakeReviewRow), CTA, Thống kê thu gọn.',
      icon: Trophy,
      badge: 'MistakeReviewRow & Dialog',
      desktopImg: '/screenshots/option-c/review-desktop.png',
      mobileImg: '/screenshots/option-c/review-mobile.png',
    },
    {
      title: '5. Lộ trình ngày (Progress)',
      path: '/progress',
      desc: 'Đúng 5 nhiệm vụ: 1 lesson, 3 puzzle, 1 challenge; đo tiến độ kỹ năng bằng AppProgress.',
      icon: Calendar,
      badge: 'AppProgress & Tasks',
      desktopImg: '/screenshots/option-c/progress-desktop.png',
      mobileImg: '/screenshots/option-c/progress-mobile.png',
    },
    {
      title: '6. Thư viện Component (Catalog)',
      path: '/components',
      desc: 'Bảng tổng hợp tất cả HeroUI wrappers: AppButton, AppDialog, AppTabs, AppField, AppSelect, AppStatus, AppTooltip, AppPopover, AppProgress.',
      icon: Component,
      badge: 'HeroUI Wrappers',
      desktopImg: '',
      mobileImg: '',
    },
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Locked Option C Hero Banner */}
      <section className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[var(--app-accent-soft)] text-[var(--app-accent)] text-xs font-bold border border-[var(--app-accent)]/25">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Môi trường Thử nghiệm Độc lập — HeroUI v3.2.4</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-xs text-[var(--app-copper)] font-semibold">
            <Lock className="h-3.5 w-3.5" />
            <span>Theme đã khóa: Option C (Charcoal + Pine + Copper)</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--app-foreground)] tracking-tight">
          Option C — Charcoal + Pine + Copper Prototype
        </h1>

        <p className="text-sm sm:text-base text-[var(--app-muted)] max-w-3xl leading-relaxed">
          Giao diện được xây dựng độc lập trong <code className="text-[var(--app-accent)] font-mono text-xs bg-[var(--app-surface-raised)] px-1.5 py-0.5 rounded-[4px]">ui-lab/</code> bằng Tailwind CSS v4 và HeroUI v3. Hệ thống token màu sắc, typography và micro-motion tuân thủ tuyệt đối quy chuẩn locked: Pine green cho tương tác chính, Copper cho nước cờ và highlight, Teal cho trạng thái hoàn thành.
        </p>

        {/* Color Palette Display */}
        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-2">
          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-[#0C100E] border border-[var(--app-border)]" />
              <span className="text-xs font-bold text-[var(--app-foreground)]">Charcoal</span>
            </div>
            <p className="text-[10px] text-[var(--app-subtle)] font-mono">#0C100E Base</p>
          </div>

          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-[#3FAD79]" />
              <span className="text-xs font-bold text-[var(--app-foreground)]">Pine Green</span>
            </div>
            <p className="text-[10px] text-[var(--app-subtle)] font-mono">#3FAD79 Primary</p>
          </div>

          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-[#C88954]" />
              <span className="text-xs font-bold text-[var(--app-foreground)]">Copper</span>
            </div>
            <p className="text-[10px] text-[var(--app-subtle)] font-mono">#C88954 Highlight</p>
          </div>

          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-[#49A6A0]" />
              <span className="text-xs font-bold text-[var(--app-foreground)]">Teal</span>
            </div>
            <p className="text-[10px] text-[var(--app-subtle)] font-mono">#49A6A0 Success</p>
          </div>

          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-[#C89B4F]" />
              <span className="text-xs font-bold text-[var(--app-foreground)]">Amber</span>
            </div>
            <p className="text-[10px] text-[var(--app-subtle)] font-mono">#C89B4F Warning</p>
          </div>

          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-[#D46666]" />
              <span className="text-xs font-bold text-[var(--app-foreground)]">Coral Red</span>
            </div>
            <p className="text-[10px] text-[var(--app-subtle)] font-mono">#D46666 Danger</p>
          </div>
        </div>
      </section>

      {/* Screens Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--app-foreground)]">
            Các màn hình Prototype Option C
          </h2>
          <span className="text-xs text-[var(--app-muted)]">Bấm vào từng màn hình để xem và tương tác</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {screens.map((screen) => {
            const Icon = screen.icon;
            return (
              <div
                key={screen.path}
                onClick={() => navigate(screen.path)}
                className="group rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-3 transition-all duration-150 hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-raised)] cursor-pointer shadow-xs flex flex-col justify-between"
                style={{ borderRadius: '10px' }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <AppStatus variant="ai" size="sm">
                      {screen.badge}
                    </AppStatus>
                  </div>

                  <h3 className="text-base font-bold text-[var(--app-foreground)] group-hover:text-[var(--app-accent)] transition-colors">
                    {screen.title}
                  </h3>

                  <p className="text-xs text-[var(--app-muted)] leading-relaxed">
                    {screen.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--app-border)] flex items-center justify-between text-xs font-semibold text-[var(--app-accent)]">
                  <span>Mở màn hình</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Screenshot Gallery Section (Section 16 Requirement) */}
      <section className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--app-border)] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--app-foreground)]">
              Thư viện Ảnh chụp Prototype Option C (Screenshots Gallery)
            </h2>
            <p className="text-xs text-[var(--app-muted)] mt-0.5">
              Ảnh chụp tự động độ phân giải cao Desktop (1440×900) và Mobile (390×844) tại <code className="text-xs font-mono text-[var(--app-subtle)]">ui-lab/screenshots/option-c/</code>
            </p>
          </div>

          {/* Viewport toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--app-bg)] rounded-[8px] border border-[var(--app-border)]">
            <button
              type="button"
              onClick={() => setSelectedDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                selectedDevice === 'desktop'
                  ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)]'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop 1440×900</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                selectedDevice === 'mobile'
                  ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)]'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile 390×844</span>
            </button>
          </div>
        </div>

        {/* Screenshots Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Trang chủ (Home)', fileDesktop: 'home-desktop.png', fileMobile: 'home-mobile.png', route: '/home' },
            { name: 'Tiền sảnh (Lobby)', fileDesktop: 'lobby-desktop.png', fileMobile: 'lobby-mobile.png', route: '/lobby' },
            { name: 'Màn chơi (Play)', fileDesktop: 'play-desktop.png', fileMobile: 'play-mobile.png', route: '/play' },
            { name: 'Đánh giá ván (Review)', fileDesktop: 'review-desktop.png', fileMobile: 'review-mobile.png', route: '/review' },
            { name: 'Lộ trình ngày (Progress)', fileDesktop: 'progress-desktop.png', fileMobile: 'progress-mobile.png', route: '/progress' },
          ].map((item) => {
            const fileName = selectedDevice === 'desktop' ? item.fileDesktop : item.fileMobile;
            const imgSrc = `/screenshots/option-c/${fileName}`;
            return (
              <div
                key={item.name}
                className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] overflow-hidden space-y-2 p-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[var(--app-foreground)] pb-1">
                  <span>{item.name}</span>
                  <span className="font-mono text-[10px] text-[var(--app-subtle)]">{fileName}</span>
                </div>
                <div className="aspect-video w-full bg-[var(--app-bg)] rounded-[6px] border border-[var(--app-border)] overflow-hidden flex items-center justify-center relative group">
                  <img
                    src={imgSrc}
                    alt={`${item.name} ${selectedDevice}`}
                    className="w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback placeholder if image not yet generated
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <AppButton size="sm" variant="primary" onClick={() => navigate(item.route)}>
                      Xem trực tiếp
                    </AppButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
