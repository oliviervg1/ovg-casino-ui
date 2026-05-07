import { useEffect, useState } from 'react';
import { themeManifesto, type ThemeType, type Manifesto, THEME_NAMES } from '../utils/themeManifesto';

const DEFAULT_THEME: ThemeType = 'sweets';

function readCurrentTheme(): ThemeType {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr && (THEME_NAMES as string[]).includes(attr)) return attr as ThemeType;
  return DEFAULT_THEME;
}

/**
 * Returns the current theme's manifesto. Re-runs on data-theme attribute
 * changes via a MutationObserver so consumers re-render when the theme
 * switches mid-session (lobby ↔ game pages).
 */
export function useTheme(): Manifesto {
  const [theme, setTheme] = useState<ThemeType>(() => readCurrentTheme());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = readCurrentTheme();
      setTheme(prev => (prev === next ? prev : next));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return themeManifesto[theme];
}
