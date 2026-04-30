import { useState, useEffect } from 'react';
import ExerciseBoard from '../components/ExerciseBoard';
import { exercises } from '../data/exercises';
import { getUserProfile, updateExerciseResult } from '../services/userProfileService';

export default function Exercises() {
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[Exercises] Component mounted');
    console.log('[Exercises] Exercises data:', exercises);
    
    try {
      const userProfile = getUserProfile();
      console.log('[Exercises] User profile:', userProfile);
      setProfile(userProfile);
      setLoading(false);
    } catch (err) {
      console.error('[Exercises] Error loading profile:', err);
      setError('Không thể tải dữ liệu người dùng');
      setLoading(false);
    }
  }, []);

  function handleResult(result) {
    try {
      const updatedProfile = updateExerciseResult(result);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('[Exercises] Error updating result:', err);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-black text-cream">Đang tải...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-8 text-center">
          <h1 className="text-4xl font-black text-red-400">Lỗi</h1>
          <p className="mt-4 text-cream/70">{error}</p>
        </div>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
          <h1 className="text-4xl font-black text-amber-400">Chưa có bài tập</h1>
          <p className="mt-4 text-cream/70">Hiện tại chưa có bài tập nào. Vui lòng quay lại sau.</p>
        </div>
      </div>
    );
  }

  const exercise = exercises[index];

  if (!exercise) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-8 text-center">
          <h1 className="text-4xl font-black text-red-400">Lỗi bài tập</h1>
          <p className="mt-4 text-cream/70">Không tìm thấy bài tập #{index + 1}</p>
          <button 
            className="btn-primary mt-6" 
            onClick={() => setIndex(0)}
          >
            Quay về bài đầu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-cream md:text-5xl">Bài tập cờ vua</h1>
          <p className="mt-4 text-cream/70">
            Giải bài {index + 1}/{exercises.length}. 
            {profile?.exerciseStats && ` Độ chính xác hiện tại: ${profile.exerciseStats.accuracy}%.`}
          </p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setIndex((index + 1) % exercises.length)}
        >
          Bài tiếp theo
        </button>
      </div>
      <ExerciseBoard key={index} exercise={exercise} onResult={handleResult} />
    </div>
  );
}
