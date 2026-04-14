import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateHDSceneId,
  storeHDScene,
  getHDScene,
  hasHDScene,
  hdSceneCount,
  listHDScenes,
  deleteHDScene,
  generateHDAnimId,
  storeHDAnimation,
  getHDAnimation,
  hasHDAnimation,
  listHDAnimations,
  deleteHDAnimation,
  clearHDStore,
} from './hd-store.js';
import type { HDScene, HDAnimation } from './hd-types.js';

beforeEach(() => {
  clearHDStore();
});

function makeScene(id?: string): HDScene {
  return {
    id: id ?? generateHDSceneId(),
    width: 800,
    height: 600,
    background: '#000000',
    layers: [],
  };
}

function makeAnim(sceneId: string, id?: string): HDAnimation {
  return {
    id: id ?? generateHDAnimId(),
    sceneId,
    totalFrames: 30,
    tracks: [],
  };
}

describe('HD Scene store', () => {
  it('generates unique scene IDs', () => {
    const a = generateHDSceneId();
    const b = generateHDSceneId();
    expect(a).not.toBe(b);
    expect(a.startsWith('hd-scn-')).toBe(true);
  });

  it('stores and retrieves scenes', () => {
    const scene = makeScene();
    storeHDScene(scene);
    const got = getHDScene(scene.id);
    expect(got.id).toBe(scene.id);
    expect(got.width).toBe(800);
  });

  it('throws on missing scene', () => {
    expect(() => getHDScene('nonexistent')).toThrow('not found');
  });

  it('checks existence with hasHDScene', () => {
    const scene = makeScene();
    expect(hasHDScene(scene.id)).toBe(false);
    storeHDScene(scene);
    expect(hasHDScene(scene.id)).toBe(true);
  });

  it('counts scenes', () => {
    expect(hdSceneCount()).toBe(0);
    storeHDScene(makeScene());
    expect(hdSceneCount()).toBe(1);
  });

  it('lists scenes', () => {
    const s = makeScene();
    storeHDScene(s);
    const list = listHDScenes();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(s.id);
    expect(list[0].layerCount).toBe(0);
  });

  it('deletes scenes', () => {
    const s = makeScene();
    storeHDScene(s);
    expect(deleteHDScene(s.id)).toBe(true);
    expect(hasHDScene(s.id)).toBe(false);
    expect(deleteHDScene('nope')).toBe(false);
  });

  it('evicts oldest when limit reached', () => {
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) {
      const s = makeScene();
      storeHDScene(s);
      ids.push(s.id);
    }
    // First 5 should have been evicted (limit is 20)
    expect(hasHDScene(ids[0])).toBe(false);
    expect(hasHDScene(ids[24])).toBe(true);
  });
});

describe('HD Animation store', () => {
  it('generates unique animation IDs', () => {
    const a = generateHDAnimId();
    const b = generateHDAnimId();
    expect(a).not.toBe(b);
    expect(a.startsWith('hd-anim-')).toBe(true);
  });

  it('stores and retrieves animations', () => {
    const anim = makeAnim('scene-1');
    storeHDAnimation(anim);
    const got = getHDAnimation(anim.id);
    expect(got.sceneId).toBe('scene-1');
    expect(got.totalFrames).toBe(30);
  });

  it('throws on missing animation', () => {
    expect(() => getHDAnimation('nonexistent')).toThrow('not found');
  });

  it('lists animations', () => {
    const a = makeAnim('scene-1');
    storeHDAnimation(a);
    const list = listHDAnimations();
    expect(list).toHaveLength(1);
    expect(list[0].sceneId).toBe('scene-1');
  });

  it('deletes animations', () => {
    const a = makeAnim('scene-1');
    storeHDAnimation(a);
    expect(deleteHDAnimation(a.id)).toBe(true);
    expect(hasHDAnimation(a.id)).toBe(false);
  });
});
