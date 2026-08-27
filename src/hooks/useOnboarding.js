import { useState, useEffect } from 'react';

const STORAGE_KEY = 'chess-app-onboarding';

/**
 * Onboarding hook - shows tips for first-time users
 */
export function useOnboarding() {
  const [showTips, setShowTips] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setShowTips(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowTips(false);
  };

  const nextTip = () => {
    if (currentTip < tips.length - 1) {
      setCurrentTip(currentTip + 1);
    } else {
      dismiss();
    }
  };

  return { showTips, currentTip, tips, nextTip, dismiss };
}

const tips = [
  {
    title: 'Chào mừng!',
    content: 'Ninh Lốp Trưởng Chess giúp bạn học cờ vua qua thực hành.',
    icon: '♟',
  },
  {
    title: 'Di chuyển quân',
    content: 'Click hoặc kéo quân đến ô hợp lệ. Ô sáng lên khi có quân được chọn.',
    icon: '👆',
  },
  {
    title: 'Phím tắt',
    content: 'U = đi lại | H = gợi ý | F = lật bàn | R = đầu hàng',
    icon: '⌨️',
  },
  {
    title: 'AI Coach',
    content: 'Bấm nút để được phân tích nước đi và nhận lời khuyên.',
    icon: '🤖',
  },
];

export default useOnboarding;
