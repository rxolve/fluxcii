import type { Track, AnimatableProperty } from './animation-types.js';

export type PresetName = 'fade-in' | 'fade-out' | 'bounce-in' | 'slide-left' | 'pulse' | 'spin';

export interface PresetOptions {
  nodeId: string;
  totalFrames: number;
  offset?: number;
}

function makeTrack(nodeId: string, property: AnimatableProperty, keyframes: { frame: number; value: number | string; easing?: string }[], offset?: number): Track {
  return {
    nodeId,
    property,
    keyframes: keyframes.map((kf) => ({ frame: kf.frame, value: kf.value, easing: kf.easing as any })),
    offset,
  };
}

export function generatePresetTracks(preset: PresetName, opts: PresetOptions): Track[] {
  const { nodeId, totalFrames, offset } = opts;
  const last = totalFrames - 1;

  switch (preset) {
    case 'fade-in':
      return [makeTrack(nodeId, 'style.opacity', [
        { frame: 0, value: 0, easing: 'ease-out' },
        { frame: last, value: 1 },
      ], offset)];

    case 'fade-out':
      return [makeTrack(nodeId, 'style.opacity', [
        { frame: 0, value: 1, easing: 'ease-in' },
        { frame: last, value: 0 },
      ], offset)];

    case 'bounce-in':
      return [
        makeTrack(nodeId, 'transform.scale', [
          { frame: 0, value: 0, easing: 'bounce' },
          { frame: last, value: 1 },
        ], offset),
        makeTrack(nodeId, 'style.opacity', [
          { frame: 0, value: 0 },
          { frame: Math.max(1, Math.floor(last * 0.2)), value: 1 },
        ], offset),
      ];

    case 'slide-left':
      return [makeTrack(nodeId, 'transform.translate.x', [
        { frame: 0, value: 200, easing: 'ease-out-cubic' },
        { frame: last, value: 0 },
      ], offset)];

    case 'pulse':
      return [makeTrack(nodeId, 'transform.scale', [
        { frame: 0, value: 1, easing: 'ease-in-out' },
        { frame: Math.floor(last / 2), value: 1.15, easing: 'ease-in-out' },
        { frame: last, value: 1 },
      ], offset)];

    case 'spin':
      return [makeTrack(nodeId, 'transform.rotate', [
        { frame: 0, value: 0, easing: 'linear' },
        { frame: last, value: 360 },
      ], offset)];
  }
}

export const PRESET_NAMES: PresetName[] = ['fade-in', 'fade-out', 'bounce-in', 'slide-left', 'pulse', 'spin'];
