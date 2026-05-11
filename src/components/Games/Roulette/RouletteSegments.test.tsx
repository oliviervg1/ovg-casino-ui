import { describe, it, expect } from 'vitest';
import { getRouletteSegments } from './RouletteSegments';

describe('getRouletteSegments', () => {
  const segments = getRouletteSegments();

  it('returns exactly 37 segments numbered 0..36 in order', () => {
    expect(segments.length).toBe(37);
    for (let i = 0; i < 37; i++) {
      expect(segments[i].number).toBe(i);
    }
  });

  it('marks pocket 0 as green', () => {
    expect(segments[0].colour).toBe('green');
  });

  it('marks odd numbers as red and even (non-zero) as black', () => {
    for (let i = 1; i <= 36; i++) {
      const expected = i % 2 === 1 ? 'red' : 'black';
      expect(segments[i].colour).toBe(expected);
    }
  });

  it('produces 18 red, 18 black, and 1 green segment', () => {
    const counts = segments.reduce(
      (acc, s) => ({ ...acc, [s.colour]: (acc[s.colour] || 0) + 1 }),
      {} as Record<string, number>,
    );
    expect(counts.red).toBe(18);
    expect(counts.black).toBe(18);
    expect(counts.green).toBe(1);
  });

  it('every segment path begins with M50,50 (centre) and ends with Z (closepath)', () => {
    for (const s of segments) {
      expect(s.path.startsWith('M50,50')).toBe(true);
      expect(s.path.endsWith('Z')).toBe(true);
    }
  });

  it('label positions sit inside the wheel (radius < 50) and centred near the wedge midline', () => {
    for (const s of segments) {
      const dx = s.labelX - 50;
      const dy = s.labelY - 50;
      const r = Math.sqrt(dx * dx + dy * dy);
      expect(r).toBeGreaterThan(35);
      expect(r).toBeLessThan(50);
    }
  });

  it('labelAngle for pocket 0 is 0 and grows monotonically through pocket 36', () => {
    expect(segments[0].labelAngle).toBe(0);
    for (let i = 1; i <= 36; i++) {
      expect(segments[i].labelAngle).toBeGreaterThan(segments[i - 1].labelAngle);
    }
  });
});
