#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadPalettes, getPalette, listPalettes } from './palette.js';
import {
  createScene,
  addRect,
  addCircle,
  addEllipse,
  addLine,
  addPolygon,
  addPath,
  addText,
  addGroup,
  addImage,
  setNodeStyle,
} from './scene.js';
import { resolveStyle } from './style.js';
import { renderToBase64 } from './render.js';
import {
  generateSceneId, storeScene, getScene, savePrev,
  generateAnimId, storeAnimation, getAnimation,
} from './store.js';
import { generateFrames, generateBuffers } from './animate.js';
import { encodeGif } from './export-gif.js';
import { encodeApng } from './export-apng.js';
import { createSpritesheet } from './export-spritesheet.js';
import { generateSpriteSheet, sliceSpriteSheet, removeWhiteBg } from './gemini.js';
import type { Animation, Track, PathTrack, Keyframe, AnimatableProperty, EasingName, PlaybackMode } from './animation-types.js';
import { findNode } from './scene.js';
import { inspectScene } from './inspect.js';
import type { Style, FillValue, Gradient, LinearGradient, RadialGradient, Point } from './types.js';
import {
  DEFAULT_WIDTH, DEFAULT_HEIGHT, MAX_SCENE_WIDTH, MAX_SCENE_HEIGHT,
  MAX_ANIMATION_FRAMES, MAX_TRACKS_PER_ANIMATION, DEFAULT_FRAME_DELAY,
} from './constants.js';

const server = new McpServer({
  name: 'fluxcii',
  version: '0.1.0',
});

// ── Zod schemas ──

const GradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
});

