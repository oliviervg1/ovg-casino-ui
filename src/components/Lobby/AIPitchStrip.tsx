interface AIPitchStripProps {
  onRegenerate: () => void;
  isRegenerating: boolean;
  status: string | null;
}

export function AIPitchStrip({ onRegenerate, isRegenerating, status }: AIPitchStripProps) {
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
        <p className="text-xs opacity-70 mt-1 m-0">
          {isRegenerating && status
            ? `Re-rolling worlds · ${status} · Lyria 3 composing soundtracks…`
            : 'Powered by Gemini 3.1 (art) + Lyria 3 (music) — generated on demand, fully customisable.'}
        </p>
      </div>
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="px-4 py-2 rounded-md font-bold text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          color: '#1a1f2e',
        }}
      >
        ♻ Regenerate everything
      </button>
    </div>
  );
}
