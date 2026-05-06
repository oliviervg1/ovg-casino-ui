export type RouletteColour = 'red' | 'black' | 'green';

export function evaluateRouletteBet(num: number, colour: RouletteColour, betType: string): boolean {
  if (betType.startsWith('number-')) {
    return Number(betType.slice('number-'.length)) === num;
  }
  if (betType === 'red' || betType === 'black' || betType === 'green') {
    return betType === colour;
  }
  if (betType === 'even') return num !== 0 && num % 2 === 0;
  if (betType === 'odd') return num % 2 === 1;
  return false;
}

export type SlotsResult = 'jackpot' | 'small' | 'none';

export function evaluateSlotsResult(reels: string[]): SlotsResult {
  const [a, b, c] = reels;
  if (a === b && b === c) return 'jackpot';
  if (a === b || b === c || a === c) return 'small';
  return 'none';
}

export function evaluateBingoBoard(board: number[][], drawn: number[]): boolean {
  const drawnSet = new Set(drawn);
  const n = board.length;
  for (let i = 0; i < n; i++) {
    if (board[i].every(v => drawnSet.has(v))) return true;
    if (board.every(row => drawnSet.has(row[i]))) return true;
  }
  if (board.every((row, i) => drawnSet.has(row[i]))) return true;
  if (board.every((row, i) => drawnSet.has(row[n - 1 - i]))) return true;
  return false;
}
