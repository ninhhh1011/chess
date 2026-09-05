import { useState } from 'react';
import {
  PROTOTYPE_DAILY_TASKS,
  PROTOTYPE_SKILLS,
  type DailyTaskItem,
} from '../fixtures/prototypeOnlyData';
import { AppButton } from '../ui/AppButton';
import { AppProgress } from '../ui/AppProgress';
import { AppStatus } from '../ui/AppStatus';
import {
  CheckCircle2,
  Circle,
  BookOpen,
  Puzzle,
  Swords,
  TrendingUp,
  Sparkles,
  CloudCheck,
  RotateCcw,
} from 'lucide-react';

export function DailyPlanPrototype() {
  const [tasks, setTasks] = useState<DailyTaskItem[]>(PROTOTYPE_DAILY_TASKS);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  const getTaskBadge = (type: DailyTaskItem['type']) => {
    switch (type) {
      case 'lesson':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-accent)] bg-[var(--app-accent-soft)] px-2 py-0.5 rounded-[4px]">
            <BookOpen className="h-3 w-3" />
            <span>Bài học</span>
          </span>
        );
      case 'puzzle':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-success)] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 py-0.5 rounded-[4px]">
            <Puzzle className="h-3 w-3" />
            <span>Bài tập</span>
          </span>
        );
      case 'challenge':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-copper)] bg-[var(--app-copper-soft)] px-2 py-0.5 rounded-[4px]">
            <Swords className="h-3 w-3" />
            <span>Thực chiến</span>
          </span>
        );
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 w-full">
      {/* LEFT COLUMN: Kế hoạch hôm nay (5 Tasks) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Header Strip with completion state */}
        <div
          className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-3"
          style={{ borderRadius: '10px' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--app-accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-accent)]">
                  Lộ trình cá nhân hóa
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--app-foreground)]">
                Kế hoạch hôm nay
              </h2>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-[var(--app-muted)]">
                Đã hoàn thành: {completedCount}/{tasks.length} nhiệm vụ
              </span>
            </div>
          </div>

          {/* AppProgress Component */}
          <AppProgress
            value={progressPercent}
            showValue
            valueLabel={`${completedCount}/${tasks.length} xong (${progressPercent}%)`}
            variant="pine"
            size="md"
          />
        </div>

        {/* The 5 Tasks: 1 Lesson, 3 Puzzles, 1 Challenge */}
        <div className="space-y-2.5">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className={`rounded-[10px] border p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                task.completed
                  ? 'border-[var(--app-border)] bg-[var(--app-surface)] opacity-85'
                  : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:border-[var(--app-accent)]/40 shadow-xs'
              }`}
              style={{ borderRadius: '10px' }}
            >
              {/* Checkbox toggle & Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 text-[var(--app-muted)] hover:text-[var(--app-accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] rounded-[4px]"
                  aria-label={
                    task.completed
                      ? `Đánh dấu chưa xong ${task.title}`
                      : `Đánh dấu xong ${task.title}`
                  }
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--app-success)]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[var(--app-subtle)]" />
                  )}
                </button>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getTaskBadge(task.type)}
                    <span className="text-[10px] text-[var(--app-subtle)]">
                      Nhiệm vụ {idx + 1} · {task.durationOrDiff}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)]">
                      {task.skillTag}
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold leading-snug ${
                      task.completed
                        ? 'line-through text-[var(--app-muted)]'
                        : 'text-[var(--app-foreground)]'
                    }`}
                  >
                    {task.title}
                  </h3>

                  <p className="text-xs text-[var(--app-muted)] leading-relaxed">
                    {task.reason}
                  </p>
                </div>
              </div>

              {/* Task CTA */}
              <div className="shrink-0 pl-8 sm:pl-0">
                <AppButton
                  variant={task.completed ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => toggleTask(task.id)}
                >
                  {task.completed ? 'Ôn lại' : task.actionLabel}
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Skill progress, Recent improvement, Sync/account status */}
      <div className="lg:col-span-5 space-y-4">
        {/* Skill Progress with AppProgress */}
        <div
          className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-4"
          style={{ borderRadius: '10px' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
            <h3 className="text-sm font-bold text-[var(--app-foreground)]">
              Tiến độ kỹ năng cá nhân
            </h3>
            <span className="text-xs font-semibold text-[var(--app-success)] flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+7% tuần này</span>
            </span>
          </div>

          <div className="space-y-3.5">
            {PROTOTYPE_SKILLS.map((skill) => (
              <div key={skill.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--app-foreground)]">
                    {skill.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--app-muted)]">
                      {skill.status}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--app-accent)]">
                      {skill.score}/100
                    </span>
                  </div>
                </div>

                <AppProgress
                  value={skill.score}
                  variant={skill.score < 65 ? 'warning' : 'pine'}
                  size="sm"
                />

                <div className="text-[10px] text-[var(--app-subtle)] text-right">
                  {skill.progressText}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Improvement Card */}
        <div
          className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 space-y-2"
          style={{ borderRadius: '10px' }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--app-foreground)]">
              Cải thiện gần nhất
            </h4>
            <AppStatus variant="ai" size="sm">
              Gợi ý từ Coach
            </AppStatus>
          </div>
          <p className="text-xs text-[var(--app-muted)] leading-relaxed">
            Bạn đã khắc phục việc bỏ quên quân Tượng bị ghim trong 2 ván gần nhất. Hãy tiếp tục duy trì thói quen kiểm tra đường chéo trước khi đi Tốt.
          </p>
        </div>

        {/* Compact Sync & Account Status (Section 13) */}
        <div
          className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3 flex items-center justify-between text-xs text-[var(--app-muted)]"
          style={{ borderRadius: '8px' }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
            <span>Đồng bộ: <strong>Đã lưu cục bộ</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--app-subtle)]">
            <span>Phiên bản: 1.0</span>
            <span>·</span>
            <button
              type="button"
              className="text-[var(--app-accent)] hover:underline flex items-center gap-1"
              title="Làm mới trạng thái"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Đồng bộ lại</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
