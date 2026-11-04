import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import LessonCard from '../components/LessonCard';
import { lessons } from '../data/lessons';
import { getUserProfile, markLessonCompleted } from '../services/userProfileService';
import { AppButton } from '@/ui/AppButton';
import { AppCard } from '@/ui/AppCard';
import { AppSurface } from '@/ui/AppSurface';
import { AppStatus } from '@/ui/AppStatus';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Learn() {
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(() => getUserProfile());

  function completeLesson(lessonId) {
    setProfile(markLessonCompleted(lessonId));
  }

  if (selected) {
    const isDone = profile.lessonsCompleted?.includes(selected.id);
    return (
      <section className="space-y-6 max-w-6xl mx-auto">
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => setSelected(null)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="rounded-full shadow-2xs"
        >
          Quay lại danh sách bài học
        </AppButton>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px] items-start">
          <AppCard className="p-7 sm:p-10 space-y-6 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-card)]">
            <AppCard.Header className="space-y-3 p-0">
              <div>
                <AppStatus variant="teal" size="sm">
                  Bài học cờ vua
                </AppStatus>
              </div>
              <AppCard.Title className="font-serif text-3xl sm:text-4xl font-bold text-[#030302]">
                {selected.title}
              </AppCard.Title>
            </AppCard.Header>

            <AppCard.Content className="p-0 space-y-5">
              <p className="text-sm sm:text-base leading-relaxed text-[var(--app-muted)]">
                {selected.content}
              </p>

              <div className="p-5 rounded-[20px] bg-[var(--app-muted-surface)]/60 border border-[var(--app-border)] space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#030302]">
                  Ví dụ minh họa
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-[var(--app-muted)]">
                  {selected.example}
                </p>
              </div>

              <div className="pt-2">
                <AppButton
                  variant={isDone ? 'secondary' : 'primary'}
                  size="md"
                  onClick={() => completeLesson(selected.id)}
                  leftIcon={isDone ? <CheckCircle2 className="h-4 w-4 text-[var(--app-success)]" /> : undefined}
                >
                  {isDone ? 'Đã hoàn thành bài học' : 'Đánh dấu đã hoàn thành'}
                </AppButton>
              </div>
            </AppCard.Content>
          </AppCard>

          {/* Chess board example with Craft Soft Editorial colors */}
          <div className="mx-auto w-full max-w-[420px] p-3.5 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-card)]">
            <div className="overflow-hidden rounded-[18px] border border-[var(--app-border)]">
              <Chessboard
                options={{
                  position: selected.fen,
                  allowDragging: false,
                  showNotation: true,
                  darkSquareStyle: { backgroundColor: '#587982' },
                  lightSquareStyle: { backgroundColor: '#FBF9F5' },
                }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-widest font-semibold text-[var(--app-secondary)]">Khóa học</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#030302]">
          Học cờ cơ bản
        </h1>
        <p className="text-xs sm:text-sm text-[var(--app-muted)] max-w-xl leading-relaxed">
          Chọn một bài học ngắn, dễ hiểu để làm quen từng luật quan trọng và chiến thuật cốt lõi của cờ vua.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
        {lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} onClick={() => setSelected(l)} />
        ))}
      </div>
    </section>
  );
}
