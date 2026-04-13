import { describe, it, expect, beforeEach } from 'vitest';
import { generateSceneId, storeScene, getScene, hasScene, savePrev, undo, clearStore } from './store.js';
import { createScene, addRect, resetNodeCounter } from './scene.js';

beforeEach(() => {
  clearStore();
  resetNodeCounter();
});

describe('generateSceneId', () => {
  it('generates scn- prefixed IDs', () => {
    const id = generateSceneId();
    expect(id).toMatch(/^scn-[0-9a-f]{4}-\d{3}$/);
  });
});

describe('storeScene / getScene', () => {
  it('stores and retrieves a scene', () => {
    const s = createScene('s1', 100, 100);
    storeScene(s);
    const got = getScene('s1');
    expect(got.id).toBe('s1');
  });

  it('throws for unknown id', () => {
    expect(() => getScene('bad')).toThrow('not found');
  });
});

describe('hasScene', () => {
  it('returns false for unknown', () => {
    expect(hasScene('x')).toBe(false);
  });
});

describe('undo', () => {
  it('restores previous state', () => {
    const s = createScene('s1', 100, 100);
    storeScene(s);
    savePrev(s);
    addRect(s, { x: 0, y: 0, width: 10, height: 10 });
    expect(s.root.children).toHaveLength(1);
    undo(s);
    expect(s.root.children).toHaveLength(0);
  });
});
