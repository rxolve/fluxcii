import type { Scene, SceneNode, GroupNode } from './types.js';
import type { Animation, Track, AnimatableProperty } from './animation-types.js';
import { interpolateKeyframes } from './interpolate.js';
import { renderToBase64 } from './render.js';
import { findNode } from './scene.js';

// ── Property setter ──

function setProperty(node: SceneNode, property: AnimatableProperty, value: number | string): void {
  switch (property) {
    // Direct node properties
    case 'x':
    case 'y':
    case 'width':
    case 'height':
    case 'cx':
    case 'cy':
    case 'r':
    case 'rx':
    case 'ry':
    case 'x1':
    case 'y1':
    case 'x2':
    case 'y2':
    case 'fontSize':
      (node as unknown as Record<string, unknown>)[property] = value;
      break;

    // Style properties
    case 'style.opacity':
      if (!node.style) node.style = {};
      node.style.opacity = value as number;
      break;
    case 'style.fill':
      if (!node.style) node.style = {};
      node.style.fill = value as string;
      break;
    case 'style.stroke.color':
      if (!node.style) node.style = {};
      if (!node.style.stroke) node.style.stroke = { color: '', width: 1 };
      node.style.stroke.color = value as string;
      break;
    case 'style.stroke.width':
      if (!node.style) node.style = {};
      if (!node.style.stroke) node.style.stroke = { color: '#000000', width: 1 };
      node.style.stroke.width = value as number;
      break;

    // Transform properties
    case 'transform.translate.x':
      if (!node.transform) node.transform = {};
      if (!node.transform.translate) node.transform.translate = { x: 0, y: 0 };
      node.transform.translate.x = value as number;
      break;
    case 'transform.translate.y':
      if (!node.transform) node.transform = {};
      if (!node.transform.translate) node.transform.translate = { x: 0, y: 0 };
      node.transform.translate.y = value as number;
      break;
    case 'transform.rotate':
      if (!node.transform) node.transform = {};
      node.transform.rotate = value as number;
      break;
    case 'transform.scale':
      if (!node.transform) node.transform = {};
      node.transform.scale = value as number;
      break;
    case 'transform.scale.x':
      if (!node.transform) node.transform = {};
      if (typeof node.transform.scale !== 'object') {
        node.transform.scale = { x: node.transform.scale ?? 1, y: node.transform.scale ?? 1 };
      }
      (node.transform.scale as { x: number; y: number }).x = value as number;
      break;
    case 'transform.scale.y':
      if (!node.transform) node.transform = {};
      if (typeof node.transform.scale !== 'object') {
        node.transform.scale = { x: node.transform.scale ?? 1, y: node.transform.scale ?? 1 };
      }
      (node.transform.scale as { x: number; y: number }).y = value as number;
      break;
  }
}

// ── Apply all tracks to a scene snapshot for a given frame ──

function applyFrame(scene: Scene, tracks: Track[], frame: number): Scene {
  const snapshot = structuredClone(scene);
  for (const track of tracks) {
    const node = track.nodeId === 'root'
      ? snapshot.root
      : findNode(snapshot.root, track.nodeId);
    if (!node) continue;
    const value = interpolateKeyframes(track.keyframes, frame, track.property);
    setProperty(node, track.property, value);
  }
  return snapshot;
}

// ── Generate all frames ──

export function generateFrames(scene: Scene, animation: Animation): string[] {
  const frames: string[] = [];
  for (let f = 0; f < animation.totalFrames; f++) {
    const snapshot = applyFrame(scene, animation.tracks, f);
    frames.push(renderToBase64(snapshot));
  }
  return frames;
}

/** Evaluate a single track at a given frame (for testing). */
export function evaluateTrack(track: Track, frame: number): number | string {
  return interpolateKeyframes(track.keyframes, frame, track.property);
}
