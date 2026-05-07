import { type ReactNode, type CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { ButtonVariant } from '../../utils/themeManifesto';

interface ThemedButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Default = 'standard'; 'hero' = larger primary action button used in game pages. */
  size?: 'standard' | 'hero';
  className?: string;
  type?: 'button' | 'submit';
}

// Each variant carries a per-theme button chrome. Heights/padding scale with
// the size prop. Color tokens read from --theme-* CSS custom properties so
// the same variant adopts the active theme's palette.
function variantStyle(variant: ButtonVariant, size: 'standard' | 'hero'): CSSProperties {
  const padding = size === 'hero' ? '14px 36px' : '10px 22px';
  const fontSize = size === 'hero' ? '22px' : '16px';
  const base: CSSProperties = { padding, fontSize, border: 'none', cursor: 'pointer', color: 'white' };
  switch (variant) {
    case 'gummy-3d':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-accent), var(--theme-primary) 30%, var(--theme-secondary))', borderRadius: '999px', boxShadow: '0 6px 0 var(--theme-secondary), inset 0 2px 0 rgba(255,255,255,0.4)' };
    case 'scarab-cartouche':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-primary), var(--theme-secondary))', color: 'var(--theme-accent)', border: '2px solid var(--theme-accent)', borderBottomWidth: '4px', clipPath: 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%)', letterSpacing: '0.08em' };
    case 'neon-rim':
      return { ...base, background: 'linear-gradient(180deg, rgba(99,102,241,0.2), rgba(30,27,75,0.4))', color: 'var(--theme-accent)', border: '1px solid var(--theme-primary)', borderRadius: '4px', boxShadow: '0 0 16px var(--theme-primary), inset 0 0 12px rgba(99,102,241,0.2)', letterSpacing: '0.15em' };
    case 'branded-leather':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-primary), var(--theme-secondary))', color: 'var(--theme-accent)', border: '2px solid var(--theme-accent)', borderRadius: '2px', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4), 0 4px 0 rgba(0,0,0,0.3)' };
    case 'bubble':
      return { ...base, background: 'radial-gradient(ellipse at top, var(--theme-accent), var(--theme-primary) 60%)', color: 'var(--theme-text)', borderRadius: '999px', boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.2), 0 2px 8px rgba(6,182,212,0.4)' };
    case 'vine-wrap':
      return { ...base, background: 'linear-gradient(135deg, var(--theme-secondary), var(--theme-primary))', color: 'var(--theme-accent)', border: '2px solid var(--theme-primary)', borderRadius: '14px 4px 14px 4px' };
    case 'velvet-pill':
      return { ...base, background: 'linear-gradient(180deg, var(--theme-primary), var(--theme-secondary))', color: 'white', borderRadius: '999px', boxShadow: '0 0 12px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' };
    case 'seal-stamp':
      return { ...base, background: 'linear-gradient(180deg, rgba(31,41,55,0.95), rgba(15,23,42,0.95))', color: 'var(--theme-primary)', border: '1px solid var(--theme-primary)', borderRadius: '4px', boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.5)' };
  }
}

export function ThemedButton({ children, onClick, disabled = false, size = 'standard', className, type = 'button' }: ThemedButtonProps) {
  const theme = useTheme();
  const style = variantStyle(theme.button, size);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-button-variant={theme.button}
      data-size={size}
      className={`${theme.font} ${className ?? ''}`}
      style={{ ...style, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {children}
    </button>
  );
}
