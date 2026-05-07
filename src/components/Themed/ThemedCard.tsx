import { type ReactNode, type CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { SurfaceVariant } from '../../utils/themeManifesto';

interface ThemedCardProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

// Each surface variant defines the per-theme card chrome — base background,
// border treatment, shadow stack. Theme color tokens come from CSS custom
// properties set in src/index.css (--theme-primary etc.) so the same variant
// adopts the active theme's palette.
const SURFACE_STYLES: Record<SurfaceVariant, CSSProperties> = {
  'pillowy-glass':   { background: 'linear-gradient(180deg, rgba(255,255,255,0.95), var(--theme-card))', borderRadius: '24px', boxShadow: '0 0 0 4px white, 0 0 0 6px var(--theme-primary), 0 6px 0 var(--theme-secondary), 0 12px 24px rgba(0,0,0,0.3)' },
  parchment:         { background: 'linear-gradient(180deg, rgba(254,243,199,0.95), rgba(180,83,9,0.4))', borderRadius: '4px 4px 8px 8px', borderTop: '2px solid var(--theme-accent)', boxShadow: '0 4px 0 rgba(0,0,0,0.3)' },
  holographic:       { background: 'linear-gradient(180deg, rgba(99,102,241,0.2), rgba(30,27,75,0.5))', borderRadius: '6px', border: '1px solid var(--theme-primary)', boxShadow: '0 0 20px var(--theme-primary), inset 0 0 12px rgba(99,102,241,0.3)' },
  'wood-iron':       { background: 'linear-gradient(180deg, rgba(217,119,6,0.7), rgba(69,26,3,0.85))', borderRadius: '0', border: '3px solid var(--theme-primary)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4), 0 4px 0 rgba(0,0,0,0.3)' },
  coral:             { background: 'radial-gradient(ellipse at bottom, rgba(6,182,212,0.4), rgba(8,47,73,0.85))', borderRadius: '50% 50% 8px 8px / 30% 30% 8px 8px', borderTop: '1px solid var(--theme-accent)' },
  'mossy-stone':     { background: 'linear-gradient(135deg, rgba(101,163,13,0.4), rgba(20,83,45,0.85))', borderRadius: '14px 4px 14px 4px', border: '2px solid var(--theme-primary)' },
  'black-marble':    { background: 'radial-gradient(ellipse at center, rgba(31,41,55,0.85), rgba(10,10,10,0.95))', borderRadius: '0 16px 0 16px', borderTop: '1px solid var(--theme-primary)', boxShadow: '0 0 16px rgba(220,38,38,0.4)' },
  'dark-wood-paper': { background: 'linear-gradient(180deg, rgba(31,41,55,0.85), rgba(15,23,42,0.95))', borderRadius: '4px', borderTop: '2px solid var(--theme-primary)', borderBottom: '2px solid var(--theme-primary)' },
};

export function ThemedCard({ children, onClick, disabled = false, className, style, 'data-testid': testId }: ThemedCardProps) {
  const theme = useTheme();
  const surfaceStyle = SURFACE_STYLES[theme.surface];
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };
  const interactive = !!onClick && !disabled;

  return (
    <div
      data-testid={testId}
      data-surface-variant={theme.surface}
      onClick={handleClick}
      className={className}
      style={{ ...surfaceStyle, cursor: interactive ? 'pointer' : 'default', opacity: disabled ? 0.5 : 1, ...style }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}
