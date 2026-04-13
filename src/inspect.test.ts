import { describe, it, expect, beforeEach } from 'vitest';
import { inspectScene } from './inspect.js';
import { createScene, addRect, addCircle, addGroup, addText, resetNodeCounter } from './scene.js';

beforeEach(() => resetNodeCounter());

describe('inspectScene', () => {
  it('shows empty scene', () => {
    const s = createScene('s1', 800, 600, '#000', 'kurz-space');
    const out = inspectScene(s);
    expect(out).toContain('scene: s1');
    expect(out).toContain('800x600');
    expect(out).toContain('palette: kurz-space');
    expect(out).toContain('(empty)');
  });

  it('shows nodes in tree format', () => {
    const s = createScene('s2', 800, 600, undefined, 'kurz-space');
    addRect(s, { x: 0, y: 0, width: 800, height: 600, name: 'sky', style: { fill: 'deep-blue' } });
    addCircle(s, { cx: 400, cy: 300, r: 120, name: 'planet', style: { fill: 'royal-blue', stroke: { color: 'bright-blue', width: 2 } } });
    const g = addGroup(s, { name: 'stars' });
    addCircle(s, { cx: 120, cy: 80, r: 3, name: 'star-1' }, g.id);

    const out = inspectScene(s);
    expect(out).toContain('[rect] sky');
    expect(out).toContain('[circle] planet');
    expect(out).toContain('[group] stars (1 children)');
    expect(out).toContain('[circle] star-1');
    expect(out).toContain('4 nodes');
  });

  it('shows text nodes', () => {
    const s = createScene('s3', 200, 200);
    addText(s, { x: 10, y: 20, text: 'Hello World', name: 'title' });
    const out = inspectScene(s);
    expect(out).toContain('[text] title');
    expect(out).toContain('"Hello World"');
  });
});
