# Celebration Cleanup Implementation Plan (post-Plan-6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse Plan 6's duplicated win-message visual sources into a single prominent themed celebration card per win, scaled to the tier (small / jackpot), and fix five concrete bugs (BetTable label clipping, BINGO! sweep overflow, egypt theme font on body text, slots winning border too prominent, audio mute desync — last one already committed).

**Architecture:** Extract a `ThemedCelebrationCard` shared base that owns the celebration content + dismiss timer + click semantics. `JackpotOverlay` (refactored) and the new `SmallWinCard` (replacing `SmallWinBanner`) become thin wrappers that pass tier-specific positioning. `GameShell`'s `<p>` message line becomes `sr-only` always (a11y preserved, visual duplication eliminated). `ResultStrip` drops its message text — pocket badge alone communicates the result. `BingoCard` gets `overflow-hidden` to clip the BINGO! sweep.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + React Testing Library, Framer Motion, Tailwind. No `@testing-library/jest-dom` — use vitest-native matchers (`.toBeTruthy()`, `.getAttribute().toBe()`, `.textContent.toContain()`).

---

## Conventions

- All Themed components consume tokens from `themeManifesto[theme]` and copy from `themeCopy[theme]`.
- Tests use vitest-native matchers (no jest-dom).
- Render any GameShell or `<ThemedCelebration>`-consuming component inside `<CelebrationProvider>` (Plan 6 wired this; tests must wrap).
- Every task ends with a commit. Commit messages follow `fix(scope): subject` / `feat(scope): subject` / `refactor(scope): subject`.
- Co-author trailer on every commit: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

---

## Pre-flight check (run once before Task 1)

- [ ] **Step 1: Verify clean baseline**

```bash
git -C /home/admin_/ovg-casino-ui status        # clean working tree (screenshots/ untracked is fine)
git -C /home/admin_/ovg-casino-ui branch --show-current   # main
git -C /home/admin_/ovg-casino-ui log --oneline origin/main..HEAD
```

Expected: branch `main`; 2 commits ahead of `origin/main`:
- `78253b2 docs(celebration): cleanup spec — collapse duplicated win messages, scale-up SmallWin`
- `a84be55 fix(audio): propagate AudioControlsContext mute to SoundEngine`

- [ ] **Step 2: Confirm baseline green**

```bash
npm run lint && npm test 2>&1 | tail -15
```

Expected: lint exit 0; **427/427 tests across 70 files**.

If counts don't match, something landed since the spec was committed — investigate before continuing.

---

## Task 1: `ThemedCelebrationCard` (shared base)

**Goal:** Extract a single component that owns all celebration content + the dismiss timer + the click-to-dismiss-on-backdrop semantics. Tier-driven scale parameters (duration, particle count, label size, label text). Both `JackpotOverlay` and the new `SmallWinCard` will delegate to this.

**Files:**
- Create: `src/components/Themed/ThemedCelebrationCard.tsx`
- Create: `src/components/Themed/ThemedCelebrationCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Themed/ThemedCelebrationCard.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { ThemedCelebrationCard } from './ThemedCelebrationCard';

afterEach(() => cleanup());

function renderCard(props: Partial<React.ComponentProps<typeof ThemedCelebrationCard>> = {}) {
  const onDismiss = vi.fn();
  const utils = render(
    <CelebrationProvider>
      <ThemedCelebrationCard
        tier="small"
        amount={20}
        theme="sweets"
        containerClass="bg-test"
        onDismiss={onDismiss}
        {...props}
      />
    </CelebrationProvider>
  );
  return { ...utils, onDismiss };
}

describe('ThemedCelebrationCard', () => {
  it('renders the small-tier themed copy from themeCopy[theme].small', () => {
    renderCard({ tier: 'small', theme: 'sweets' });
    expect(screen.getByTestId('celebration-card-small').textContent).toContain('Sweet match!');
  });

  it('renders the jackpot-tier themed label from themeCopy[theme].jackpotLabel', () => {
    renderCard({ tier: 'jackpot', theme: 'egypt', amount: 1000 });
    expect(screen.getByTestId('celebration-card-jackpot').textContent).toContain("PHARAOH'S BOUNTY!");
  });

  it('auto-dismisses after the small-tier duration (2500 ms)', () => {
    vi.useFakeTimers();
    try {
      const { onDismiss } = renderCard({ tier: 'small' });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(2499); });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1); });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-dismisses after the jackpot-tier duration (5000 ms)', () => {
    vi.useFakeTimers();
    try {
      const { onDismiss } = renderCard({ tier: 'jackpot' });
      act(() => { vi.advanceTimersByTime(4999); });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1); });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismisses immediately on click of the outer container (the backdrop)', () => {
    const { onDismiss } = renderCard({ tier: 'small' });
    const backdrop = screen.getByTestId('celebration-card-small');
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does NOT dismiss when an inner content element is clicked (e.target !== currentTarget)', () => {
    const { onDismiss } = renderCard({ tier: 'small' });
    const innerContent = screen.getByTestId('celebration-card-content');
    fireEvent.click(innerContent);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/Themed/ThemedCelebrationCard.test.tsx 2>&1 | tail -20
```

