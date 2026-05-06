import { describe, it, expect } from 'vitest';
import { evaluateRouletteBet, evaluateSlotsResult, evaluateBingoBoard } from './gameLogic';

describe('evaluateRouletteBet', () => {
  it('matches when betType is the chosen number', () => {
    expect(evaluateRouletteBet(7, 'red', 'number-7')).toBe(true);
  });
  it('matches when betType is the chosen colour', () => {
    expect(evaluateRouletteBet(7, 'red', 'red')).toBe(true);
    expect(evaluateRouletteBet(8, 'black', 'red')).toBe(false);
  });
  it('matches even/odd correctly', () => {
    expect(evaluateRouletteBet(8, 'black', 'even')).toBe(true);
    expect(evaluateRouletteBet(7, 'red', 'odd')).toBe(true);
    expect(evaluateRouletteBet(8, 'black', 'odd')).toBe(false);
  });
});

describe('evaluateSlotsResult', () => {
  it('returns jackpot when all three reels match', () => {
    expect(evaluateSlotsResult(['cherry', 'cherry', 'cherry'])).toBe('jackpot');
  });
  it('returns small when exactly two reels match', () => {
    expect(evaluateSlotsResult(['cherry', 'cherry', 'lemon'])).toBe('small');
  });
  it('returns none when nothing matches', () => {
    expect(evaluateSlotsResult(['cherry', 'lemon', 'bell'])).toBe('none');
  });
});

describe('evaluateBingoBoard', () => {
  it('returns true when any row, column, or diagonal is fully drawn', () => {
    const board = [[1,2,3],[4,5,6],[7,8,9]];
    expect(evaluateBingoBoard(board, [1,2,3])).toBe(true);
    expect(evaluateBingoBoard(board, [1,4,7])).toBe(true);
    expect(evaluateBingoBoard(board, [1,5,9])).toBe(true);
    expect(evaluateBingoBoard(board, [3,5,7])).toBe(true);
  });
  it('returns false otherwise', () => {
    const board = [[1,2,3],[4,5,6],[7,8,9]];
    expect(evaluateBingoBoard(board, [1,2,4,8])).toBe(false);
  });
});
