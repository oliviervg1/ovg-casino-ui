import { Sparkles } from 'lucide-react';

interface GameStatusLineProps {
  isLoading: boolean;
  /** Optional sub-detail (e.g. "symbols 3 / 4") shown after the attribution. */
  detail?: string;
}

export function GameStatusLine({ isLoading, detail }: GameStatusLineProps) {
  if (!isLoading) return null;
  return (
    <div
      data-testid="game-status-line"
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/10 text-xs text-white/80"
    >
      <Sparkles className="w-3.5 h-3.5 animate-pulse opacity-80" />
      <span>
        Gemini 3.1 generating · Lyria 3 composing soundtrack
        {detail ? ` · ${detail}` : ''}
      </span>
    </div>
  );
}