Expected: all 6 tests FAIL with "Cannot find module './ThemedCelebrationCard'" (file doesn't exist yet).

- [ ] **Step 3: Implement the component**

Create `src/components/Themed/ThemedCelebrationCard.tsx`:

```tsx
import { useEffect } from 'react';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';
import { themeParticles } from '../../utils/themeParticles';
import { ParticleField } from './ParticleField';
import { WinAmountCounter } from './WinAmountCounter';

export type CelebrationTier = 'small' | 'jackpot';

export interface ThemedCelebrationCardProps {
  tier: CelebrationTier;
  amount: number;
  theme: ThemeType;
  /** Tailwind classes for the outer container — caller picks fixed-viewport vs surface-anchored. */
  containerClass: string;
  onDismiss: () => void;
}

interface TierConfig {
  durationMs: number;
  particleCount: number;
  labelSize: string;       // tailwind text-[Xvh] class
  cardClass: string;       // wrapper around the inner content
  label: (theme: ThemeType) => string;
}

const TIER_CONFIG: Record<CelebrationTier, TierConfig> = {
  small: {
    durationMs: 2500,
    particleCount: 15,
    labelSize: 'text-[5vh]',
    cardClass: 'w-[60vh] max-w-[80%] aspect-[3/2] bg-theme-card/95 rounded-3xl shadow-2xl border-[0.4vh] border-theme-accent flex flex-col items-center justify-center gap-[2vh] p-[3vh] relative overflow-hidden',
    label: (theme) => themeCopy[theme].small,
  },
  jackpot: {
    durationMs: 5000,
    particleCount: 50,
    labelSize: 'text-[8vh] md:text-[10vh]',
    cardClass: 'flex flex-col items-center justify-center gap-[3vh] relative',
    label: (theme) => themeCopy[theme].jackpotLabel,
  },
};

export function ThemedCelebrationCard({
  tier, amount, theme, containerClass, onDismiss,
}: ThemedCelebrationCardProps) {
  const config = TIER_CONFIG[tier];

  useEffect(() => {
    const id = setTimeout(onDismiss, config.durationMs);
    return () => clearTimeout(id);
  }, [config.durationMs, onDismiss]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  return (
    <div
      data-testid={`celebration-card-${tier}`}
      onClick={handleClick}
      className={containerClass}
      aria-hidden="true"
    >
      <ParticleField
        theme={theme}
        count={config.particleCount}
        pool={themeParticles[theme]}
      />
      <div data-testid="celebration-card-content" className={config.cardClass}>
        <div className={`${config.labelSize} ${themeManifesto[theme].font} text-theme-accent text-center font-black tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]`}>
          {config.label(theme)}
        </div>
        <WinAmountCounter amount={amount} tier={tier} theme={theme} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/Themed/ThemedCelebrationCard.test.tsx 2>&1 | tail -15
```

Expected: 6/6 PASS. If `ParticleField`'s prop signature differs (Plan 6 may have used different prop names), adjust the call accordingly. If a test fails, fix the implementation, not the test.

- [ ] **Step 5: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Themed/ThemedCelebrationCard.tsx src/components/Themed/ThemedCelebrationCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(celebration): ThemedCelebrationCard — shared base for small + jackpot

Owns the celebration content (themed label + WinAmountCounter +
ParticleField) and the cross-cutting concerns (auto-dismiss timer,
backdrop-click-to-dismiss-content-click-to-stay). Tier-driven scale
parameters (duration, particle count, label size, label text). Caller
provides containerClass — small wrapper uses surface-anchored
absolute, jackpot wrapper uses viewport-fixed. Wrappers added in the
next two tasks; this task ships the base + 6 unit tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Refactor `JackpotOverlay` to delegate to `ThemedCelebrationCard`

**Goal:** Strip JackpotOverlay's content rendering — it becomes a thin wrapper passing the viewport-fixed container class. Existing visible behaviour preserved (full-screen takeover, theme-accent radial gradient, 5s dismiss, click-backdrop-to-dismiss). Plan 6's existing JackpotOverlay tests should keep passing with minimal updates.

**Files:**
- Modify: `src/components/Themed/JackpotOverlay.tsx`
- Modify: `src/components/Themed/JackpotOverlay.test.tsx` (if `data-testid` selectors need updating)

- [ ] **Step 1: Read current JackpotOverlay tests to understand what they assert**

```bash
cat src/components/Themed/JackpotOverlay.test.tsx
```

Note which selectors the tests use (e.g. `data-testid="jackpot-backdrop"`) — those stay queryable after the refactor by adding compatibility test-ids.

- [ ] **Step 2: Replace JackpotOverlay with the wrapper**

Open `src/components/Themed/JackpotOverlay.tsx`, replace its full contents with:

