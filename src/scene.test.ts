import { describe, it, expect, beforeEach } from 'vitest';
import {
  createScene,
  addRect,
  addCircle,
  addGroup,
  addText,
  addLine,
  addEllipse,
  addPolygon,
  addPath,
  findNode,
  removeNode,
  setNodeStyle,
  totalNodes,
  resetNodeCounter,
} from './scene.js';

beforeEach(() => resetNodeCounter());

describe('createScene', () => {
  it('creates a scene with root group', () => {
    const s = createScene('test-1', 800, 600, '#000', 'kurz-space');
    expect(s.id).toBe('test-1');
    expect(s.width).toBe(800);
    expect(s.height).toBe(600);
    expect(s.root.type).toBe('group');
    expect(s.root.children).toHaveLength(0);
  });
});

describe('addRect', () => {
  it('adds a rect to root', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 10, y: 20, width: 50, height: 30 });
    expect(r.type).toBe('rect');
    expect(r.x).toBe(10);
    expect(s.root.children).toHaveLength(1);
  });
});

describe('addCircle', () => {
  it('adds a circle', () => {
    const s = createScene('s1', 100, 100);
    const c = addCircle(s, { cx: 50, cy: 50, r: 25, name: 'dot' });
    expect(c.type).toBe('circle');
    expect(c.name).toBe('dot');
  });
});

describe('addGroup + nesting', () => {
  it('adds shapes to a group', () => {
    const s = createScene('s1', 100, 100);
    const g = addGroup(s, { name: 'stars' });
    addCircle(s, { cx: 10, cy: 10, r: 2 }, g.id);
    addCircle(s, { cx: 20, cy: 20, r: 3 }, g.id);
    expect(g.children).toHaveLength(2);
    expect(totalNodes(s)).toBe(4); // root + group + 2 circles
  });

  it('throws for invalid parent', () => {
    const s = createScene('s1', 100, 100);
    expect(() => addRect(s, { x: 0, y: 0, width: 10, height: 10 }, 'nonexistent')).toThrow('not found');
  });
});

describe('findNode', () => {
  it('finds a nested node', () => {
    const s = createScene('s1', 100, 100);
    const g = addGroup(s, { name: 'g1' });
    const c = addCircle(s, { cx: 5, cy: 5, r: 1 }, g.id);
    const found = findNode(s.root, c.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(c.id);
  });
});

describe('removeNode', () => {
  it('removes a node', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 0, y: 0, width: 10, height: 10 });
    expect(removeNode(s, r.id)).toBe(true);
    expect(s.root.children).toHaveLength(0);
  });

  it('returns false for unknown id', () => {
    const s = createScene('s1', 100, 100);
    expect(removeNode(s, 'bad')).toBe(false);
  });
});

describe('setNodeStyle', () => {
  it('merges style onto a node', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 0, y: 0, width: 10, height: 10, style: { fill: 'red' } });
    setNodeStyle(s, r.id, { stroke: { color: '#000', width: 2 } });
    expect(r.style!.fill).toBe('red');
    expect(r.style!.stroke!.color).toBe('#000');
  });
});

describe('all shape types', () => {
  it('adds line, ellipse, polygon, path, text', () => {
    const s = createScene('s1', 200, 200);
    addLine(s, { x1: 0, y1: 0, x2: 100, y2: 100 });
    addEllipse(s, { cx: 50, cy: 50, rx: 30, ry: 20 });
    addPolygon(s, { points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 50 }] });
    addPath(s, { d: 'M0 0 L10 10' });
    addText(s, { x: 10, y: 20, text: 'Hello' });
    expect(s.root.children).toHaveLength(5);
  });
});
