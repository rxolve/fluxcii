import type { HDTrack, HDPresetName, HDAnimatableProperty, HDKeyframe } from './hd-types.js';
import type { EasingName } from './animation-types.js';

export interface HDPresetOptions {
  layerId: string;
  totalFrames: number;
  offset?: number;
  /** Scene width — used for slide distances */
  sceneWidth?: number;
  /** Scene height — used for slide distances */
  sceneHeight?: number;
}

function makeTrack(
  layerId: string,
  property: HDAnimatableProperty,
  keyframes: { frame: number; value: number; easing?: EasingName }[],
  offset?: number,
): HDTrack {
  return {
    layerId,
    property,
    keyframes: keyframes.map((kf) => ({
      frame: kf.frame,
      value: kf.value,
      easing: kf.easing,
    })),
    offset,
  };
}

export function generateHDPresetTracks(preset: HDPresetName, opts: HDPresetOptions): HDTrack[] {
  const { layerId, totalFrames, offset } = opts;
  const last = totalFrames - 1;
  const slideX = opts.sceneWidth ?? 800;
  const slideY = opts.sceneHeight ?? 600;
  const mid = Math.floor(last / 2);
  const q1 = Math.floor(last / 4);
  const q3 = Math.floor((last * 3) / 4);

  switch (preset) {
    // ── Fade ──
    case 'fade-in':
      return [makeTrack(layerId, 'opacity', [
        { frame: 0, value: 0, easing: 'ease-out' },
        { frame: last, value: 1 },
      ], offset)];

    case 'fade-out':
      return [makeTrack(layerId, 'opacity', [
        { frame: 0, value: 1, easing: 'ease-in' },
        { frame: last, value: 0 },
      ], offset)];

    // ── Slide (relative motion) ──
    case 'slide-left':
      return [makeTrack(layerId, 'x', [
        { frame: 0, value: 0, easing: 'ease-out-cubic' },
        { frame: last, value: -slideX },
      ], offset)];

    case 'slide-right':
      return [makeTrack(layerId, 'x', [
        { frame: 0, value: 0, easing: 'ease-out-cubic' },
        { frame: last, value: slideX },
      ], offset)];

    case 'slide-up':
      return [makeTrack(layerId, 'y', [
        { frame: 0, value: 0, easing: 'ease-out-cubic' },
        { frame: last, value: -slideY },
      ], offset)];

    case 'slide-down':
      return [makeTrack(layerId, 'y', [
        { frame: 0, value: 0, easing: 'ease-out-cubic' },
        { frame: last, value: slideY },
      ], offset)];

    // ── Slide in from offscreen ──
    case 'slide-in-from-left':
      return [
        makeTrack(layerId, 'x', [
          { frame: 0, value: -slideX, easing: 'ease-out-cubic' },
          { frame: last, value: 0 },
        ], offset),
        ...generateHDPresetTracks('fade-in', { ...opts, totalFrames: Math.max(2, Math.floor(totalFrames * 0.4)) }),
      ];

    case 'slide-in-from-right':
      return [
        makeTrack(layerId, 'x', [
          { frame: 0, value: slideX, easing: 'ease-out-cubic' },
          { frame: last, value: 0 },
        ], offset),
        ...generateHDPresetTracks('fade-in', { ...opts, totalFrames: Math.max(2, Math.floor(totalFrames * 0.4)) }),
      ];

    case 'slide-in-from-top':
      return [
        makeTrack(layerId, 'y', [
          { frame: 0, value: -slideY, easing: 'ease-out-cubic' },
          { frame: last, value: 0 },
        ], offset),
        ...generateHDPresetTracks('fade-in', { ...opts, totalFrames: Math.max(2, Math.floor(totalFrames * 0.4)) }),
      ];

    case 'slide-in-from-bottom':
      return [
        makeTrack(layerId, 'y', [
          { frame: 0, value: slideY, easing: 'ease-out-cubic' },
          { frame: last, value: 0 },
        ], offset),
        ...generateHDPresetTracks('fade-in', { ...opts, totalFrames: Math.max(2, Math.floor(totalFrames * 0.4)) }),
      ];

    // ── Slide out to offscreen ──
    case 'slide-out-to-left':
      return [
        makeTrack(layerId, 'x', [
          { frame: 0, value: 0, easing: 'ease-in-cubic' },
          { frame: last, value: -slideX },
        ], offset),
        ...generateHDPresetTracks('fade-out', { ...opts, totalFrames, offset: (offset ?? 0) + Math.floor(totalFrames * 0.6) }),
      ];

    case 'slide-out-to-right':
      return [
        makeTrack(layerId, 'x', [
          { frame: 0, value: 0, easing: 'ease-in-cubic' },
          { frame: last, value: slideX },
        ], offset),
        ...generateHDPresetTracks('fade-out', { ...opts, totalFrames, offset: (offset ?? 0) + Math.floor(totalFrames * 0.6) }),
      ];

    case 'slide-out-to-top':
      return [
        makeTrack(layerId, 'y', [
          { frame: 0, value: 0, easing: 'ease-in-cubic' },
          { frame: last, value: -slideY },
        ], offset),
      ];

    case 'slide-out-to-bottom':
      return [
        makeTrack(layerId, 'y', [
          { frame: 0, value: 0, easing: 'ease-in-cubic' },
          { frame: last, value: slideY },
        ], offset),
      ];

    // ── Zoom ──
    case 'zoom-in':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 0, easing: 'ease-out-cubic' },
          { frame: last, value: 1 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: 0, value: 0 },
          { frame: Math.max(1, Math.floor(last * 0.3)), value: 1 },
        ], offset),
      ];

    case 'zoom-out':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 1, easing: 'ease-in-cubic' },
          { frame: last, value: 0 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: Math.floor(last * 0.7), value: 1, easing: 'ease-in' },
          { frame: last, value: 0 },
        ], offset),
      ];

    // ── Pop ──
    case 'pop-in':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 0, easing: 'back' },
          { frame: last, value: 1 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: 0, value: 0 },
          { frame: Math.max(1, Math.floor(last * 0.2)), value: 1 },
        ], offset),
      ];

    case 'pop-out':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 1, easing: 'ease-in-cubic' },
          { frame: last, value: 1.3 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: Math.floor(last * 0.5), value: 1, easing: 'ease-in' },
          { frame: last, value: 0 },
        ], offset),
      ];

    // ── Bounce ──
    case 'bounce-in':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 0, easing: 'bounce' },
          { frame: last, value: 1 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: 0, value: 0 },
          { frame: Math.max(1, Math.floor(last * 0.15)), value: 1 },
        ], offset),
      ];

    case 'bounce-out':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 1, easing: 'bounce' },
          { frame: last, value: 0 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: Math.floor(last * 0.85), value: 1 },
          { frame: last, value: 0 },
        ], offset),
      ];

    // ── Spin ──
    case 'spin-cw':
      return [makeTrack(layerId, 'rotate', [
        { frame: 0, value: 0, easing: 'linear' },
        { frame: last, value: 360 },
      ], offset)];

    case 'spin-ccw':
      return [makeTrack(layerId, 'rotate', [
        { frame: 0, value: 0, easing: 'linear' },
        { frame: last, value: -360 },
      ], offset)];

    // ── Shake ──
    case 'shake-x': {
      const amp = 10;
      const kfs: { frame: number; value: number; easing?: EasingName }[] = [];
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const f = Math.round((i / steps) * last);
        const v = i === 0 || i === steps ? 0 : (i % 2 === 1 ? amp : -amp);
        kfs.push({ frame: f, value: v, easing: 'ease-in-out' });
      }
      return [makeTrack(layerId, 'x', kfs, offset)];
    }

    case 'shake-y': {
      const amp = 10;
      const kfs: { frame: number; value: number; easing?: EasingName }[] = [];
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const f = Math.round((i / steps) * last);
        const v = i === 0 || i === steps ? 0 : (i % 2 === 1 ? amp : -amp);
        kfs.push({ frame: f, value: v, easing: 'ease-in-out' });
      }
      return [makeTrack(layerId, 'y', kfs, offset)];
    }

    // ── Pulse / Breathe ──
    case 'pulse':
      return [makeTrack(layerId, 'scale', [
        { frame: 0, value: 1, easing: 'ease-in-out' },
        { frame: mid, value: 1.15, easing: 'ease-in-out' },
        { frame: last, value: 1 },
      ], offset)];

    case 'breathe':
      return [makeTrack(layerId, 'scale', [
        { frame: 0, value: 1, easing: 'ease-in-out' },
        { frame: mid, value: 1.05, easing: 'ease-in-out' },
        { frame: last, value: 1 },
      ], offset)];

    // ── Float ──
    case 'float':
      return [makeTrack(layerId, 'y', [
        { frame: 0, value: 0, easing: 'ease-in-out' },
        { frame: mid, value: -15, easing: 'ease-in-out' },
        { frame: last, value: 0 },
      ], offset)];

    // ── Wobble ──
    case 'wobble':
      return [makeTrack(layerId, 'rotate', [
        { frame: 0, value: 0, easing: 'ease-in-out' },
        { frame: q1, value: -10, easing: 'ease-in-out' },
        { frame: mid, value: 0, easing: 'ease-in-out' },
        { frame: q3, value: 10, easing: 'ease-in-out' },
        { frame: last, value: 0 },
      ], offset)];

    // ── Flip in ──
    case 'flip-in':
      return [
        makeTrack(layerId, 'scale', [
          { frame: 0, value: 0, easing: 'ease-out-cubic' },
          { frame: last, value: 1 },
        ], offset),
        makeTrack(layerId, 'rotate', [
          { frame: 0, value: -90, easing: 'ease-out-cubic' },
          { frame: last, value: 0 },
        ], offset),
        makeTrack(layerId, 'opacity', [
          { frame: 0, value: 0 },
          { frame: Math.max(1, Math.floor(last * 0.3)), value: 1 },
        ], offset),
      ];

    // ── Swing ──
    case 'swing':
      return [makeTrack(layerId, 'rotate', [
        { frame: 0, value: 0, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.2), value: 15, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.4), value: -10, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.6), value: 5, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.8), value: -2, easing: 'ease-in-out' },
        { frame: last, value: 0 },
      ], offset)];

    // ── Rubber band ──
    case 'rubber-band':
      return [makeTrack(layerId, 'scale', [
        { frame: 0, value: 1, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.3), value: 1.25, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.4), value: 0.75, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.5), value: 1.15, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.65), value: 0.95, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.75), value: 1.05, easing: 'ease-in-out' },
        { frame: last, value: 1 },
      ], offset)];

    // ── Jello ──
    case 'jello':
      return [makeTrack(layerId, 'rotate', [
        { frame: 0, value: 0, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.2), value: -12, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.35), value: 6.5, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.5), value: -3.3, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.65), value: 1.6, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.8), value: -0.8, easing: 'ease-in-out' },
        { frame: last, value: 0 },
      ], offset)];

    // ── Heartbeat ──
    case 'heartbeat':
      return [makeTrack(layerId, 'scale', [
        { frame: 0, value: 1, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.15), value: 1.3, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.3), value: 1, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.45), value: 1.3, easing: 'ease-in-out' },
        { frame: Math.floor(last * 0.6), value: 1, easing: 'ease-in-out' },
        { frame: last, value: 1 },
      ], offset)];

    // ── Flash ──
    case 'flash':
      return [makeTrack(layerId, 'opacity', [
        { frame: 0, value: 1 },
        { frame: q1, value: 0 },
        { frame: mid, value: 1 },
        { frame: q3, value: 0 },
        { frame: last, value: 1 },
      ], offset)];
  }
}

export const HD_PRESET_NAMES: HDPresetName[] = [
  'fade-in', 'fade-out',
  'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'slide-in-from-left', 'slide-in-from-right', 'slide-in-from-top', 'slide-in-from-bottom',
  'slide-out-to-left', 'slide-out-to-right', 'slide-out-to-top', 'slide-out-to-bottom',
  'zoom-in', 'zoom-out',
  'pop-in', 'pop-out',
  'bounce-in', 'bounce-out',
  'spin-cw', 'spin-ccw',
  'shake-x', 'shake-y',
  'pulse', 'breathe', 'float', 'wobble',
  'flip-in', 'swing', 'rubber-band', 'jello', 'heartbeat', 'flash',
];
