// ── Easing ──

export type EasingName =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'bounce'
  | 'elastic'
  | 'back'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'step-start'
  | 'step-end';

export interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ── Animatable properties ──

export type AnimatableProperty =
  | 'transform.translate.x'
  | 'transform.translate.y'
  | 'transform.rotate'
  | 'transform.scale'
  | 'transform.scale.x'
  | 'transform.scale.y'
  | 'style.opacity'
  | 'style.fill'
  | 'style.stroke.color'
  | 'style.stroke.width'
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'cx'
  | 'cy'
  | 'r'
  | 'rx'
  | 'ry'
  | 'x1'
  | 'y1'
  | 'x2'
  | 'y2'
  | 'fontSize';

// ── Keyframe / Track / Animation ──

export interface Keyframe {
  frame: number;
  value: number | string;
  easing?: EasingName | CubicBezier;
}

export interface Track {
  nodeId: string;
  property: AnimatableProperty;
  keyframes: Keyframe[];
  offset?: number;
}

export interface PathTrack {
  nodeId: string;
  path: string;
  keyframes: Keyframe[];
  offset?: number;
}

export type PlaybackMode = 'normal' | 'reverse' | 'pingpong';

export interface Animation {
  id: string;
  sceneId: string;
  totalFrames: number;
  tracks: Track[];
  pathTracks?: PathTrack[];
  delay?: number;
  loop?: boolean;
  mode?: PlaybackMode;
}
