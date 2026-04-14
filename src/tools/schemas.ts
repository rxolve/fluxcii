import { z } from 'zod';

// ── Element schemas ──

export const GradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
});

export const GradientSchema = z.union([
  z.object({
    type: z.literal('linear'),
    angle: z.number().default(90),
    stops: z.array(GradientStopSchema).min(2),
  }),
  z.object({
    type: z.literal('radial'),
    cx: z.number().default(0.5),
    cy: z.number().default(0.5),
    r: z.number().default(0.5),
    stops: z.array(GradientStopSchema).min(2),
  }),
]);

export const FillSchema = z.union([
  z.string(),
  GradientSchema,
]).describe('Color name, hex, gradient object, or "none"');

export const StrokeSchema = z.object({
  color: z.string(),
  width: z.number().positive(),
  dasharray: z.string().optional(),
});

export const StyleSchema = z.object({
  fill: FillSchema.optional(),
  stroke: StrokeSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
}).optional();

export const TransformSchema = z.object({
  translate: z.object({ x: z.number(), y: z.number() }).optional(),
  rotate: z.number().optional(),
  scale: z.union([z.number(), z.object({ x: z.number(), y: z.number() })]).optional(),
}).optional();

export interface ElementInput {
  type: 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'path' | 'text' | 'image' | 'group';
  name?: string;
  x?: number; y?: number; width?: number; height?: number;
  rx?: number; ry?: number;
  cx?: number; cy?: number; r?: number;
  x1?: number; y1?: number; x2?: number; y2?: number;
  points?: { x: number; y: number }[];
  d?: string;
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  href?: string;
  style?: z.infer<typeof StyleSchema>;
  transform?: z.infer<typeof TransformSchema>;
  children?: ElementInput[];
}

export const ElementSchema: z.ZodType<ElementInput> = z.object({
  type: z.enum(['rect', 'circle', 'ellipse', 'line', 'polygon', 'path', 'text', 'image', 'group']),
  name: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rx: z.number().optional(),
  ry: z.number().optional(),
  cx: z.number().optional(),
  cy: z.number().optional(),
  r: z.number().optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  d: z.string().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  textAnchor: z.enum(['start', 'middle', 'end']).optional(),
  href: z.string().optional(),
  style: StyleSchema,
  transform: TransformSchema,
  children: z.array(z.lazy(() => ElementSchema)).optional(),
});

// ── Animation schemas ──

const CubicBezierSchema = z.object({
  x1: z.number().min(0).max(1),
  y1: z.number(),
  x2: z.number().min(0).max(1),
  y2: z.number(),
}).describe('Custom cubic-bezier curve control points');

export const EasingNameSchema = z.union([
  z.enum([
    'linear', 'ease-in', 'ease-out', 'ease-in-out',
    'ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic',
    'bounce', 'elastic', 'back',
    'ease-in-expo', 'ease-out-expo',
    'step-start', 'step-end',
  ]),
  CubicBezierSchema,
]).optional().describe('Easing function name or cubic-bezier {x1,y1,x2,y2} (default: linear)');

export const AnimatablePropertySchema = z.enum([
  'transform.translate.x', 'transform.translate.y',
  'transform.rotate', 'transform.scale', 'transform.scale.x', 'transform.scale.y',
  'style.opacity', 'style.fill', 'style.stroke.color', 'style.stroke.width',
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
  'x1', 'y1', 'x2', 'y2', 'fontSize',
]).describe('Property to animate');

export const KeyframeSchema = z.object({
  frame: z.number().int().min(0).describe('Frame number'),
  value: z.union([z.number(), z.string()]).describe('Value at this keyframe'),
  easing: EasingNameSchema,
});

export const PlaybackModeSchema = z.enum(['normal', 'reverse', 'pingpong']).optional()
  .describe('Playback mode (default: normal)');

export const TrackSchema = z.object({
  node_name: z.string().describe('Name of the element to animate (matches element name)'),
  property: AnimatablePropertySchema,
  keyframes: z.array(KeyframeSchema).min(1).describe('Keyframe values'),
  offset: z.number().int().min(0).optional().describe('Frame offset (delays this track by N frames)'),
});
