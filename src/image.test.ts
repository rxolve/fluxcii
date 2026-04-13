import { describe, it, expect, beforeAll } from 'vitest';
import { createScene, addImage, resetNodeCounter } from './scene.js';
import { sceneToSvg } from './svg.js';
import { inspectScene } from './inspect.js';
import { generateFrames } from './animate.js';
import { loadPalettes } from './palette.js';
import type { Animation, Track } from './animation-types.js';

const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const HREF = `data:image/png;base64,${TINY_PNG_B64}`;

beforeAll(async () => {
  await loadPalettes();
  resetNodeCounter();
});

describe('addImage', () => {
  it('creates node with correct props and href', () => {
    const s = createScene('img-1', 200, 200);
    const node = addImage(s, { x: 10, y: 20, width: 64, height: 64, href: HREF, name: 'sprite' });
    expect(node.type).toBe('image');
    expect(node.x).toBe(10);
    expect(node.y).toBe(20);
    expect(node.width).toBe(64);
    expect(node.height).toBe(64);
    expect(node.href).toBe(HREF);
    expect(node.name).toBe('sprite');
    expect(s.root.children).toHaveLength(1);
  });
});

describe('sceneToSvg with image', () => {
  it('outputs <image> tag with data URI', () => {
    const s = createScene('img-2', 200, 200);
    addImage(s, { x: 0, y: 0, width: 100, height: 100, href: HREF });
    const svg = sceneToSvg(s);
    expect(svg).toContain('<image');
    expect(svg).toContain(`href="${HREF}"`);
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="100"');
  });

  it('applies opacity but not fill/stroke', () => {
    const s = createScene('img-3', 200, 200);
    addImage(s, { x: 0, y: 0, width: 50, height: 50, href: HREF, style: { opacity: 0.5, fill: '#FF0000' } });
    const svg = sceneToSvg(s);
    expect(svg).toContain('opacity="0.5"');
    expect(svg).not.toContain('fill=');
  });
});

describe('inspectScene with image', () => {
  it('shows image node info', () => {
    const s = createScene('img-4', 200, 200);
    addImage(s, { x: 10, y: 20, width: 32, height: 32, href: HREF, name: 'icon' });
    const out = inspectScene(s);
    expect(out).toContain('[image] icon');
    expect(out).toContain('10,20 32x32');
    expect(out).toContain('KB');
  });
});

describe('image animation', () => {
  it('generates correct frame count with translate track', () => {
    const s = createScene('img-5', 200, 200);
    const node = addImage(s, { x: 0, y: 0, width: 32, height: 32, href: HREF, name: 'mover' });
    const track: Track = {
      nodeId: node.id,
      property: 'x',
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 4, value: 100 },
      ],
    };
    const anim: Animation = {
      id: 'anim-img',
      sceneId: s.id,
      totalFrames: 5,
      tracks: [track],
    };
    const frames = generateFrames(s, anim);
    expect(frames).toHaveLength(5);
  });
});
