import { describe, it, expect, beforeAll } from 'vitest';
import { sceneToSvg } from './svg.js';
import { createScene, addRect, addCircle, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';

beforeAll(async () => {
  await loadPalettes();
  resetNodeCounter();
});

describe('SVG filter rendering', () => {
  it('renders blur filter', () => {
    const s = createScene('f1', 200, 200, undefined, 'kurz-space');
    addRect(s, {
      x: 10, y: 10, width: 80, height: 80,
      style: { fill: '#FF0000', filter: { blur: 5 } },
    });
    const svg = sceneToSvg(s);
    expect(svg).toContain('<filter id="filter1">');
    expect(svg).toContain('feGaussianBlur');
    expect(svg).toContain('stdDeviation="5"');
    expect(svg).toContain('filter="url(#filter1)"');
  });

  it('renders drop shadow filter', () => {
    const s = createScene('f2', 200, 200, undefined, 'kurz-space');
    addCircle(s, {
      cx: 100, cy: 100, r: 40,
      style: {
        fill: '#00FF00',
        filter: { dropShadow: { dx: 3, dy: 3, blur: 4, color: '#000000' } },
      },
    });
    const svg = sceneToSvg(s);
    expect(svg).toContain('feDropShadow');
    expect(svg).toContain('dx="3"');
    expect(svg).toContain('flood-color="#000000"');
  });

  it('renders glow filter', () => {
    const s = createScene('f3', 200, 200, undefined, 'kurz-space');
    addRect(s, {
      x: 0, y: 0, width: 100, height: 100,
      style: { fill: '#0000FF', filter: { glow: { radius: 8, color: '#00FFFF' } } },
    });
    const svg = sceneToSvg(s);
    expect(svg).toContain('feFlood');
    expect(svg).toContain('flood-color="#00FFFF"');
    expect(svg).toContain('feMerge');
  });

  it('does not render filter when none set', () => {
    const s = createScene('f4', 200, 200, undefined, 'kurz-space');
    addRect(s, { x: 0, y: 0, width: 100, height: 100, style: { fill: '#FF0000' } });
    const svg = sceneToSvg(s);
    expect(svg).not.toContain('<filter');
  });
});
