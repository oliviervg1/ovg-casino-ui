import { angleOfPocket, type RouletteColour } from '../gameLogic';

export interface RouletteSegment {
  number: number;
  colour: RouletteColour;
  /** SVG `d` path string for the wedge in a 100×100 viewBox (centre 50,50; outer radius 50). */
  path: string;
  /** X coordinate of the number label (radius 42 ring). */
  labelX: number;
  /** Y coordinate of the number label (radius 42 ring). */
  labelY: number;
  /** Rotation of the label so its baseline runs radially. Equal to angleOfPocket(n). */
  labelAngle: number;
}

const CENTRE = 50;
const OUTER_RADIUS = 50;
const LABEL_RADIUS = 42;
const SEGMENT_COUNT = 37;
const WEDGE_DEG = 360 / SEGMENT_COUNT;

function colourOf(n: number): RouletteColour {
  if (n === 0) return 'green';
  return n % 2 === 1 ? 'red' : 'black';
}

function pointOnCircle(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [CENTRE + r * Math.cos(rad), CENTRE + r * Math.sin(rad)];
}

function wedgePath(startAngle: number, endAngle: number): string {
  const [x1, y1] = pointOnCircle(startAngle, OUTER_RADIUS);
  const [x2, y2] = pointOnCircle(endAngle, OUTER_RADIUS);
  return `M${CENTRE},${CENTRE} L${x1.toFixed(3)},${y1.toFixed(3)} A${OUTER_RADIUS},${OUTER_RADIUS} 0 0 1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`;
}

function computeSegments(): RouletteSegment[] {
  const out: RouletteSegment[] = [];
  for (let n = 0; n < SEGMENT_COUNT; n++) {
    const startAngle = n * WEDGE_DEG - WEDGE_DEG / 2;
    const endAngle = startAngle + WEDGE_DEG;
    const labelAngle = angleOfPocket(n);
    const [labelX, labelY] = pointOnCircle(labelAngle, LABEL_RADIUS);
    out.push({
      number: n,
      colour: colourOf(n),
      path: wedgePath(startAngle, endAngle),
      labelX,
      labelY,
      labelAngle,
    });
  }
  return out;
}

const SEGMENTS = computeSegments();

export function getRouletteSegments(): RouletteSegment[] {
  return SEGMENTS;
}
