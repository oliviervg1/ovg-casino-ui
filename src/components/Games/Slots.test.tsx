import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { Slots } from './Slots';

vi.mock('../../utils/SoundEngine', () => ({
  soundEngine: { playSlotSpin: vi.fn(), playWin: vi.fn(), playLose: vi.fn(), setMuted: vi.fn() },
}));
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: {
      bg_slots_sweets: 'https://x/bg.png',
      slots_sweets: 'https://x/icon.png',
      sweets_1: 'https://x/1.png',
      sweets_2: 'https://x/2.png',
      sweets_3: 'https://x/3.png',
      sweets_4: 'https://x/4.png',
    },
    loading: false,
  }),
}));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

const renderSlots = (overrides: Partial<React.ComponentProps<typeof Slots>> = {}) =>
  render(
    <AudioControlsProvider>
      <CelebrationProvider>
        <Slots
          name="Sweet Line"
          theme="sweets"
          balance={100}
          onUpdateBalance={vi.fn()}
          onBack={vi.fn()}
          {...overrides}
        />
      </CelebrationProvider>
    </AudioControlsProvider>
  );

describe('Slots (integration)', () => {
  afterEach(() => cleanup());

  it('renders the slot machine inside GameShell', () => {
    renderSlots();
    expect(screen.getByTestId('slot-chassis')).toBeTruthy();
    expect(screen.getAllByTestId('slot-reel').length).toBe(3);
  });

  it('hero button label reads SPIN by default', () => {
    renderSlots();
    expect(screen.getByRole('button', { name: /spin/i })).toBeTruthy();
  });
});
