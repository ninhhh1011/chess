import { useState, useEffect } from 'react';

/**
 * useMobileTouch - Detect mobile/touch devices and optimize UX
 */
export function useMobileTouch() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { isMobile, isTouchDevice };
}

/**
 * Get appropriate cursor based on device
 */
export function getCursorStyle(isDraggable, isSelected) {
  if (!isDraggable) return 'default';
  if (isSelected) return 'grabbing';
  return 'grab';
}
