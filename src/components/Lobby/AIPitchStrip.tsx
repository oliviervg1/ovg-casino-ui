import { RefreshCw } from 'lucide-react';
import type { BatchRegenerateError } from '../../hooks/useBatchRegenerate';

interface AIPitchStripProps {
  onRegenerate: () => void;
  isRegenerating: boolean;
  status: string | null;
  /** Optional. When non-null, replaces the subline with a coloured error message. */
  error?: BatchRegenerateError;
}

const ERROR_MESSAGES: Record<Exclude<BatchRegenerateError, null>, string> = {
  quota: 'Daily regenerate quota exceeded — try again tomorrow.',
  'rate-limit': 'Rate limit hit — wait a minute and retry.',
  partial: 'Some assets failed to regenerate — try again later.',
};

export function AIPitchStrip({ onRegenerate, isRegenerating, status, error }: AIPitchStripProps) {
  // Subline-content priority: error > live regen status > post-regen status > idle pitch.
  // The previous implementation only showed status while `isRegenerating && status` were
  // BOTH truthy, which meant the UI was silent for the first 5-30s after a click (status
  // is null until the first Gemini call returns) AND silent after completion (status set
  // but isRegenerating false). End users perceived "nothing happens".
  let subline: string;
  let sublineClass: string;
  if (error) {
    subline = ERROR_MESSAGES[error];
    sublineClass = 'text-xs text-red-300 mt-1 m-0';
  } else if (isRegenerating) {
    subline = `Re-rolling worlds · ${status ?? 'starting…'} · Lyria 3 composing soundtracks…`;
    sublineClass = 'text-xs opacity-90 mt-1 m-0';
  } else if (status) {
    subline = `${status} · Powered by Gemini 3.1 + Lyria 3.`;
    sublineClass = 'text-xs opacity-80 mt-1 m-0';
  } else {
    subline = 'Powered by Gemini 3.1 (art) + Lyria 3 (music) — generated on demand, fully customisable.';
    sublineClass = 'text-xs opacity-70 mt-1 m-0';
  }

  return (
    <div
      className="flex justify-between items-center px-6 py-4 mb-6 rounded-md"
      style={{
        background: 'rgba(251, 191, 36, 0.08)',
        borderLeft: '3px solid var(--theme-accent, #fbbf24)',
      }}
    >
      <div>
        <h2 className="text-lg font-bold m-0">Eight AI-generated casino worlds</h2>
        <p className={sublineClass}>{subline}</p>
      </div>
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          color: '#1a1f2e',
        }}
      >
        <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        {isRegenerating ? 'Regenerating…' : 'Regenerate everything'}
      </button>
    </div>
  );
}
