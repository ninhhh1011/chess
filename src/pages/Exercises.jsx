import { useState } from 'react';
import ExerciseBoard from '../components/ExerciseBoard';
import { exercises } from '../data/exercises';

export default function Exercises() {
  const [index, setIndex] = useState(0);
  const exercise = exercises[index];
  return <section>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-4xl font-black md:text-5xl">Bài tập</h1><p className="mt-4 text-cream/70">Giải bài {index + 1}/{exercises.length}. Hãy tìm nước đi đúng.</p></div>
      <button className="btn-primary" onClick={() => setIndex((index + 1) % exercises.length)}>Bài tiếp theo</button>
    </div>
    <ExerciseBoard key={index} exercise={exercise} />
  </section>;
}
