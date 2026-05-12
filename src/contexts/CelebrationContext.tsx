import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface PendingTick {
  delta: number;
  durationMs: number;
}

export interface Celebration {
  pendingTick: PendingTick | null;
  setPendingTick: (t: PendingTick) => void;
  clearPendingTick: () => void;
}

const CelebrationContext = createContext<Celebration | null>(null);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [pendingTick, setPendingTickState] = useState<PendingTick | null>(null);

  const setPendingTick = useCallback((t: PendingTick) => setPendingTickState(t), []);
  const clearPendingTick = useCallback(() => setPendingTickState(null), []);

  const value = useMemo<Celebration>(
    () => ({ pendingTick, setPendingTick, clearPendingTick }),
    [pendingTick, setPendingTick, clearPendingTick],
  );

  return <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>;
}

export function useCelebration(): Celebration {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within a CelebrationProvider');
  return ctx;
}
