export default function DailyTrainingPlan({ plan, onRegenerate, onStartLesson, onStartExercises, onStartOpening }) {
  return <article className="rounded-[2rem] border border-gold/20 bg-gradient-to-br from-gold/15 via-white/[.07] to-white/[.04] p-6 shadow-glow backdrop-blur">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-gold/80">Lộ trình hôm nay</p>
        <h2 className="mt-2 text-3xl font-black">Hôm nay bạn nên luyện</h2>
      </div>
      <button className="btn-secondary" onClick={onRegenerate}>Tạo lại lộ trình hôm nay</button>
    </div>

    <div className="mt-6 grid gap-4 lg:grid-cols-4">
      <div className="rounded-3xl bg-ink/45 p-5">
        <p className="font-black text-gold">1. Học</p>
        <h3 className="mt-2 text-xl font-extrabold">{plan?.lesson?.title || 'Ôn kiến thức cơ bản'}</h3>
        <p className="mt-2 text-sm leading-6 text-cream/65">{plan?.lesson?.reason || 'Chưa đủ dữ liệu nên ôn lại bài cũ.'}</p>
      </div>
      <div className="rounded-3xl bg-ink/45 p-5">
        <p className="font-black text-gold">2. Làm bài tập</p>
        <ul className="mt-2 space-y-2 text-sm text-cream/75">
          {(plan?.exercises || []).slice(0, 5).map((exercise) => <li key={exercise.id}>• {exercise.title}</li>)}
        </ul>
      </div>
      <div className="rounded-3xl bg-ink/45 p-5">
        <p className="font-black text-gold">3. Khai cuộc</p>
        <h3 className="mt-2 text-xl font-extrabold">{plan?.opening?.vietnameseName || 'Khai cuộc cơ bản'}</h3>
        <p className="mt-2 text-sm leading-6 text-cream/65">{plan?.opening?.reason || 'Luyện 3-5 nước đầu để xây nền khai cuộc.'}</p>
      </div>
      <div className="rounded-3xl bg-ink/45 p-5">
        <p className="font-black text-gold">4. Chơi</p>
        <p className="mt-2 text-sm leading-6 text-cream/75">{plan?.challenge || 'Chơi 1 ván và review lại.'}</p>
      </div>
    </div>

    <div className="mt-6 flex flex-wrap gap-3">
      <button className="btn-primary" onClick={onStartLesson}>Bắt đầu bài học đề xuất</button>
      <button className="btn-secondary" onClick={onStartExercises}>Làm bài tập đề xuất</button>
      <button className="btn-secondary" onClick={onStartOpening}>Luyện khai cuộc</button>
    </div>
  </article>;
}
