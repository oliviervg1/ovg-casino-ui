import { type ReactNode } from 'react';
import { themeManifesto, type ThemeType } from '../../../utils/themeManifesto';

export interface SlotChassisProps {
  theme: ThemeType;
  children: ReactNode;
}

export function SlotChassis({ theme, children }: SlotChassisProps) {
  const m = themeManifesto[theme];
  return (
    <div
      data-testid="slot-chassis"
      data-theme={theme}
      data-surface={m.surface}
      data-border={m.border}
      className="bg-theme-bg/80 p-4 md:p-6 rounded-2xl border-[0.8vh] border-theme-primary shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative w-full max-w-[80vh] mx-auto"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none rounded-xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
