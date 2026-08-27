import { useBoardTheme, applyBoardTheme } from '../hooks/useBoardTheme';
import { useEffect } from 'react';

export default function BoardThemeSelector() {
  const { theme, currentTheme, setTheme, themes } = useBoardTheme();

  // Apply theme on mount and change
  useEffect(() => {
    applyBoardTheme(theme);
  }, [theme]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-text-primary">Màu bàn cờ</h4>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(themes).map(([id, themeData]) => (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className={`group relative overflow-hidden rounded-lg border-2 p-0.5 transition-all ${
              currentTheme === id
                ? 'border-primary-400 scale-105 shadow-lg'
                : 'border-border hover:border-primary-300/50'
            }`}
            title={themeData.name}
          >
            {/* Mini board preview */}
            <div className="aspect-square grid grid-cols-4 overflow-hidden rounded">
              {Array.from({ length: 16 }).map((_, i) => {
                const isDark = (Math.floor(i / 4) + (i % 4)) % 2 === 1;
                return (
                  <div
                    key={i}
                    style={{ backgroundColor: isDark ? themeData.dark : themeData.light }}
                  />
                );
              })}
            </div>
            {/* Theme name overlay */}
            <div className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-center text-[9px] font-medium transition-colors ${
              currentTheme === id
                ? 'bg-primary-400/90 text-bg-base'
                : 'bg-bg-base/80 text-text-secondary group-hover:bg-bg-base'
            }`}>
              {themeData.name}
            </div>
            {/* Selected indicator */}
            {currentTheme === id && (
              <div className="absolute right-0 top-0">
                <div className="h-3 w-3 rounded-bl-lg bg-primary-400" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