```tsx
import type { ThemeType } from '../../utils/themeManifesto';
import { ThemedCelebrationCard } from './ThemedCelebrationCard';

export interface JackpotOverlayProps {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function JackpotOverlay({ amount, theme, onDismiss }: JackpotOverlayProps) {
  return (
    <div
      data-testid="jackpot-backdrop"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, var(--theme-accent) 0%, transparent 60%)`,
          opacity: 0.4,
        }}
      />
      <ThemedCelebrationCard
        tier="jackpot"
        amount={amount}
        theme={theme}
        containerClass="relative z-10 pointer-events-none"
        onDismiss={onDismiss}
      />
    </div>
  );
}
```

Notes for the implementer:
- The outer `data-testid="jackpot-backdrop"` is the backdrop (existing test selector preserved).
- The radial gradient is rendered as a sibling overlay div behind the card (so the backdrop's bg-black/70 doesn't fight it).
- Two click handlers fire on dismiss now: the outer backdrop's, and the card's own backdrop-click logic. Both call onDismiss; idempotent — the parent (`ThemedCelebration`) sets `dismissed=true` on first call.

- [ ] **Step 3: Run JackpotOverlay's existing tests**

```bash
npx vitest run src/components/Themed/JackpotOverlay.test.tsx 2>&1 | tail -20
```

Expected: 4/4 PASS. If a test fails because:
- It asserted on a specific child element (e.g., `data-testid="jackpot-particles"` from Plan 6) — switch to `screen.getByTestId('celebration-card-jackpot')` since particles + label now live inside the base.
- It asserted on the literal `'JACKPOT!'` text — that's now the per-theme `themeCopy[theme].jackpotLabel`. Adjust the assertion to use the test's theme prop, e.g. `expect(...).toContain(themeCopy[theme].jackpotLabel)`.

Fix the test assertions to match the new structure (the base renders the same SEMANTIC content under different testids).

- [ ] **Step 4: Run the full client suite to confirm no other consumer of JackpotOverlay broke**

```bash
npx vitest run --project client 2>&1 | tail -10
```

Expected: all client tests pass. The only callers of `JackpotOverlay` are `ThemedCelebration.tsx` and possibly `ThemedCelebration.test.tsx`. If `ThemedCelebration.test.tsx` fails with the same selector issue, fix similarly.

- [ ] **Step 5: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Themed/JackpotOverlay.tsx src/components/Themed/JackpotOverlay.test.tsx src/components/Themed/ThemedCelebration.test.tsx 2>/dev/null
git commit -m "$(cat <<'EOF'
refactor(celebration): JackpotOverlay delegates to ThemedCelebrationCard

JackpotOverlay shrinks to a positioning wrapper: it owns the viewport-
fixed backdrop + the radial-gradient overlay, then renders
<ThemedCelebrationCard tier="jackpot"> inside. Visible behaviour
unchanged — same theme-accent gradient, same 50 particles, same
themed label, same 5s auto-dismiss, same backdrop-click semantics.
Test selectors updated where they reached into the old internal
structure; semantic assertions (theme label text, dismiss callback)
unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `SmallWinCard` (replaces `SmallWinBanner`)

**Goal:** Surface-anchored mid-card with backdrop-blur. Mirrors JackpotOverlay's wrapper shape but constrained to the game surface (not full viewport).

**Files:**
- Create: `src/components/Themed/SmallWinCard.tsx`
- Create: `src/components/Themed/SmallWinCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Themed/SmallWinCard.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { SmallWinCard } from './SmallWinCard';

afterEach(() => cleanup());

