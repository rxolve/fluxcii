import type { Scene, SceneNode, GroupNode } from './types.js';
import type { Animation, Track, AnimatableProperty, PlaybackMode } from './animation-types.js';
import { interpolateKeyframes } from './interpolate.js';
import { renderToBase64, renderToBuffer } from './render.js';
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

// ── Playback mode → frame index sequence ──

export function resolveFrameSequence(totalFrames: number, mode: PlaybackMode = 'normal'): number[] {
  const indices: number[] = [];
  switch (mode) {
    case 'reverse':
      for (let i = totalFrames - 1; i >= 0; i--) indices.push(i);
      break;
    case 'pingpong':
      for (let i = 0; i < totalFrames; i++) indices.push(i);
      for (let i = totalFrames - 2; i >= 1; i--) indices.push(i);
      break;
    case 'normal':
    default:
      for (let i = 0; i < totalFrames; i++) indices.push(i);
      break;
  }
  return indices;
}

// ── Apply all tracks to a scene snapshot for a given frame ──

function applyFrame(scene: Scene, tracks: Track[], frame: number): Scene {
  const snapshot = structuredClone(scene);
  for (const track of tracks) {
    const node = track.nodeId === 'root'
      ? snapshot.root
      : findNode(snapshot.root, track.nodeId);
    if (!node) continue;
    const effectiveFrame = frame - (track.offset ?? 0);
    const value = interpolateKeyframes(track.keyframes, effectiveFrame, track.property);
    setProperty(node, track.property, value);
  }
  return snapshot;
}

// ── Generate PNG buffers for all frames ──

export function generateBuffers(scene: Scene, animation: Animation): Buffer[] {
  const sequence = resolveFrameSequence(animation.totalFrames, animation.mode);
  const buffers: Buffer[] = [];
  for (const f of sequence) {
    const snapshot = applyFrame(scene, animation.tracks, f);
    buffers.push(renderToBuffer(snapshot));
  }
  return buffers;
}

// ── Generate all frames as base64 ──

export function generateFrames(scene: Scene, animation: Animation): string[] {
  const buffers = generateBuffers(scene, animation);
  return buffers.map((buf) => buf.toString('base64'));
}

/** Evaluate a single track at a given frame (for testing). */
export function evaluateTrack(track: Track, frame: number): number | string {
  return interpolateKeyframes(track.keyframes, frame, track.property);
}
