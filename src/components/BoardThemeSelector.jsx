import { useBoardTheme, applyBoardTheme } from '../hooks/useBoardTheme';
import { useEffect } from 'react';
import { AppRadioGroup } from '@/ui/AppRadioGroup';
import { Radio } from '@heroui/react';

export default function BoardThemeSelector() {
  const { theme, currentTheme, setTheme, themes } = useBoardTheme();

  // Apply theme on mount and change
  useEffect(() => {
    applyBoardTheme(theme);
  }, [theme]);

  return (
    <div className="space-y-3">
      <AppRadioGroup
        label="Màu bàn cờ"
        value={currentTheme}
        onChange={setTheme}
        className="w-full"
      >
        <div className="grid grid-cols-3 gap-2 mt-1">
          {Object.entries(themes).map(([id, themeData]) => {
            const isSelected = currentTheme === id;
            return (
              <Radio
                key={id}
                value={id}
                className="group relative cursor-pointer m-0 flex-col items-stretch overflow-hidden rounded-[8px] border p-0.5 transition-all data-[selected=true]:border-[var(--app-accent)] data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--app-accent)] border-[var(--app-border)] hover:border-[var(--app-border-strong)]"
                aria-label={themeData.name}
              >
                {/* Mini board preview */}
                <div className="aspect-square grid grid-cols-4 overflow-hidden rounded-[6px]">
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
                <div
                  className={`py-1 text-center text-[10px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-[var(--app-accent)] text-[var(--app-background)] font-bold'
                      : 'bg-[var(--app-surface-raised)] text-[var(--app-muted)] group-hover:text-[var(--app-foreground)]'
                  }`}
                >
                  {themeData.name}
                </div>
              </Radio>
            );
          })}
        </div>
      </AppRadioGroup>
    </div>
  );
}
