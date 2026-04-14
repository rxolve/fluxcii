import type { HDAnimation } from './hd-types.js';
import { getHDScene } from './hd-store.js';
import { applyHDFrame } from './hd-animate.js';
import { renderHDScene } from './hd-render.js';
import { blendTransition, type TransitionType } from './hd-transitions.js';

/**
 * Timeline entry: a scene placed at a specific point in the timeline.
 */
export interface TimelineEntry {
  sceneId: string;
  startFrame: number;
  duration: number;
}

/**
 * Transition between two timeline scenes.
 */
export interface TimelineTransition {
  fromIndex: number;
  type: TransitionType;
  duration: number;
}

/**
 * Render a multi-scene timeline animation.
 * Uses timeline entries and transitions stored on the animation object.
 */
export async function renderTimeline(animation: HDAnimation): Promise<Buffer[]> {
  const timeline: TimelineEntry[] = (animation as any).timeline ?? [];
  const transitions: TimelineTransition[] = (animation as any).transitions ?? [];

  if (timeline.length === 0) return [];

  // Sort timeline by start frame
  const sorted = [...timeline].sort((a, b) => a.startFrame - b.startFrame);

  // Calculate total duration
  const totalFrames = animation.totalFrames || Math.max(
    ...sorted.map((e) => e.startFrame + e.duration),
  );

  const buffers: Buffer[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    // Find which scene(s) are active at this frame
    const activeEntries = sorted.filter(
      (e) => frame >= e.startFrame && frame < e.startFrame + e.duration,
    );

    if (activeEntries.length === 0) {
      // No scene active — render black frame
      const { default: sharp } = await import('sharp');
      const firstScene = getHDScene(sorted[0].sceneId);
      const black = await sharp({
        create: {
          width: firstScene.width,
          height: firstScene.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      }).png().toBuffer();
      buffers.push(black);
      continue;
    }

    // Get the primary entry
    const primaryEntry = activeEntries[activeEntries.length - 1];
    const primaryScene = getHDScene(primaryEntry.sceneId);
    const localFrame = frame - primaryEntry.startFrame;
    const snapshot = applyHDFrame(primaryScene, animation.tracks, localFrame);
    let rendered = await renderHDScene(snapshot);

    // Check if there's a transition happening
    const entryIndex = sorted.indexOf(primaryEntry);
    const transition = transitions.find((t) => t.fromIndex === entryIndex - 1);

    if (transition && entryIndex > 0) {
      const prevEntry = sorted[entryIndex - 1];
      const transitionStart = primaryEntry.startFrame;
      const transitionEnd = transitionStart + transition.duration;

      if (frame >= transitionStart && frame < transitionEnd) {
        const progress = (frame - transitionStart) / transition.duration;
        const prevScene = getHDScene(prevEntry.sceneId);
        const prevLocalFrame = frame - prevEntry.startFrame;
        const prevSnapshot = applyHDFrame(prevScene, animation.tracks, prevLocalFrame);
        const prevRendered = await renderHDScene(prevSnapshot);

        rendered = await blendTransition(
          prevRendered,
          rendered,
          progress,
          transition.type,
          primaryScene.width,
          primaryScene.height,
        );
      }
    }

    buffers.push(rendered);
  }

  return buffers;
}
