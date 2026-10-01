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
          variant="outline"
          size="sm"
          onClick={() => setSelected(null)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Quay lại danh sách bài học
        </AppButton>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <AppCard className="p-6 sm:p-8 space-y-6">
            <AppCard.Header className="space-y-2 p-0">
              <div>
                <AppStatus variant="teal" size="sm">
                  Bài học cờ vua
                </AppStatus>
              </div>
              <AppCard.Title className="text-2xl sm:text-3xl font-bold text-[var(--app-foreground)]">
                {selected.title}
              </AppCard.Title>
            </AppCard.Header>

            <AppCard.Content className="p-0 space-y-4">
              <p className="text-sm leading-relaxed text-[var(--app-muted)]">
                {selected.content}
              </p>

              <AppSurface variant="raised" radius="sm" className="p-4 space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--app-foreground)]">
                  Ví dụ minh họa
                </h2>
                <p className="text-xs leading-relaxed text-[var(--app-muted)]">
                  {selected.example}
                </p>
              </AppSurface>

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

          {/* Chess board example with Option C colors */}
          <AppSurface
            variant="base"
            radius="md"
            className="mx-auto w-full max-w-[400px] p-3 shadow-sm h-fit"
          >
            <Chessboard
              options={{
                position: selected.fen,
                allowDragging: false,
                showNotation: true,
                darkSquareStyle: { backgroundColor: '#66745C' },
                lightSquareStyle: { backgroundColor: '#DAD2BD' },
              }}
            />
          </AppSurface>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--app-foreground)]">
          Học cờ cơ bản
        </h1>
        <p className="text-xs sm:text-sm text-[var(--app-muted)]">
          Chọn một bài học ngắn, dễ hiểu để làm quen từng luật quan trọng của cờ vua.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} onClick={() => setSelected(l)} />
        ))}
      </div>
    </section>
  );
}
