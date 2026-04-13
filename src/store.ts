import type { Scene, GroupNode } from './types.js';
import { MAX_SCENE_COUNT, SCENE_ID_PREFIX } from './constants.js';

const sceneStore = new Map<string, Scene>();
let _counter = 0;

export function generateSceneId(): string {
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
  const seq = (++_counter).toString().padStart(3, '0');
  return `${SCENE_ID_PREFIX}-${rand}-${seq}`;
}

export function storeScene(scene: Scene): string {
  if (sceneStore.size >= MAX_SCENE_COUNT) {
    const oldest = sceneStore.keys().next().value!;
    sceneStore.delete(oldest);
  }
  sceneStore.set(scene.id, scene);
  return scene.id;
}

export function getScene(id: string): Scene {
  const s = sceneStore.get(id);
  if (!s) throw new Error(`Scene "${id}" not found`);
  return s;
}

export function hasScene(id: string): boolean {
  return sceneStore.has(id);
}

/** Save current state for undo before mutation. */
export function savePrev(scene: Scene): void {
  scene.prev = structuredClone(scene.root);
}

export function undo(scene: Scene): boolean {
  if (!scene.prev) return false;
  scene.root = scene.prev;
  scene.prev = undefined;
  return true;
}

export function sceneCount(): number {
  return sceneStore.size;
}

/** For testing. */
export function clearStore(): void {
  sceneStore.clear();
  _counter = 0;
}
