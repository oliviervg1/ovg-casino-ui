interface Props { color?: string; size?: number; }

export function Sparkle({ color = 'currentColor', size = 12 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill={color} />
    </svg>
  );
}