const GradientSchema = z.union([
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

const FillSchema = z.union([
  z.string(),
  GradientSchema,
]).describe('Color name, hex, gradient object, or "none"');

const StrokeSchema = z.object({
  color: z.string(),
  width: z.number().positive(),
  dasharray: z.string().optional(),
});

const StyleSchema = z.object({
  fill: FillSchema.optional(),
  stroke: StrokeSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
}).optional();

const TransformSchema = z.object({
  translate: z.object({ x: z.number(), y: z.number() }).optional(),
  rotate: z.number().optional(),
  scale: z.union([z.number(), z.object({ x: z.number(), y: z.number() })]).optional(),
}).optional();

interface ElementInput {
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

const ElementSchema: z.ZodType<ElementInput> = z.object({
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

// ── Helpers ──

function addElement(scene: ReturnType<typeof createScene>, el: ElementInput, parentId?: string): void {
  const common = { name: el.name, style: el.style as Style | undefined, transform: el.transform };
  switch (el.type) {
    case 'rect':
      addRect(scene, { x: el.x ?? 0, y: el.y ?? 0, width: el.width ?? 100, height: el.height ?? 100, rx: el.rx, ry: el.ry, ...common }, parentId);
      break;
    case 'circle':
      addCircle(scene, { cx: el.cx ?? 0, cy: el.cy ?? 0, r: el.r ?? 50, ...common }, parentId);
      break;
    case 'ellipse':
      addEllipse(scene, { cx: el.cx ?? 0, cy: el.cy ?? 0, rx: el.rx ?? 50, ry: el.ry ?? 30, ...common }, parentId);
      break;
    case 'line':
      addLine(scene, { x1: el.x1 ?? 0, y1: el.y1 ?? 0, x2: el.x2 ?? 100, y2: el.y2 ?? 100, ...common }, parentId);
      break;
    case 'polygon':
      addPolygon(scene, { points: el.points ?? [], ...common }, parentId);
      break;
    case 'path':
      addPath(scene, { d: el.d ?? '', ...common }, parentId);
      break;
    case 'text':
      addText(scene, { x: el.x ?? 0, y: el.y ?? 0, text: el.text ?? '', fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, textAnchor: el.textAnchor, ...common }, parentId);
      break;
    case 'image':
      addImage(scene, { x: el.x ?? 0, y: el.y ?? 0, width: el.width ?? 100, height: el.height ?? 100, href: el.href ?? '', ...common }, parentId);
      break;
    case 'group': {
      const g = addGroup(scene, common, parentId);
      if (el.children) {
        for (const child of el.children) {
          addElement(scene, child, g.id);
        }
      }
      break;
    }
  }
}

// ── Tool: create_illustration ──

server.tool(
  'create_illustration',
  'Create a complete vector illustration in one call. Provide dimensions, palette, and elements array.',
  {
    width: z.number().int().min(1).max(MAX_SCENE_WIDTH).default(DEFAULT_WIDTH).describe('Canvas width in pixels'),
    height: z.number().int().min(1).max(MAX_SCENE_HEIGHT).default(DEFAULT_HEIGHT).describe('Canvas height in pixels'),
    background: z.string().optional().describe('Background color (hex or palette name)'),
    palette: z.string().optional().describe('Palette ID (kurz-space, kurz-bio, kurz-tech, kurz-warm)'),
    elements: z.array(ElementSchema).describe('Array of shape/text/group elements'),
  },
  async ({ width, height, background, palette, elements }) => {
    try {
      const id = generateSceneId();
      const scene = createScene(id, width, height, background, palette);
      for (const el of elements) {
        addElement(scene, el);
      }
      storeScene(scene);
      const base64 = renderToBase64(scene);
      const info = inspectScene(scene);
      return {
        content: [
          { type: 'text' as const, text: info },
          { type: 'image' as const, data: base64, mimeType: 'image/png' as const },
        ],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: new_scene ──

server.tool(
  'new_scene',
  'Create an empty scene canvas. Returns scene ID for subsequent add_shape/add_text calls.',
  {
    width: z.number().int().min(1).max(MAX_SCENE_WIDTH).default(DEFAULT_WIDTH).describe('Canvas width'),
    height: z.number().int().min(1).max(MAX_SCENE_HEIGHT).default(DEFAULT_HEIGHT).describe('Canvas height'),
    background: z.string().optional().describe('Background color'),
    palette: z.string().optional().describe('Palette ID'),
  },
  async ({ width, height, background, palette }) => {
    try {
      const id = generateSceneId();
      const scene = createScene(id, width, height, background, palette);
      storeScene(scene);
      const info = inspectScene(scene);
      return { content: [{ type: 'text' as const, text: info }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: add_shape ──

server.tool(
  'add_shape',
  'Add a shape (rect, circle, ellipse, line, polygon, path) to an existing scene.',
  {
    scene_id: z.string().describe('Scene ID'),
    type: z.enum(['rect', 'circle', 'ellipse', 'line', 'polygon', 'path']).describe('Shape type'),
    name: z.string().optional().describe('Name for the shape'),
    parent_id: z.string().optional().describe('Parent group ID (default: root)'),
    // Shape-specific
    x: z.number().optional(), y: z.number().optional(),
    width: z.number().optional(), height: z.number().optional(),
    rx: z.number().optional(), ry: z.number().optional(),
    cx: z.number().optional(), cy: z.number().optional(),
    r: z.number().optional(),
    x1: z.number().optional(), y1: z.number().optional(),
    x2: z.number().optional(), y2: z.number().optional(),
    points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    d: z.string().optional(),
    style: StyleSchema,
    transform: TransformSchema,
  },
  async (args) => {
    try {
      const scene = getScene(args.scene_id);
      savePrev(scene);
      const common = { name: args.name, style: args.style as Style | undefined, transform: args.transform };
      let nodeId: string;
      switch (args.type) {
        case 'rect':
          nodeId = addRect(scene, { x: args.x ?? 0, y: args.y ?? 0, width: args.width ?? 100, height: args.height ?? 100, rx: args.rx, ry: args.ry, ...common }, args.parent_id).id;
          break;
        case 'circle':
          nodeId = addCircle(scene, { cx: args.cx ?? 0, cy: args.cy ?? 0, r: args.r ?? 50, ...common }, args.parent_id).id;
          break;
        case 'ellipse':
          nodeId = addEllipse(scene, { cx: args.cx ?? 0, cy: args.cy ?? 0, rx: args.rx ?? 50, ry: args.ry ?? 30, ...common }, args.parent_id).id;
          break;
        case 'line':
          nodeId = addLine(scene, { x1: args.x1 ?? 0, y1: args.y1 ?? 0, x2: args.x2 ?? 100, y2: args.y2 ?? 100, ...common }, args.parent_id).id;
          break;
        case 'polygon':
          nodeId = addPolygon(scene, { points: args.points ?? [], ...common }, args.parent_id).id;
          break;
        case 'path':
          nodeId = addPath(scene, { d: args.d ?? '', ...common }, args.parent_id).id;
          break;
      }
      return { content: [{ type: 'text' as const, text: `Added ${args.type} "${args.name ?? nodeId!}" (${nodeId!}) to ${args.scene_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: add_text ──

server.tool(
  'add_text',
  'Add a text node to a scene.',
  {
    scene_id: z.string().describe('Scene ID'),
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    text: z.string().describe('Text content'),
    name: z.string().optional().describe('Name for the text node'),
    parent_id: z.string().optional().describe('Parent group ID'),
    fontSize: z.number().optional().describe('Font size in px'),
    fontFamily: z.string().optional().describe('Font family'),
    fontWeight: z.string().optional().describe('Font weight (bold, normal, etc)'),
    textAnchor: z.enum(['start', 'middle', 'end']).optional().describe('Text anchor'),
    style: StyleSchema,
    transform: TransformSchema,
  },
  async (args) => {
    try {
      const scene = getScene(args.scene_id);
      savePrev(scene);
      const node = addText(scene, {
        x: args.x, y: args.y, text: args.text,
        fontSize: args.fontSize, fontFamily: args.fontFamily,
        fontWeight: args.fontWeight, textAnchor: args.textAnchor,
        name: args.name, style: args.style as Style | undefined, transform: args.transform,
      }, args.parent_id);
      return { content: [{ type: 'text' as const, text: `Added text "${args.name ?? node.id}" (${node.id}) to ${args.scene_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: add_image ──

server.tool(
  'add_image',
  'Add a raster image (PNG/JPEG) to a scene. Provide raw base64 image data.',
  {
    scene_id: z.string().describe('Scene ID'),
    image_data: z.string().describe('Raw base64-encoded image data'),
    mime_type: z.enum(['image/png', 'image/jpeg']).default('image/png').describe('Image MIME type'),
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    width: z.number().describe('Display width'),
    height: z.number().describe('Display height'),
    name: z.string().optional().describe('Name for the image node'),
    parent_id: z.string().optional().describe('Parent group ID'),
    style: StyleSchema,
    transform: TransformSchema,
  },
  async (args) => {
    try {
      const scene = getScene(args.scene_id);
      savePrev(scene);
      const href = `data:${args.mime_type};base64,${args.image_data}`;
      const node = addImage(scene, {
        x: args.x, y: args.y, width: args.width, height: args.height,
        href, name: args.name, style: args.style as Style | undefined, transform: args.transform,
      }, args.parent_id);
      return { content: [{ type: 'text' as const, text: `Added image "${args.name ?? node.id}" (${node.id}) to ${args.scene_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: add_group ──

server.tool(
  'add_group',
  'Create a group container for organizing shapes.',
  {
    scene_id: z.string().describe('Scene ID'),
    name: z.string().optional().describe('Name for the group'),
    parent_id: z.string().optional().describe('Parent group ID'),
    style: StyleSchema,
    transform: TransformSchema,
  },
  async (args) => {
    try {
      const scene = getScene(args.scene_id);
      savePrev(scene);
      const node = addGroup(scene, {
        name: args.name, style: args.style as Style | undefined, transform: args.transform,
      }, args.parent_id);
      return { content: [{ type: 'text' as const, text: `Created group "${args.name ?? node.id}" (${node.id}) in ${args.scene_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: set_style ──

server.tool(
  'set_style',
  'Set fill, stroke, and/or opacity on a node by ID.',
  {
    scene_id: z.string().describe('Scene ID'),
    node_id: z.string().describe('Node ID to style'),
    fill: FillSchema.optional(),
    stroke: StrokeSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
  },
  async (args) => {
    try {
      const scene = getScene(args.scene_id);
      savePrev(scene);
      const style: Style = {};
      if (args.fill !== undefined) style.fill = args.fill as FillValue;
      if (args.stroke !== undefined) style.stroke = args.stroke;
      if (args.opacity !== undefined) style.opacity = args.opacity;
      setNodeStyle(scene, args.node_id, style);
      return { content: [{ type: 'text' as const, text: `Styled node ${args.node_id} in ${args.scene_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: inspect ──

server.tool(
  'inspect',
  'Get a text representation of the scene tree for reasoning about layout.',
  {
    scene_id: z.string().describe('Scene ID'),
  },
  async ({ scene_id }) => {
    try {
      const scene = getScene(scene_id);
      const info = inspectScene(scene);
      return { content: [{ type: 'text' as const, text: info }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: render ──

server.tool(
  'render',
  'Render a scene to PNG image.',
  {
    scene_id: z.string().describe('Scene ID'),
  },
  async ({ scene_id }) => {
    try {
      const scene = getScene(scene_id);
      const base64 = renderToBase64(scene);
      const info = inspectScene(scene);
      return {
        content: [
          { type: 'text' as const, text: info },
          { type: 'image' as const, data: base64, mimeType: 'image/png' as const },
        ],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Animation Zod schemas ──

const EasingNameSchema = z.enum([
  'linear', 'ease-in', 'ease-out', 'ease-in-out',
  'ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic',
]).optional().describe('Easing function (default: linear)');

const AnimatablePropertySchema = z.enum([
  'transform.translate.x', 'transform.translate.y',
  'transform.rotate', 'transform.scale', 'transform.scale.x', 'transform.scale.y',
  'style.opacity', 'style.fill', 'style.stroke.color', 'style.stroke.width',
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
  'x1', 'y1', 'x2', 'y2', 'fontSize',
]).describe('Property to animate');

const KeyframeSchema = z.object({
  frame: z.number().int().min(0).describe('Frame number'),
  value: z.union([z.number(), z.string()]).describe('Value at this keyframe'),
  easing: EasingNameSchema,
});

const PlaybackModeSchema = z.enum(['normal', 'reverse', 'pingpong']).optional()
  .describe('Playback mode (default: normal)');

const TrackSchema = z.object({
  node_name: z.string().describe('Name of the element to animate (matches element name)'),
  property: AnimatablePropertySchema,
  keyframes: z.array(KeyframeSchema).min(1).describe('Keyframe values'),
  offset: z.number().int().min(0).optional().describe('Frame offset (delays this track by N frames)'),
});

// ── Tool: animate_illustration ──

server.tool(
  'animate_illustration',
  'Create an animated illustration in one call. Provide elements and animation tracks. Returns PNG frames.',
  {
    width: z.number().int().min(1).max(MAX_SCENE_WIDTH).default(DEFAULT_WIDTH).describe('Canvas width'),
    height: z.number().int().min(1).max(MAX_SCENE_HEIGHT).default(DEFAULT_HEIGHT).describe('Canvas height'),
    background: z.string().optional().describe('Background color'),
    palette: z.string().optional().describe('Palette ID'),
    elements: z.array(ElementSchema).describe('Array of shape/text/group elements'),
    total_frames: z.number().int().min(1).max(MAX_ANIMATION_FRAMES).describe('Total number of frames'),
    tracks: z.array(TrackSchema).max(MAX_TRACKS_PER_ANIMATION).describe('Animation tracks (use node_name to reference elements)'),
    delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
    loop: z.boolean().optional().describe('Loop animation (default: true)'),
    mode: PlaybackModeSchema,
  },
  async ({ width, height, background, palette, elements, total_frames, tracks, delay, loop, mode }) => {
    try {
      const id = generateSceneId();
      const scene = createScene(id, width, height, background, palette);
      for (const el of elements) {
        addElement(scene, el);
      }
      storeScene(scene);

      // Resolve node_name → nodeId by searching the scene tree
      const resolvedTracks: Track[] = [];
      for (const t of tracks) {
        const node = findNodeByName(scene.root, t.node_name);
        if (!node) throw new Error(`Element with name "${t.node_name}" not found`);
        resolvedTracks.push({
          nodeId: node.id,
          property: t.property as AnimatableProperty,
          keyframes: t.keyframes.map((kf) => ({
            frame: kf.frame,
            value: kf.value,
            easing: kf.easing as EasingName | undefined,
          })),
          offset: t.offset,
        });
      }

      const animation: Animation = {
        id: generateAnimId(),
        sceneId: scene.id,
        totalFrames: total_frames,
        tracks: resolvedTracks,
        delay,
        loop,
        mode: mode as PlaybackMode | undefined,
      };
      storeAnimation(animation);

      const frames = generateFrames(scene, animation);
      const info = inspectScene(scene);
      return {
        content: [
          { type: 'text' as const, text: `${info}\n\nAnimation: ${animation.id} | ${total_frames} frames | ${resolvedTracks.length} tracks` },
          ...frames.map((data) => ({
            type: 'image' as const,
            data,
            mimeType: 'image/png' as const,
          })),
        ],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: create_animation ──

server.tool(
  'create_animation',
  'Create an animation for an existing scene. Returns animation ID for add_track calls.',
  {
    scene_id: z.string().describe('Scene ID'),
    total_frames: z.number().int().min(1).max(MAX_ANIMATION_FRAMES).describe('Total number of frames'),
    delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
    loop: z.boolean().optional().describe('Loop animation (default: true)'),
    mode: PlaybackModeSchema,
  },
  async ({ scene_id, total_frames, delay, loop, mode }) => {
    try {
      getScene(scene_id); // validate scene exists
      const anim: Animation = {
        id: generateAnimId(),
        sceneId: scene_id,
        totalFrames: total_frames,
        tracks: [],
        delay,
        loop,
        mode: mode as PlaybackMode | undefined,
      };
      storeAnimation(anim);
      return { content: [{ type: 'text' as const, text: `Created animation ${anim.id} for scene ${scene_id} (${total_frames} frames)` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: add_track ──

server.tool(
  'add_track',
  'Add an animation track to an existing animation. Each track animates one property on one node.',
  {
    anim_id: z.string().describe('Animation ID'),
    node_id: z.string().describe('Node ID to animate'),
    property: AnimatablePropertySchema,
    keyframes: z.array(KeyframeSchema).min(1).describe('Keyframe values'),
    offset: z.number().int().min(0).optional().describe('Frame offset (delays this track by N frames)'),
  },
  async ({ anim_id, node_id, property, keyframes, offset }) => {
    try {
      const anim = getAnimation(anim_id);
      if (anim.tracks.length >= MAX_TRACKS_PER_ANIMATION) {
        throw new Error(`Animation has reached max track limit (${MAX_TRACKS_PER_ANIMATION})`);
      }
      // Validate node exists in scene
      const scene = getScene(anim.sceneId);
      if (node_id !== 'root' && !findNode(scene.root, node_id)) {
        throw new Error(`Node "${node_id}" not found in scene ${anim.sceneId}`);
      }
      const track: Track = {
        nodeId: node_id,
        property: property as AnimatableProperty,
        keyframes: keyframes.map((kf) => ({
          frame: kf.frame,
          value: kf.value,
          easing: kf.easing as EasingName | undefined,
        })),
        offset,
      };
      anim.tracks.push(track);
      return { content: [{ type: 'text' as const, text: `Added track: ${node_id}.${property} (${keyframes.length} keyframes) to ${anim_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: add_path_track ──

server.tool(
  'add_path_track',
  'Add a path animation track. The node moves along an SVG path (M/L/C/Z). Keyframes control progress (0-1) along the path.',
  {
    anim_id: z.string().describe('Animation ID'),
    node_id: z.string().describe('Node ID to animate along path'),
    path: z.string().describe('SVG path d attribute (M, L, C, Z commands)'),
    keyframes: z.array(KeyframeSchema).min(1).describe('Keyframes with progress values (0-1)'),
    offset: z.number().int().min(0).optional().describe('Frame offset (delays this track by N frames)'),
  },
  async ({ anim_id, node_id, path, keyframes, offset }) => {
    try {
      const anim = getAnimation(anim_id);
      const scene = getScene(anim.sceneId);
      if (node_id !== 'root' && !findNode(scene.root, node_id)) {
        throw new Error(`Node "${node_id}" not found in scene ${anim.sceneId}`);
      }
      const pathTrack: PathTrack = {
        nodeId: node_id,
        path,
        keyframes: keyframes.map((kf) => ({
          frame: kf.frame,
          value: kf.value,
          easing: kf.easing as EasingName | undefined,
        })),
        offset,
      };
      if (!anim.pathTracks) anim.pathTracks = [];
      anim.pathTracks.push(pathTrack);
      return { content: [{ type: 'text' as const, text: `Added path track for ${node_id} (${keyframes.length} keyframes) to ${anim_id}` }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: render_animation ──

server.tool(
  'render_animation',
  'Render all frames of an animation to PNG images.',
  {
    anim_id: z.string().describe('Animation ID'),
  },
  async ({ anim_id }) => {
    try {
      const anim = getAnimation(anim_id);
      const scene = getScene(anim.sceneId);
      const frames = generateFrames(scene, anim);
      const info = inspectScene(scene);
      return {
        content: [
          { type: 'text' as const, text: `${info}\n\nAnimation: ${anim.id} | ${anim.totalFrames} frames | ${anim.tracks.length} tracks` },
          ...frames.map((data) => ({
            type: 'image' as const,
            data,
            mimeType: 'image/png' as const,
          })),
        ],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: export_gif ──

server.tool(
  'export_gif',
  'Export an animation as a single animated GIF.',
  {
    anim_id: z.string().describe('Animation ID'),
    delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
    loop: z.boolean().optional().describe('Loop animation (default: true)'),
  },
  async ({ anim_id, delay, loop }) => {
    try {
      const anim = getAnimation(anim_id);
      const scene = getScene(anim.sceneId);
      const buffers = generateBuffers(scene, anim);
      const gifBuffer = await encodeGif(buffers, scene.width, scene.height, {
        delay: delay ?? anim.delay,
        loop: loop ?? anim.loop,
      });
      return {
        content: [{
          type: 'image' as const,
          data: gifBuffer.toString('base64'),
          mimeType: 'image/gif' as const,
        }],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: export_apng ──

server.tool(
  'export_apng',
  'Export an animation as a single animated PNG (APNG).',
  {
    anim_id: z.string().describe('Animation ID'),
    delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
  },
  async ({ anim_id, delay }) => {
    try {
      const anim = getAnimation(anim_id);
      const scene = getScene(anim.sceneId);
      const buffers = generateBuffers(scene, anim);
      const apngBuffer = await encodeApng(buffers, {
        delay: delay ?? anim.delay,
      });
      return {
        content: [{
          type: 'image' as const,
          data: apngBuffer.toString('base64'),
          mimeType: 'image/png' as const,
        }],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: export_spritesheet ──

server.tool(
  'export_spritesheet',
  'Export an animation as a single spritesheet PNG. Tiles all frames in a grid.',
  {
    anim_id: z.string().describe('Animation ID'),
    layout: z.enum(['horizontal', 'vertical', 'grid']).optional().describe('Layout (default: horizontal)'),
    columns: z.number().int().min(1).optional().describe('Columns for grid layout (default: sqrt of frame count)'),
  },
  async ({ anim_id, layout, columns }) => {
    try {
      const anim = getAnimation(anim_id);
      const scene = getScene(anim.sceneId);
      const buffers = generateBuffers(scene, anim);
      const result = await createSpritesheet(buffers, scene.width, scene.height, { layout, columns });
      const meta = `Spritesheet: ${result.width}x${result.height} | ${result.columns}x${result.rows} grid | ${result.frameCount} frames (${result.frameWidth}x${result.frameHeight} each)`;
      return {
        content: [
          { type: 'text' as const, text: meta },
          {
            type: 'image' as const,
            data: result.buffer.toString('base64'),
            mimeType: 'image/png' as const,
          },
        ],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Tool: generate_sprite ──

server.tool(
  'generate_sprite',
  'Generate an AI sprite sheet via Gemini, auto-slice into frames, and add to scene. Requires GEMINI_API_KEY env var.',
  {
    scene_id: z.string().describe('Target scene ID'),
    prompt: z.string().describe('Character/sprite description (e.g. "a running pixel art cat")'),
    frames: z.number().int().min(1).max(12).default(6).describe('Number of animation frames'),
    x: z.number().describe('X position'),
    y: z.number().describe('Y position'),
    width: z.number().describe('Display width per frame'),
    height: z.number().describe('Display height per frame'),
    name: z.string().optional().describe('Base name for the sprite group'),
    parent_id: z.string().optional().describe('Parent group ID'),
    remove_background: z.boolean().default(true).describe('Remove white background from sprites'),
  },
  async (args) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set. Set it to your Google AI API key.');
      }

      const scene = getScene(args.scene_id);
      savePrev(scene);

      const baseName = args.name ?? 'sprite';

      // 1. Generate sprite sheet
      const sheetBuffer = await generateSpriteSheet(args.prompt, args.frames, apiKey);

      // 2. Slice into frames
      let frameBufs = await sliceSpriteSheet(sheetBuffer, args.frames);

      // 3. Optionally remove white background
      if (args.remove_background) {
        frameBufs = await Promise.all(frameBufs.map(removeWhiteBg));
      }

      // 4. Create group
      const group = addGroup(scene, { name: `${baseName}-sprites` }, args.parent_id);

      // 5. Add each frame as image node
      const frameIds: string[] = [];
      for (let i = 0; i < frameBufs.length; i++) {
        const href = `data:image/png;base64,${frameBufs[i].toString('base64')}`;
        const node = addImage(scene, {
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          href,
          name: `${baseName}-${i}`,
          style: { opacity: i === 0 ? 1 : 0 },
        }, group.id);
        frameIds.push(node.id);
      }

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Generated ${frameBufs.length}-frame sprite "${baseName}" in ${args.scene_id}`,
            `Group: ${group.id} (${baseName}-sprites)`,
            `Frames: ${frameIds.join(', ')}`,
            `Frame 0 visible (opacity 1), others hidden (opacity 0).`,
            `Use add_track with style.opacity keyframes to animate frame cycling.`,
          ].join('\n'),
        }],
      };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  },
);

// ── Helper: find node by name ──

function findNodeByName(root: import('./types.js').GroupNode, name: string): import('./types.js').SceneNode | null {
  for (const child of root.children) {
    if (child.name === name) return child;
    if (child.type === 'group') {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

// ── Main ──

async function main() {
  await loadPalettes();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
