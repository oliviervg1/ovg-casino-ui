interface Props { color?: string; size?: number; }

export function Arc({ color = 'currentColor', size = 12 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 8 A 5 5 0 0 1 11 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
