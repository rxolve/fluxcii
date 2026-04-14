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
  cloneNode,
  moveNode,
  updateNode,
  addLayer,
  reorderLayers,
  setLayerProps,
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

describe('cloneNode', () => {
  it('deep-clones a node with new IDs', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 10, y: 20, width: 50, height: 30, name: 'orig' });
    const cloned = cloneNode(s, r.id);
    expect(cloned.id).not.toBe(r.id);
    expect(cloned.type).toBe('rect');
    expect((cloned as any).x).toBe(10);
    expect(s.root.children).toHaveLength(2);
  });

  it('clones a group with children, all get new IDs', () => {
    const s = createScene('s1', 100, 100);
    const g = addGroup(s, { name: 'grp' });
    const c = addCircle(s, { cx: 10, cy: 10, r: 5 }, g.id);
    const cloned = cloneNode(s, g.id);
    expect(cloned.id).not.toBe(g.id);
    expect((cloned as any).children[0].id).not.toBe(c.id);
    expect(s.root.children).toHaveLength(2);
  });

  it('throws for nonexistent node', () => {
    const s = createScene('s1', 100, 100);
    expect(() => cloneNode(s, 'bad')).toThrow('not found');
  });
});

describe('moveNode', () => {
  it('moves a node to a different parent', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 0, y: 0, width: 10, height: 10 });
    const g = addGroup(s, { name: 'target' });
    moveNode(s, r.id, g.id);
    expect(s.root.children).toHaveLength(1); // only group
    expect(g.children).toHaveLength(1);
    expect(g.children[0].id).toBe(r.id);
  });

  it('moves a node to a specific index', () => {
    const s = createScene('s1', 100, 100);
    const r1 = addRect(s, { x: 0, y: 0, width: 10, height: 10, name: 'first' });
    const r2 = addRect(s, { x: 10, y: 0, width: 10, height: 10, name: 'second' });
    const r3 = addRect(s, { x: 20, y: 0, width: 10, height: 10, name: 'third' });
    moveNode(s, r3.id, 'root', 0);
    expect(s.root.children[0].id).toBe(r3.id);
  });
});

describe('updateNode', () => {
  it('partially updates node properties', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 0, y: 0, width: 50, height: 30 });
    updateNode(s, r.id, { x: 100, width: 200 });
    expect((r as any).x).toBe(100);
    expect((r as any).width).toBe(200);
    expect((r as any).y).toBe(0); // unchanged
  });

  it('merges style updates', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 0, y: 0, width: 10, height: 10, style: { fill: 'red' } });
    updateNode(s, r.id, { style: { opacity: 0.5 } });
    expect(r.style!.fill).toBe('red');
    expect(r.style!.opacity).toBe(0.5);
  });

  it('ignores id/type/children', () => {
    const s = createScene('s1', 100, 100);
    const r = addRect(s, { x: 0, y: 0, width: 10, height: 10 });
    const origId = r.id;
    updateNode(s, r.id, { id: 'hacked', type: 'circle' });
    expect(r.id).toBe(origId);
    expect(r.type).toBe('rect');
  });
});

describe('layers', () => {
  it('creates a layer with a backing group', () => {
    const s = createScene('s1', 100, 100);
    const layer = addLayer(s, 'background');
    expect(layer.name).toBe('background');
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(1);
    expect(s.layers).toHaveLength(1);
    expect(findNode(s.root, layer.groupId)).not.toBeNull();
  });

  it('reorders layers', () => {
    const s = createScene('s1', 100, 100);
    const l1 = addLayer(s, 'bg');
    const l2 = addLayer(s, 'fg');
    reorderLayers(s, [l2.id, l1.id]);
    expect(s.layers![0].id).toBe(l2.id);
    expect(s.layers![0].order).toBe(0);
    expect(s.layers![1].id).toBe(l1.id);
  });

  it('sets layer props and applies to group', () => {
    const s = createScene('s1', 100, 100);
    const layer = addLayer(s, 'test');
    setLayerProps(s, layer.id, { visible: false, opacity: 0.5 });
    expect(layer.visible).toBe(false);
    expect(layer.opacity).toBe(0.5);
    const group = findNode(s.root, layer.groupId)!;
    expect(group.visible).toBe(false);
    expect(group.style!.opacity).toBe(0.5);
  });
});
