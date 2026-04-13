// ── SVG path point-at-length sampling (M, L, C, Z commands) ──

export interface PathPoint {
  x: number;
  y: number;
}

export type Segment =
  | { type: 'M'; to: PathPoint }
  | { type: 'L'; from: PathPoint; to: PathPoint }
  | { type: 'C'; from: PathPoint; cp1: PathPoint; cp2: PathPoint; to: PathPoint }
  | { type: 'Z'; from: PathPoint; to: PathPoint };

// ── Parse SVG path d attribute ──

export function parsePath(d: string): Segment[] {
  const segments: Segment[] = [];
  const tokens = d.match(/[MLCZmlcz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return segments;

  let cursor: PathPoint = { x: 0, y: 0 };
  let start: PathPoint = { x: 0, y: 0 };
  let i = 0;

  function num(): number {
    return parseFloat(tokens![i++]);
  }

  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M': {
        const to = { x: num(), y: num() };
        segments.push({ type: 'M', to });
        cursor = to;
        start = to;
        // Implicit L commands after M
        while (i < tokens.length && !/[MLCZmlcz]/.test(tokens[i])) {
          const lTo = { x: num(), y: num() };
          segments.push({ type: 'L', from: { ...cursor }, to: lTo });
          cursor = lTo;
        }
        break;
      }
      case 'm': {
        const to = { x: cursor.x + num(), y: cursor.y + num() };
        segments.push({ type: 'M', to });
        cursor = to;
        start = to;
        while (i < tokens.length && !/[MLCZmlcz]/.test(tokens[i])) {
          const lTo = { x: cursor.x + num(), y: cursor.y + num() };
          segments.push({ type: 'L', from: { ...cursor }, to: lTo });
          cursor = lTo;
        }
        break;
      }
      case 'L': {
        while (i < tokens.length && !/[MLCZmlcz]/.test(tokens[i])) {
          const to = { x: num(), y: num() };
          segments.push({ type: 'L', from: { ...cursor }, to });
          cursor = to;
        }
        break;
      }
      case 'l': {
        while (i < tokens.length && !/[MLCZmlcz]/.test(tokens[i])) {
          const to = { x: cursor.x + num(), y: cursor.y + num() };
          segments.push({ type: 'L', from: { ...cursor }, to });
          cursor = to;
        }
        break;
      }
      case 'C': {
        while (i < tokens.length && !/[MLCZmlcz]/.test(tokens[i])) {
          const cp1 = { x: num(), y: num() };
          const cp2 = { x: num(), y: num() };
          const to = { x: num(), y: num() };
          segments.push({ type: 'C', from: { ...cursor }, cp1, cp2, to });
          cursor = to;
        }
        break;
      }
      case 'c': {
        while (i < tokens.length && !/[MLCZmlcz]/.test(tokens[i])) {
          const cp1 = { x: cursor.x + num(), y: cursor.y + num() };
          const cp2 = { x: cursor.x + num(), y: cursor.y + num() };
          const to = { x: cursor.x + num(), y: cursor.y + num() };
          segments.push({ type: 'C', from: { ...cursor }, cp1, cp2, to });
          cursor = to;
        }
        break;
      }
      case 'Z':
      case 'z': {
        if (cursor.x !== start.x || cursor.y !== start.y) {
          segments.push({ type: 'Z', from: { ...cursor }, to: { ...start } });
        }
        cursor = { ...start };
        break;
      }
    }
  }

  return segments;
}

// ── Segment length ──

function dist(a: PathPoint, b: PathPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cubicPoint(from: PathPoint, cp1: PathPoint, cp2: PathPoint, to: PathPoint, t: number): PathPoint {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return {
    x: uuu * from.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * to.x,
    y: uuu * from.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * to.y,
  };
}

function cubicLength(from: PathPoint, cp1: PathPoint, cp2: PathPoint, to: PathPoint, steps = 32): number {
  let length = 0;
  let prev = from;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pt = cubicPoint(from, cp1, cp2, to, t);
    length += dist(prev, pt);
    prev = pt;
  }
  return length;
}

function segmentLength(seg: Segment): number {
  switch (seg.type) {
    case 'M':
      return 0;
    case 'L':
    case 'Z':
      return dist(seg.from, seg.to);
    case 'C':
      return cubicLength(seg.from, seg.cp1, seg.cp2, seg.to);
  }
}

// ── Total path length ──

export function pathLength(segments: Segment[]): number {
  let total = 0;
  for (const seg of segments) {
    total += segmentLength(seg);
  }
  return total;
}

// ── Point at progress (0-1) ──

export function pointAtProgress(segments: Segment[], progress: number): PathPoint {
  const total = pathLength(segments);
  if (total === 0) {
    // Return first M point or origin
    for (const seg of segments) {
      if (seg.type === 'M') return { ...seg.to };
    }
    return { x: 0, y: 0 };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const target = clamped * total;
  let accumulated = 0;

  for (const seg of segments) {
    const len = segmentLength(seg);
    if (len === 0) continue;

    if (accumulated + len >= target) {
      const localT = (target - accumulated) / len;
      switch (seg.type) {
        case 'L':
        case 'Z':
          return {
            x: seg.from.x + (seg.to.x - seg.from.x) * localT,
            y: seg.from.y + (seg.to.y - seg.from.y) * localT,
          };
        case 'C':
          return cubicPoint(seg.from, seg.cp1, seg.cp2, seg.to, localT);
      }
    }
    accumulated += len;
  }

  // Return last point
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg.type === 'L' || seg.type === 'C' || seg.type === 'Z') return { ...seg.to };
    if (seg.type === 'M') return { ...seg.to };
  }
  return { x: 0, y: 0 };
}