describe('SmallWinCard', () => {
  it('renders inside a surface-anchored absolute container with backdrop-blur', () => {
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    const backdrop = screen.getByTestId('small-win-backdrop');
    const cls = backdrop.className;
    expect(cls).toContain('absolute');
    expect(cls).toContain('inset-0');
    expect(cls).toContain('backdrop-blur');
  });

  it('renders the themed small-win copy from themeCopy[theme].small', () => {
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={vi.fn()} />
      </CelebrationProvider>
    );
    expect(screen.getByTestId('small-win-backdrop').textContent).toContain('Sweet match!');
  });

  it('dismisses when the backdrop is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <CelebrationProvider>
        <SmallWinCard amount={20} theme="sweets" onDismiss={onDismiss} />
      </CelebrationProvider>
    );
    fireEvent.click(screen.getByTestId('small-win-backdrop'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/Themed/SmallWinCard.test.tsx 2>&1 | tail -10
```

Expected: 3/3 FAIL with "Cannot find module './SmallWinCard'".

- [ ] **Step 3: Implement the component**

Create `src/components/Themed/SmallWinCard.tsx`:

```tsx
import type { ThemeType } from '../../utils/themeManifesto';
import { ThemedCelebrationCard } from './ThemedCelebrationCard';

export interface SmallWinCardProps {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function SmallWinCard({ amount, theme, onDismiss }: SmallWinCardProps) {
  return (
    <div
      data-testid="small-win-backdrop"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-md pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <ThemedCelebrationCard
        tier="small"
        amount={amount}
        theme={theme}
        containerClass="relative pointer-events-none"
        onDismiss={onDismiss}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/Themed/SmallWinCard.test.tsx 2>&1 | tail -15
```

Expected: 3/3 PASS.

- [ ] **Step 5: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Themed/SmallWinCard.tsx src/components/Themed/SmallWinCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(celebration): SmallWinCard — surface-anchored jackpot-lite

Replaces the bottom-fixed pill with a surface-anchored mid-card.
Wrapper is absolute inset-0 inside the GameShell surface div, with a
backdrop-blur layer on the game content behind it (the AppHeader stays
sharp so BalancePill tick remains visible). Delegates content to
<ThemedCelebrationCard tier="small">. Dismissable on backdrop click;
auto-dismisses after 2.5s via the base. ThemedCelebration switches
from SmallWinBanner to SmallWinCard in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `ThemedCelebration` switches from `SmallWinBanner` → `SmallWinCard`

**Goal:** Update the orchestrator so the small-win branch renders `SmallWinCard` instead of the legacy `SmallWinBanner`. The surfaceRef is already passed in (Plan 6) — no signature change.

**Files:**
- Modify: `src/components/Themed/ThemedCelebration.tsx`
- Modify: `src/components/Themed/ThemedCelebration.test.tsx`

- [ ] **Step 1: Update the import + the small-tier branch**

Open `src/components/Themed/ThemedCelebration.tsx`. Find the `import { SmallWinBanner } from './SmallWinBanner';` line and replace with:

```tsx
import { SmallWinCard } from './SmallWinCard';
```

In the render branches, find:

```tsx
if (tier === 'small' && amount !== null) {
  return <SmallWinBanner amount={amount} theme={theme} onDismiss={onDismiss} />;
}
```

Replace with:

```tsx
if (tier === 'small' && amount !== null) {
  return <SmallWinCard amount={amount} theme={theme} onDismiss={onDismiss} />;
}
```

Note: the `surfaceRef` prop on `ThemedCelebration` is no longer needed for `SmallWinCard` (it positions absolutely inside its parent surface div, doesn't need an imperative ref). Keep the prop on `ThemedCelebration` because `LossPlate` still uses it for the wiggle. Don't change the orchestrator's prop signature.

- [ ] **Step 2: Update ThemedCelebration tests**

Open `src/components/Themed/ThemedCelebration.test.tsx`. Find any test that asserts on `SmallWinBanner` (via test-id `small-win-wrapper` from Plan 6, or by importing the component). Replace those assertions with the new component's selectors:
- `data-testid="small-win-wrapper"` → `data-testid="small-win-backdrop"`
- Any direct `import { SmallWinBanner }` → remove (test against the rendered output instead).

- [ ] **Step 3: Run the tests**

```bash
npx vitest run src/components/Themed/ThemedCelebration.test.tsx 2>&1 | tail -15
```

Expected: all tests PASS. If a test fails because it asserted on the old fixed-bottom positioning class, switch to asserting on the new `absolute inset-0` class — the SEMANTIC test (renders for tier='small', dismisses) is what matters.

- [ ] **Step 4: Run the full client suite to catch downstream consumers**

```bash
npx vitest run --project client 2>&1 | tail -10
```

Expected: all pass. If GameShell.test.tsx or any Slots/Roulette/Bingo integration test fails, it's likely the same kind of selector update.

- [ ] **Step 5: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Themed/ThemedCelebration.tsx src/components/Themed/ThemedCelebration.test.tsx
git commit -m "$(cat <<'EOF'
refactor(celebration): ThemedCelebration uses SmallWinCard for tier='small'

Single-line behavioural change in the orchestrator: small-tier wins
now render the new surface-anchored SmallWinCard instead of the
bottom-fixed SmallWinBanner. SmallWinBanner is now unreferenced; it
gets deleted in the next task. ThemedCelebration's prop signature is
unchanged (surfaceRef still flows through to LossPlate's wiggle).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Delete `SmallWinBanner`

**Goal:** Remove the dead component + its test file. Verify no remaining importers.

**Files:**
- Delete: `src/components/Themed/SmallWinBanner.tsx`
- Delete: `src/components/Themed/SmallWinBanner.test.tsx`

- [ ] **Step 1: Verify no remaining importers**

```bash
grep -rn "SmallWinBanner" src --include="*.ts" --include="*.tsx" 2>&1 | grep -v "SmallWinBanner.tsx\|SmallWinBanner.test.tsx"
```

Expected: NO matches (the only references should be the files we're about to delete).

If any match exists, stop and update that file first.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/Themed/SmallWinBanner.tsx src/components/Themed/SmallWinBanner.test.tsx
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass. Test count should be: 427 (baseline) + 6 (Task 1) + 3 (Task 3) − 3 (deleted SmallWinBanner tests) = **433** across 71 files (added: ThemedCelebrationCard, SmallWinCard; deleted: SmallWinBanner).

- [ ] **Step 4: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(celebration): delete SmallWinBanner — superseded by SmallWinCard

SmallWinBanner has no remaining importers after Task 4. Removing the
file + its test keeps the Themed/ directory honest. Net delta from
this task: -2 files, -3 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: GameShell `<p>` message line → `sr-only`

**Goal:** Hide the visible duplicate of the win/loss message text (the small `<p>` under the PLAY button). Keep the screen-reader announcement intact (Tailwind's `sr-only` visually hides but leaves it in the accessibility tree).

**Files:**
- Modify: `src/components/Games/GameShell.tsx`
- Modify: `src/components/Games/GameShell.test.tsx`

- [ ] **Step 1: Add a failing test asserting the message line is sr-only**

Open `src/components/Games/GameShell.test.tsx`. In the existing `GameShell celebration integration` describe block, add a new test:

```tsx
it("the message line is visually hidden via sr-only (screen reader only)", () => {
  render(
    <CelebrationProvider>
      <GameShell {...baseProps} message="Won 20!" win="small" lastPayout={20} />
    </CelebrationProvider>
  );
  const msgEl = screen.getByText('Won 20!');
  expect(msgEl.className).toContain('sr-only');
});
```

(The `baseProps` factory + `<CelebrationProvider>` wrap pattern is already used by other tests in this file — copy from a sibling test. If `baseProps` doesn't exist as a helper, inline the props object as the other tests do.)

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/Games/GameShell.test.tsx -t "sr-only" 2>&1 | tail -10
```

Expected: FAIL with `expected '...text-center text-sm opacity-90' to contain 'sr-only'`.

- [ ] **Step 3: Update GameShell**

Open `src/components/Games/GameShell.tsx`. Find the message line (around line 97):

```tsx
{props.message && <p aria-live="polite" role="status" className="text-center text-sm opacity-90">{props.message}</p>}
```

Replace with:

```tsx
{props.message && <p aria-live="polite" role="status" className="sr-only">{props.message}</p>}
```

That's the entire change. The `aria-live` + `role="status"` stay (preserves the announcement); the visible classes are replaced with `sr-only`.

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/Games/GameShell.test.tsx -t "sr-only" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Run the full GameShell test file to confirm no regressions**

```bash
npx vitest run src/components/Games/GameShell.test.tsx 2>&1 | tail -15
```

Expected: all tests pass (existing tests don't assert on the old visible classes).

- [ ] **Step 6: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/Games/GameShell.tsx src/components/Games/GameShell.test.tsx
git commit -m "$(cat <<'EOF'
fix(gameshell): message <p> visually hidden via sr-only

The result message under the PLAY button visually duplicated the
celebration card / LossPlate copy. Replaced its visible classes with
sr-only — screen-reader announcement preserved (aria-live="polite",
role="status" stay), visual duplication eliminated. The themed
celebration card (and LossPlate on loss) is now the single visible
source of "you won/lost X" copy on the surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `ResultStrip` — drop `message` prop

**Goal:** Roulette's pocket-result strip becomes a pure pocket-badge indicator. The win-amount text moves entirely to the celebration card. Removes the second source of "Won 20!" duplication on roulette wins.

**Files:**
- Modify: `src/components/Games/Roulette/ResultStrip.tsx`
- Modify: `src/components/Games/Roulette/ResultStrip.test.tsx`

- [ ] **Step 1: Update the failing tests**

Open `src/components/Games/Roulette/ResultStrip.test.tsx`. Find any test asserting on the `message` text (e.g., `expect(...).toContain('Won 20!')`). Either delete that test or repurpose it to assert that ResultStrip does NOT render any text other than the pocket number.

Add a new test:

```tsx
it('renders pocket badge only — no message text', () => {
  render(<ResultStrip resultNum={23} resultColour="red" />);
  expect(screen.getByTestId('result-pocket-badge').textContent).toBe('23');
  // The strip should have NO additional message span. textContent of the strip
  // should equal the pocket number alone.
  expect(screen.getByTestId('result-strip').textContent).toBe('23');
});
```

Remove the `message` argument from any other render calls in the file (TypeScript will error in Step 2 otherwise).

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/Games/Roulette/ResultStrip.test.tsx 2>&1 | tail -15
```

Expected: the new "renders pocket badge only" test FAILS (textContent contains both '23' AND the message). And there will be TS errors elsewhere because the component still expects `message`.

- [ ] **Step 3: Drop the message prop from the component**

Open `src/components/Games/Roulette/ResultStrip.tsx`. Replace its full contents with:

```tsx
import { motion } from 'motion/react';
import { type RouletteColour } from '../gameLogic';

export interface ResultStripProps {
  resultNum: number | null;
  resultColour: RouletteColour | null;
}

const BADGE_BG: Record<RouletteColour, string> = {
  red: 'bg-red-600',
  black: 'bg-black',
  green: 'bg-green-600',
};

export function ResultStrip({ resultNum, resultColour }: ResultStripProps) {
  if (resultNum === null || resultColour === null) return null;
  return (
    <motion.div
      data-testid="result-strip"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center gap-3 md:gap-4 px-4 py-2 md:py-3 rounded-xl bg-theme-bg/70 backdrop-blur-sm border-[0.3vh] border-theme-accent/40 shadow-md"
    >
      <div
        data-testid="result-pocket-badge"
        data-colour={resultColour}
        className={`w-[5vh] h-[5vh] rounded-full ${BADGE_BG[resultColour]} flex items-center justify-center text-white text-[2.5vh] font-bold border-[0.3vh] border-white shadow-md`}
      >
        {resultNum}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/Games/Roulette/ResultStrip.test.tsx 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 5: Lint (will fail — RouletteSurface still passes `message`)**

```bash
npm run lint 2>&1 | tail -10
```

Expected: TS error in `RouletteSurface.tsx` saying `message` is not a known prop on `ResultStripProps`. That's fine — fix in the next task.

- [ ] **Step 6: Skip commit (Task 8 fixes the call site, then commit together)**

Hold off on committing until Task 8 lands so the working tree never has a TS error in a committed state.

---

## Task 8: `RouletteSurface` — stop passing `message` to `ResultStrip`

**Goal:** Fix the broken `<ResultStrip>` call site so the build is clean again. Commits Tasks 7 + 8 together.

**Files:**
- Modify: `src/components/Games/Roulette/RouletteSurface.tsx`

- [ ] **Step 1: Find and fix the call site**

```bash
grep -n "ResultStrip" src/components/Games/Roulette/RouletteSurface.tsx
```

Expected: a `<ResultStrip ... message={...} />` JSX usage. Open the file and remove the `message={...}` prop from that JSX element. The other props (`resultNum`, `resultColour`) stay.

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 3: Run the full client suite**

```bash
npx vitest run --project client 2>&1 | tail -10
```

Expected: all pass. If `RouletteSurface.test.tsx` had assertions on the message text inside ResultStrip, those need updating (drop the assertion or move it elsewhere).

- [ ] **Step 4: Commit Tasks 7 + 8 together**

```bash
git add src/components/Games/Roulette/ResultStrip.tsx src/components/Games/Roulette/ResultStrip.test.tsx src/components/Games/Roulette/RouletteSurface.tsx src/components/Games/Roulette/RouletteSurface.test.tsx 2>/dev/null
git commit -m "$(cat <<'EOF'
fix(roulette): ResultStrip becomes pocket-badge only

Plan 6's roulette win showed "23 Won 20!" via ResultStrip — the "Won
20!" duplicated the SmallWinCard / JackpotOverlay copy. Drop the
message prop from ResultStrip; the pocket badge alone is the result
indicator. Win-amount text lives only in the celebration card now.
RouletteSurface call site updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `BingoCard` — `overflow-hidden` clips the BINGO! sweep

**Goal:** Stop the motion.div BINGO! sweep from extending past the card boundary into the JUST CALLED panel.

**Files:**
- Modify: `src/components/Games/Bingo/BingoCard.tsx`
- Modify: `src/components/Games/Bingo/BingoCard.test.tsx`

- [ ] **Step 1: Add a failing test asserting the outer wrapper has `overflow-hidden`**

Open `src/components/Games/Bingo/BingoCard.test.tsx`. Add:

```tsx
it('clips the BINGO! sweep with overflow-hidden on the outer relative wrapper', () => {
  // Render with a winning state so the BINGO! banner mounts.
  const drawn = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  render(
    <BingoCard
      theme="west"
      board={[[1, 2, 3], [4, 5, 6], [7, 8, 9]]}
      drawn={drawn}
      lastDrawn={9}
      lines={{ rows: [true, true, true], cols: [true, true, true], diags: [true, true] }}
      win="small"
    />
  );
  const card = screen.getByTestId('bingo-card');
  expect(card.className).toContain('overflow-hidden');
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/components/Games/Bingo/BingoCard.test.tsx -t "overflow-hidden" 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Add `overflow-hidden` to the outer relative wrapper**

Open `src/components/Games/Bingo/BingoCard.tsx`. Find the outer wrapper div (around line 25):

```tsx
<div
  data-testid="bingo-card"
  data-theme={theme}
  className="relative w-full max-w-[42vh] mx-auto"
>
```

Replace with:

```tsx
<div
  data-testid="bingo-card"
  data-theme={theme}
  className="relative w-full max-w-[42vh] mx-auto overflow-hidden"
>
```

Just append `overflow-hidden`.

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/Games/Bingo/BingoCard.test.tsx 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 5: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/Games/Bingo/BingoCard.tsx src/components/Games/Bingo/BingoCard.test.tsx
git commit -m "$(cat <<'EOF'
fix(bingo): clip BINGO! sweep with overflow-hidden on card outer

Plan 5's BINGO! banner sweeps x: -120% → 120% on the relative outer
wrapper. Without overflow-hidden the sweep extended past the card
edge into the adjacent JUST CALLED panel (visible as garbled BINGO!
text overlaying the right panel in the post-deploy browser pass).
overflow-hidden clips the sweep to card bounds — the right boundary
semantically (the sweep is card flair, not a global event).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `BetTable` label clipping fix (DevTools investigation + CSS fix)

**Goal:** Stop "BLACK" from clipping at the screenshot's viewport. Investigate first; the most likely culprit is `tracking-wider` plus `text-[2.5vh]` exceeding cell width at md breakpoints.

**Files:**
- Modify: `src/components/Games/Roulette/BetTable.tsx`
- Possibly modify: `src/components/Games/Roulette/BetTable.test.tsx`

- [ ] **Step 1: Reproduce in dev-server**

In two terminals:

```bash
npm run dev:server     # terminal 1 — Express on :8080
npm run dev            # terminal 2 — Vite on :3000
```

Open `http://localhost:3000` in a browser, sign in, navigate to `roulette/sweets`. Click the EVEN cell to make it active (so the chip overlays). Confirm "BLACK" is clipping/wrapping at the screenshot's viewport (around 600-800px wide).

- [ ] **Step 2: Inspect the BetTable cell in DevTools**

In Chrome DevTools, select the `BLACK` button. Note:
- Computed font-size of the label (the `text-[2vh] md:text-[2.5vh]` resolves to ~16-20px depending on viewport)
- Computed cell width (px)
- Tracking-wider letter-spacing in px (`0.05em` × font-size)
- Whether `text-overflow: ellipsis` or `clip` applies

If the label text width > cell width − padding, that's the cause.

- [ ] **Step 3: Apply the CSS fix**

Open `src/components/Games/Roulette/BetTable.tsx`. Find the button className (around line 38):

```tsx
className={`relative py-[2vh] rounded-lg text-[2vh] md:text-[2.5vh] uppercase font-bold tracking-wider text-white transition-all duration-200 ${BET_CELL_TREATMENT[type]} ${
```

Replace with:

```tsx
className={`relative py-[2vh] px-[1vh] rounded-lg text-[1.7vh] md:text-[2vh] uppercase font-bold text-white transition-all duration-200 ${BET_CELL_TREATMENT[type]} ${
```

Three changes:
- Drop `tracking-wider` (the 0.05em letter-spacing was the main culprit pushing BLACK off-cell).
- Drop the bump from `text-[2vh]` to `text-[2.5vh]` at md (keep `text-[1.7vh] md:text-[2vh]` — slightly smaller overall).
- Add `px-[1vh]` for a small horizontal breathing room.

If after refresh BLACK still clips, the fallback is to drop the chip's overlay positioning so it doesn't visually compete. But try the simple text fix first.

- [ ] **Step 4: Verify in dev-server**

Refresh the browser. Click each bet cell (RED, BLACK, EVEN, ODD) — confirm all four labels render fully visible at the same viewport width as the original screenshot. Sweets theme + at least one other theme.

- [ ] **Step 5: Run BetTable tests**

```bash
npx vitest run src/components/Games/Roulette/BetTable.test.tsx 2>&1 | tail -10
```

Expected: all pass (existing tests assert on the bet-cell test-ids and active-state behaviour, not on font size).

- [ ] **Step 6: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/Games/Roulette/BetTable.tsx
git commit -m "$(cat <<'EOF'
fix(roulette): BetTable BLACK label clipping at md viewports

tracking-wider (0.05em) plus text-[2.5vh] pushed BLACK off the cell
at the post-deploy screenshot's viewport (~700px). Drop tracking-wider,
ease font sizes to text-[1.7vh] md:text-[2vh], add px-[1vh] padding.
All four labels (RED/BLACK/EVEN/ODD) render fully at typical demo
widths. No test changes — existing tests assert on test-ids + active
state, not font size.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `SlotChassis` winning border — DevTools investigation + fix

**Goal:** The winning-state border on Slots looks visually heavier than intended in the post-deploy screenshot. Investigate via DevTools whether the chassis border is the only contributor, or whether `PaylineStrip` / a chassis gradient overlay is adding visual weight.

**Files:**
- Possibly modify: `src/components/Games/Slots/SlotChassis.tsx`
- Possibly modify: `src/components/Games/Slots/PaylineStrip.tsx`

- [ ] **Step 1: Reproduce in dev-server**

With dev servers still running from Task 10, navigate to `slots/egypt`. Set bet to max, click SPIN repeatedly until a small or jackpot win lands (or use DevTools React Devtools to force `win='small'` on the `useSlotsGame` hook for repro). Inspect the chassis when winning.

- [ ] **Step 2: Inspect**

Select the `data-testid="slot-chassis"` div in DevTools. Check:
- Computed `border-width` (currently `border-[0.8vh]` ≈ 7-8px at 1080p).
- Whether any child element adds another border / outline / box-shadow that visually thickens the apparent edge.
- Whether `PaylineStrip`'s winning-state styling adds a frame around the chassis (it shouldn't — payline is the horizontal indicator, not a border).
- The chassis gradient overlay (`absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40`) — this might be making the rim look bolder by darkening the immediate inner edge.

- [ ] **Step 3: Apply the fix matching the diagnosis**

If the chassis border alone is the cause, dial it down. Open `src/components/Games/Slots/SlotChassis.tsx`. Change line 17:

```tsx
className="bg-theme-bg/80 p-4 md:p-6 rounded-2xl border-[0.8vh] border-theme-primary shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative w-full max-w-[80vh] mx-auto"
```

to:

```tsx
className="bg-theme-bg/80 p-4 md:p-6 rounded-2xl border-[0.5vh] border-theme-primary shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative w-full max-w-[80vh] mx-auto"
```

(Just dial border thickness 0.8vh → 0.5vh.)

If `PaylineStrip` adds a winning-state frame, find and tone it down to a horizontal indicator only.

If the gradient overlay is the culprit, reduce its opacity (`from-black/40` → `from-black/20`).

The implementer picks the change that matches what DevTools shows. Don't apply all three; pick one based on diagnosis.

- [ ] **Step 4: Verify in dev-server**

Trigger another winning spin. Confirm the chassis border looks like a tasteful theme-accent rim, not a dominating visual.

- [ ] **Step 5: Run SlotChassis tests**

```bash
npx vitest run src/components/Games/Slots/SlotChassis.test.tsx src/components/Games/Slots/PaylineStrip.test.tsx 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 6: Lint**

```bash
npm run lint 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/Games/Slots/SlotChassis.tsx src/components/Games/Slots/PaylineStrip.tsx 2>/dev/null
git commit -m "$(cat <<'EOF'
fix(slots): tone down winning-state chassis border

[Adjust the commit message to match the actual change made — e.g.,
"reduce chassis border 0.8vh→0.5vh" or "drop PaylineStrip winning
frame" or "ease chassis gradient opacity 40→20". DevTools repro
identified the actual contributor; commit message reflects the fix.]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Final verification + status doc + ship

**Goal:** Run the full baseline, write the post-cleanup status doc, commit, push to origin, deploy.

**Files:**
- Create: `docs/superpowers/progress/2026-05-13-celebration-cleanup-status.md`

- [ ] **Step 1: Run the full lint + test + build**

```bash
npm run lint && npm test && npx vite build 2>&1 | tail -20
```

Expected:
- Lint exit 0.
- Tests: ~433 across 71 files (precise count depends on Tasks 7/9's test additions).
- Build succeeds in ~10s.

Note the new bundle JS / CSS sizes for the status doc.

- [ ] **Step 2: Write the status doc**

Create `docs/superpowers/progress/2026-05-13-celebration-cleanup-status.md` modelled on Plan 6's status doc (`docs/superpowers/progress/2026-05-12-plan-6-status.md`). Include:

- TL;DR: 11 cleanup commits + this status doc + the audio fix (`a84be55`) + the design spec (`78253b2`) ship together. Final test count, bundle size delta vs Plan 6 baseline (919.66 KB JS / 57.49 KB CSS).
- Branch state: on `main`, commit count, final tip SHA.
- "What landed" table: SHA + subject for the 11 cleanup commits, the audio fix, and the spec.
- Deviations from plan (likely: BetTable specific CSS chosen, SlotChassis specific contributor identified).
- Carry-over known limitations from Plans 1–6.
- Browser-pass checklist for prod (re-walk the 9-step Plan 6 checklist now that the cleanup landed; expect the duplication + visual issues to be resolved).

- [ ] **Step 3: Commit the status doc**

```bash
git add docs/superpowers/progress/2026-05-13-celebration-cleanup-status.md
git commit -m "$(cat <<'EOF'
docs(celebration): cleanup status — collapse-duplication batch ready to deploy

Captures the 11 cleanup commits + audio fix + spec doc. Bundle delta,
test count, deviations from plan, browser-pass checklist for prod.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push `main` to origin**

```bash
git push origin main 2>&1 | tail -5
```

Expected: 13 commits push to origin/main (audio fix `a84be55` + spec `78253b2` + 10 cleanup commits from Tasks 1-11 with 7+8 sharing a commit + status doc commit).

- [ ] **Step 5: Deploy**

```bash
./deploy/deploy.sh deploy 2>&1 | tail -10
```

This runs the pre-build npm-test gate + Cloud Build. Expect ~5-8 min total.

- [ ] **Step 6: Verify the new revision is live**

```bash
gcloud --project=bigquery-demo-396708 run services describe ovg-casino --region=us-central1 --format='value(status.latestReadyRevisionName,status.url)' && curl -sI https://ovg-casino-y4zvagwaqa-uc.a.run.app/_healthz | head -3
```

Expected: new revision `ovg-casino-00016-*`; `/_healthz` returns 200.

- [ ] **Step 7: Update memory pointer**

Edit `~/.claude/projects/-home-admin--ovg-casino-ui/memory/redesign-progress.md`:
- Update revision number from `ovg-casino-00015-dkf` → the new one.
- Add a "post-Plan-6 cleanup" line under the existing Plan 6 entry summarizing this batch.

- [ ] **Step 8: Browser-pass on prod**

Walk the 9-step Plan 6 checklist (in `docs/superpowers/progress/2026-05-12-plan-6-status.md`) against the live URL. Verify:
- SmallWinCard renders mid-surface with backdrop-blur (not bottom pill).
- BalancePill ticks in lockstep with the SmallWinCard counter.
- No duplicate "Won X" text under the PLAY button (sr-only now).
- Roulette ResultStrip is pocket-badge-only.
- BINGO! sweep stays inside the card.
- BetTable labels all visible.
- Slots chassis border is a tasteful rim.
- Audio SFX play after toggling unmute (the audio fix landing means the SoundEngine setMuted desync is gone).

If any item fails, file a follow-up commit + redeploy.

---

## Self-Review Checklist (run after writing all tasks; do not commit yet)

- [ ] **All spec sections covered?** ThemedCelebrationCard (Task 1), JackpotOverlay refactor (Task 2), SmallWinCard (Task 3), ThemedCelebration switch (Task 4), SmallWinBanner deletion (Task 5), GameShell sr-only (Task 6), ResultStrip drop message (Tasks 7–8), BingoCard overflow-hidden (Task 9), BetTable fix (Task 10), SlotChassis fix (Task 11), final ship (Task 12). All 11 spec items mapped.
- [ ] **Type consistency?** `ThemedCelebrationCard` props match between Tasks 1, 2, 3. `containerClass` is a string, used identically in JackpotOverlay (Task 2) and SmallWinCard (Task 3). `tier: 'small' | 'jackpot'` exported as `CelebrationTier` from Task 1, referenced consistently.
- [ ] **No `@testing-library/jest-dom` matchers?** Searched — none used; all assertions go through `.textContent.toContain()`, `.className.toContain()`, `.toHaveBeenCalledWith()`, vitest-native equivalents.
- [ ] **No placeholder text?** One conditional in Task 11 Step 3 ("pick one based on diagnosis"). That's intentional — DevTools will reveal which contributor is dominating, and the implementer applies the matching fix. Same for Task 11 Step 7's commit message ("Adjust the commit message to match the actual change"). Both items are bracketed and explicit.
- [ ] **Bundling reflects reality?** Task 12's push deploys: audio fix (a84be55) + spec (78253b2) + 10 cleanup commits (Tasks 1–11; Tasks 7 + 8 share one commit) + status doc = **13 commits** to push.

---

## Open questions / known gotchas

- **`AnimatePresence` not used in `ThemedCelebrationCard`.** The base renders a plain `<div>`; the orchestrator (`ThemedCelebration`) handles the mount/unmount via its own `dismissed` state. If a future fade-out animation is wanted, wrap the base in `<AnimatePresence>` at the orchestrator level — don't add it to the base (would create the same `mode="wait"` jsdom deadlock that bit Plan 5).
- **Backdrop-blur browser support.** Tailwind's `backdrop-blur-md` requires the browser support `backdrop-filter`. All modern browsers in scope for the demo (Chrome ≥ 76, Safari ≥ 9, Firefox ≥ 103) support it. No fallback needed; if the browser doesn't support it, the backdrop stays solid (the `bg-black/30` base layer alone). Fine.
- **`pointer-events-none` on JackpotOverlay's inner card.** Task 2 sets `containerClass="relative z-10 pointer-events-none"` on the card — this is correct; the click-to-dismiss happens on the OUTER backdrop, not the inner content. Same for SmallWinCard (Task 3). Don't change this; otherwise click-on-content also dismisses.
- **`screenshots/` dir stays untracked.** Already an established convention; no task touches it.
