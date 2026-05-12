interface Props { color?: string; size?: number; }

export function Dot({ color = 'currentColor', size = 12 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill={color} />
    </svg>
  );
}
