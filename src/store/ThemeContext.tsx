import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { applyTheme, getTheme, readStoredThemeId } from '../lib/themes';
import { ThemeContext } from './useTheme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(readStoredThemeId);
  const theme = useMemo(() => getTheme(themeId), [themeId]);

  // 只写 DOM 变量，不在 effect 里同步 setState
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setThemeId }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
