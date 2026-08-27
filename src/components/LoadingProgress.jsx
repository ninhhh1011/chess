import { useState, useEffect } from 'react';

/**
 * LoadingProgress - Shows a subtle loading bar during route transitions
 */
export default function LoadingProgress() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    let timeout;

    const startLoading = () => {
      setLoading(true);
      setProgress(0);
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p; // Cap at 90% until done
          return p + Math.random() * 15;
        });
      }, 200);
    };

    const stopLoading = () => {
      clearInterval(interval);
      setProgress(100);
      timeout = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    };

    // Listen for navigation start/end events
    const handleStart = () => startLoading();
    const handleEnd = () => stopLoading();

    window.addEventListener('beforeNavigate', handleStart);
    window.addEventListener('afterNavigate', handleEnd);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('beforeNavigate', handleStart);
      window.removeEventListener('afterNavigate', handleEnd);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-bg-base">
      <div
        className="h-full bg-primary-400 transition-all duration-200 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
