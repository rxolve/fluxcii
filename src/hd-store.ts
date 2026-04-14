import type { HDScene, HDAnimation } from './hd-types.js';
import {
  HD_MAX_SCENE_COUNT,
  HD_MAX_ANIMATION_COUNT,
  HD_SCENE_ID_PREFIX,
  HD_ANIM_ID_PREFIX,
} from './constants.js';

// ── HD Scene store ──

const hdSceneStore = new Map<string, HDScene>();
let _hdSceneCounter = 0;

export function generateHDSceneId(): string {
  const rand = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  const seq = (++_hdSceneCounter).toString().padStart(3, '0');
  return `${HD_SCENE_ID_PREFIX}-${rand}-${seq}`;
}

export function storeHDScene(scene: HDScene): string {
  if (hdSceneStore.size >= HD_MAX_SCENE_COUNT) {
    const oldest = hdSceneStore.keys().next().value!;
    hdSceneStore.delete(oldest);
  }
  hdSceneStore.set(scene.id, scene);
  return scene.id;
}

export function getHDScene(id: string): HDScene {
  const s = hdSceneStore.get(id);
  if (!s) throw new Error(`HD Scene "${id}" not found`);
  return s;
}

export function hasHDScene(id: string): boolean {
  return hdSceneStore.has(id);
}

export function hdSceneCount(): number {
  return hdSceneStore.size;
}

export function listHDScenes(): { id: string; width: number; height: number; layerCount: number }[] {
  return [...hdSceneStore.values()].map((s) => ({
    id: s.id,
    width: s.width,
    height: s.height,
    layerCount: s.layers.length,
  }));
}

export function deleteHDScene(id: string): boolean {
  return hdSceneStore.delete(id);
}

// ── HD Animation store ──

const hdAnimStore = new Map<string, HDAnimation>();
let _hdAnimCounter = 0;

export function generateHDAnimId(): string {
  const rand = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  const seq = (++_hdAnimCounter).toString().padStart(3, '0');
  return `${HD_ANIM_ID_PREFIX}-${rand}-${seq}`;
}

export function storeHDAnimation(anim: HDAnimation): string {
  if (hdAnimStore.size >= HD_MAX_ANIMATION_COUNT) {
    const oldest = hdAnimStore.keys().next().value!;
    hdAnimStore.delete(oldest);
  }
  hdAnimStore.set(anim.id, anim);
  return anim.id;
}

export function getHDAnimation(id: string): HDAnimation {
  const a = hdAnimStore.get(id);
  if (!a) throw new Error(`HD Animation "${id}" not found`);
  return a;
}

export function hasHDAnimation(id: string): boolean {
  return hdAnimStore.has(id);
}

export function hdAnimationCount(): number {
  return hdAnimStore.size;
}

export function listHDAnimations(): { id: string; sceneId: string; totalFrames: number; trackCount: number }[] {
  return [...hdAnimStore.values()].map((a) => ({
    id: a.id,
    sceneId: a.sceneId,
    totalFrames: a.totalFrames,
    trackCount: a.tracks.length,
  }));
}

export function deleteHDAnimation(id: string): boolean {
  return hdAnimStore.delete(id);
}

// ── For testing ──

export function clearHDStore(): void {
  hdSceneStore.clear();
  hdAnimStore.clear();
  _hdSceneCounter = 0;
  _hdAnimCounter = 0;
}
