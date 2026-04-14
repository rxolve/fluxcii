import type { Scene } from './types.js';
import type { Animation } from './animation-types.js';
import { getScene, getAnimation } from './store.js';
import { generateBuffers } from './animate.js';

export interface CompositionSegment {
  animId: string;
  startFrame: number;
  endFrame: number;
}

export interface Composition {
  segments: CompositionSegment[];
}

/**
 * Render a composition (sequence of animation segments) into a single frame buffer array.
 */
export function renderComposition(composition: Composition): Buffer[] {
  const allBuffers: Buffer[] = [];

  for (const segment of composition.segments) {
    const anim = getAnimation(segment.animId);
    const scene = getScene(anim.sceneId);
    const fullBuffers = generateBuffers(scene, anim);

    const start = Math.max(0, segment.startFrame);
    const end = Math.min(fullBuffers.length, segment.endFrame);
    allBuffers.push(...fullBuffers.slice(start, end));
  }

  return allBuffers;
}
