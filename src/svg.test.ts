import { describe, it, expect, beforeAll } from 'vitest';
import { sceneToSvg } from './svg.js';
import { createScene, addRect, addCircle, addText, addGroup, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';

beforeAll(async () => {
  await loadPalettes();
  resetNodeCounter();
});

describe('sceneToSvg', () => {
  it('generates valid SVG with background', () => {
    const s = createScene('svg-1', 400, 300, 'void', 'kurz-space');
    const svg = sceneToSvg(s);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="300"');
    expect(svg).toContain('fill="#0B0E1A"'); // resolved "void"
  });

  it('renders shapes', () => {
    const s = createScene('svg-2', 200, 200, undefined, 'kurz-space');
    addRect(s, { x: 10, y: 10, width: 50, height: 50, style: { fill: 'bright-blue' } });
    addCircle(s, { cx: 100, cy: 100, r: 30, style: { fill: '#FF0000', stroke: { color: 'white', width: 2 } } });
    const svg = sceneToSvg(s);
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#2E7DFF"'); // resolved palette color
    expect(svg).toContain('<circle');
    expect(svg).toContain('stroke="#FFFFFF"'); // resolved "white"
  });

  it('renders text', () => {
    const s = createScene('svg-3', 200, 200, undefined, 'kurz-space');
    addText(s, { x: 50, y: 50, text: 'Hello <world>', style: { fill: 'white' } });
    const svg = sceneToSvg(s);
    expect(svg).toContain('Hello &lt;world&gt;');
    expect(svg).toContain('font-size="24"');
  });

  it('renders groups', () => {
    const s = createScene('svg-4', 200, 200);
    const g = addGroup(s, { name: 'mygroup' });
    addCircle(s, { cx: 10, cy: 10, r: 5 }, g.id);
    const svg = sceneToSvg(s);
    expect(svg).toContain('<g');
    expect(svg).toContain('</g>');
  });

  it('renders gradient fills', () => {
    const s = createScene('svg-5', 200, 200, undefined, 'kurz-space');
    addRect(s, {
      x: 0, y: 0, width: 200, height: 200,
      style: {
        fill: {
          type: 'linear',
          angle: 90,
          stops: [
            { offset: 0, color: 'void' },
            { offset: 1, color: 'deep-blue' },
          ],
        },
      },
    });
    const svg = sceneToSvg(s);
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('url(#grad1)');
    expect(svg).toContain('#0B0E1A'); // resolved "void"
  });
});
