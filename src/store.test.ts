import { describe, it, expect, beforeEach } from 'vitest';
import { generateSceneId, storeScene, getScene, hasScene, savePrev, undo, clearStore, listScenes, listAnimations, deleteScene, deleteAnimation, storeAnimation, generateAnimId } from './store.js';
import { createScene, addRect, addCircle, resetNodeCounter } from './scene.js';
import type { Animation } from './animation-types.js';

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

describe('listScenes', () => {
  it('lists all stored scenes with metadata', () => {
    const s1 = createScene('s1', 100, 200);
    addRect(s1, { x: 0, y: 0, width: 10, height: 10 });
    addCircle(s1, { cx: 50, cy: 50, r: 25 });
    storeScene(s1);
    const s2 = createScene('s2', 300, 400);
    storeScene(s2);

    const list = listScenes();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ id: 's1', width: 100, height: 200, nodeCount: 2 });
    expect(list[1]).toEqual({ id: 's2', width: 300, height: 400, nodeCount: 0 });
  });

  it('returns empty array when no scenes', () => {
    expect(listScenes()).toHaveLength(0);
  });
});

describe('deleteScene', () => {
  it('deletes an existing scene', () => {
    storeScene(createScene('s1', 100, 100));
    expect(deleteScene('s1')).toBe(true);
    expect(hasScene('s1')).toBe(false);
  });

  it('returns false for nonexistent scene', () => {
    expect(deleteScene('nope')).toBe(false);
  });
});

describe('listAnimations', () => {
  it('lists stored animations', () => {
    const anim: Animation = {
      id: 'a1',
      sceneId: 's1',
      totalFrames: 10,
      tracks: [{ nodeId: 'n1', property: 'x', keyframes: [{ frame: 0, value: 0 }] }],
    };
    storeAnimation(anim);
    const list = listAnimations();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ id: 'a1', sceneId: 's1', totalFrames: 10, trackCount: 1 });
  });
});

describe('deleteAnimation', () => {
  it('deletes an existing animation', () => {
    const anim: Animation = { id: 'a1', sceneId: 's1', totalFrames: 10, tracks: [] };
    storeAnimation(anim);
    expect(deleteAnimation('a1')).toBe(true);
    expect(() => getScene('a1')).toThrow();
  });
});
