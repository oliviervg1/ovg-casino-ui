import { Sparkles } from 'lucide-react';

interface GameStatusLineProps {
  isLoading: boolean;
}

export function GameStatusLine({ isLoading }: GameStatusLineProps) {
  if (!isLoading) return null;
  return (
    <div
      data-testid="game-status-line"
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/10 text-xs text-white/80"
    >
      <Sparkles className="w-3.5 h-3.5 animate-pulse opacity-80" />
      <span>Gemini 3.1 generating · Lyria 3 composing soundtrack</span>
    </div>
  );
}
