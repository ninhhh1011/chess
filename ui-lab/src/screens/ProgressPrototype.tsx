import { DailyPlanPrototype } from '../components/DailyPlanPrototype';

export function ProgressPrototype() {
  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--app-foreground)]">
          Tiến độ rèn luyện & Kế hoạch ngày
        </h1>
        <p className="text-xs sm:text-sm text-[var(--app-muted)]">
          Được cá nhân hóa tự động dựa trên các ván cờ thực chiến và bài tập gần nhất của bạn.
        </p>
      </div>

      <DailyPlanPrototype />
    </div>
  );
}
