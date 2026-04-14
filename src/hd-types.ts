import type { EasingName, CubicBezier } from './animation-types.js';

// ── Animatable properties for HD layers ──

export type HDAnimatableProperty =
  | 'x'
  | 'y'
  | 'opacity'
  | 'scale'
  | 'rotate'
  | 'width'
  | 'height';

// ── Layer ──

export interface HDLayer {
  id: string;
  name: string;
  asset: string;
  buffer?: Buffer;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  rotate: number;
  visible: boolean;
  zIndex: number;
}

// ── Scene ──

export interface HDScene {
  id: string;
  width: number;
  height: number;
  background: string;
  layers: HDLayer[];
}

// ── Keyframe / Track / Animation ──

export interface HDKeyframe {
  frame: number;
  value: number;
  easing?: EasingName | CubicBezier;
}

export interface HDTrack {
  layerId: string;
  property: HDAnimatableProperty;
  keyframes: HDKeyframe[];
  offset?: number;
}

export interface HDAnimation {
  id: string;
  sceneId: string;
  totalFrames: number;
  tracks: HDTrack[];
  delay?: number;
  loop?: boolean;
}

// ── Preset ──

export type HDPresetName =
  | 'fade-in'
  | 'fade-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'slide-in-from-left'
  | 'slide-in-from-right'
  | 'slide-in-from-top'
  | 'slide-in-from-bottom'
  | 'slide-out-to-left'
  | 'slide-out-to-right'
  | 'slide-out-to-top'
  | 'slide-out-to-bottom'
  | 'zoom-in'
  | 'zoom-out'
  | 'pop-in'
  | 'pop-out'
  | 'bounce-in'
  | 'bounce-out'
  | 'spin-cw'
  | 'spin-ccw'
  | 'shake-x'
  | 'shake-y'
  | 'pulse'
  | 'breathe'
  | 'float'
  | 'wobble'
  | 'flip-in'
  | 'swing'
  | 'rubber-band'
  | 'jello'
  | 'heartbeat'
  | 'flash';
