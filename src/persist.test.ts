import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveProject, loadProject, listProjects } from './persist.js';
import { createScene, addRect, resetNodeCounter } from './scene.js';
import { storeScene, storeAnimation, clearStore, getScene, getAnimation } from './store.js';
import type { Animation } from './animation-types.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'fluxcii-test-projects');

beforeEach(async () => {
  clearStore();
  resetNodeCounter();
  process.env.FLUXCII_PROJECT_DIR = TEST_DIR;
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  delete process.env.FLUXCII_PROJECT_DIR;
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('saveProject / loadProject', () => {
  it('round-trips scenes and animations', async () => {
    const s = createScene('s1', 200, 150, '#111');
    addRect(s, { x: 0, y: 0, width: 50, height: 50, name: 'box' });
    storeScene(s);

    const anim: Animation = {
      id: 'a1', sceneId: 's1', totalFrames: 10,
      tracks: [{ nodeId: 'n0001', property: 'x', keyframes: [{ frame: 0, value: 0 }, { frame: 9, value: 100 }] }],
    };
    storeAnimation(anim);

    const filePath = await saveProject('test-project');
    expect(filePath).toContain('test-project.json');

    // Clear and reload
    clearStore();
    const result = await loadProject('test-project');
    expect(result.sceneCount).toBe(1);
    expect(result.animationCount).toBe(1);

    const loaded = getScene('s1');
    expect(loaded.width).toBe(200);
    expect(loaded.root.children).toHaveLength(1);

    const loadedAnim = getAnimation('a1');
    expect(loadedAnim.totalFrames).toBe(10);
  });

  it('strips undo state (prev) from saved scenes', async () => {
    const s = createScene('s1', 100, 100);
    s.prev = structuredClone(s.root); // simulate undo state
    storeScene(s);

    await saveProject('no-prev');
    const raw = await fs.readFile(path.join(TEST_DIR, 'no-prev.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(data.scenes[0].prev).toBeUndefined();
  });
});

describe('listProjects', () => {
  it('lists saved projects', async () => {
    const s = createScene('s1', 100, 100);
    storeScene(s);
    await saveProject('alpha');
    await saveProject('beta');

    const projects = await listProjects();
    expect(projects).toContain('alpha');
    expect(projects).toContain('beta');
  });

  it('returns empty when no projects', async () => {
    const projects = await listProjects();
    expect(projects).toHaveLength(0);
  });
});
