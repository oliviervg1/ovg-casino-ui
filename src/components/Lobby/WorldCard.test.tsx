import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType, themeManifesto } from '../../utils/themeManifesto';
import { WorldCard } from './WorldCard';

describe('WorldCard', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the manifesto display name`, () => {
      const expectedName = themeManifesto[theme].displayName;
      render(<WorldCard theme={theme} bgImageUrl="https://example/bg.png" onSelectGame={() => {}} />);
      expect(screen.getByText(expectedName)).toBeTruthy();
    });
  });

  it('renders the bg image as the card background', () => {
    render(<WorldCard theme="sweets" bgImageUrl="https://example/bg.png" onSelectGame={() => {}} data-testid="wc" />);
    const card = screen.getByTestId('wc') as HTMLElement;
    expect(card.style.backgroundImage).toContain('https://example/bg.png');
  });

  it('clicking the card body selects the slots game by default', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectGame={(g) => { selected = g; }} data-testid="wc" />);
    fireEvent.click(screen.getByTestId('wc'));
    expect(selected).toBe('slots-sweets');
  });

  it('clicking the roulette icon selects the roulette game', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/roulette/i));
    expect(selected).toBe('roulette-sweets');
  });

  it('clicking the bingo icon selects the bingo game', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/bingo/i));
    expect(selected).toBe('bingo-sweets');
  });

  it('clicking a game icon does NOT bubble to the card body click', () => {
    let cardClicks = 0;
    let iconClicks = 0;
    render(
      <WorldCard
        theme="sweets"
        bgImageUrl=""
        onSelectGame={(g) => { if (g.startsWith('slots')) cardClicks++; else iconClicks++; }}
        data-testid="wc"
      />
    );
    fireEvent.click(screen.getByLabelText(/roulette/i));
    expect(iconClicks).toBe(1);
    expect(cardClicks).toBe(0);
  });
});
