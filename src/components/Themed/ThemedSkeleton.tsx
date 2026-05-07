import { useTheme } from '../../hooks/useTheme';
import { useMotion } from '../../hooks/useMotion';
import { themeManifesto, type SkeletonVariant, type ThemeType } from '../../utils/themeManifesto';

interface ThemedSkeletonProps {
  /** CSS aspect-ratio string (e.g. '3/4', '16/9'). */
  aspectRatio?: string;
  /** Optional fixed width — falls back to 100% of parent. */
  width?: string;
  /**
   * Override the document-level theme. When provided, the skeleton uses this
   * theme's manifesto instead of reading <html data-theme>. Useful when many
   * skeletons render on a single page under different themes (e.g. the lobby
   * grid). When omitted, uses useTheme().
   */
  theme?: ThemeType;
  className?: string;
  'data-testid'?: string;
}

// Variant → animated background. Each variant is a different shimmer/pattern
// that hints at the per-theme loading style. Concrete art (e.g. an actual
// candy unwrap animation) can replace these later; this baseline gives each
// theme a distinct look during loading.
const VARIANT_STYLES: Record<SkeletonVariant, React.CSSProperties> = {
  unwrap:           { background: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(236,72,153,0.5) 50%, rgba(236,72,153,0.2) 100%)', borderRadius: '24px' },
  'hieroglyph-fade':{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.4) 50%, rgba(251,191,36,0.15) 100%)', borderRadius: '4px' },
  'hyperspace-streak':{ background: 'linear-gradient(90deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.5) 50%, rgba(99,102,241,0.1) 100%)', borderRadius: '6px', boxShadow: '0 0 16px rgba(99,102,241,0.4)' },
  'wagon-wheel':    { background: 'linear-gradient(135deg, rgba(217,119,6,0.18) 0%, rgba(217,119,6,0.45) 50%, rgba(217,119,6,0.18) 100%)', borderRadius: '0' },
  'sonar-ripple':   { background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.1) 70%)', borderRadius: '24px 24px 6px 6px' },
  'vine-grow':      { background: 'linear-gradient(135deg, rgba(132,204,22,0.18) 0%, rgba(132,204,22,0.45) 50%, rgba(132,204,22,0.18) 100%)', borderRadius: '14px 4px 14px 4px' },
  'candle-flicker': { background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.4) 0%, rgba(31,41,55,0.6) 70%)', borderRadius: '0 16px 0 16px' },
  'ink-bleed':      { background: 'linear-gradient(135deg, rgba(71,85,105,0.2) 0%, rgba(251,191,36,0.3) 50%, rgba(71,85,105,0.2) 100%)', borderRadius: '4px' },
};

export function ThemedSkeleton({ aspectRatio, width = '100%', theme: themeOverride, className, 'data-testid': testId }: ThemedSkeletonProps) {
  // Read the document-level theme (always — keeps the hook called unconditionally
  // per rules of hooks). If an override is provided, use the manifesto entry for
  // that theme instead.
  const docTheme = useTheme();
  const theme = themeOverride ? themeManifesto[themeOverride] : docTheme;
  const motion = useMotion();
  const baseStyle = VARIANT_STYLES[theme.skeleton];
  const animationStyle: React.CSSProperties = motion.shouldAnimate
    ? { backgroundSize: '200% 100%', animation: `themed-skeleton-shimmer 1.5s linear infinite` }
    : {};
  const style: React.CSSProperties = {
    ...baseStyle,
    ...animationStyle,
    width,
    aspectRatio: aspectRatio ?? 'auto',
  };

  return (
    <>
      <style>{`@keyframes themed-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
      <div
        data-testid={testId}
        data-skeleton-variant={theme.skeleton}
        className={className}
        style={style}
      />
    </>
  );
}
