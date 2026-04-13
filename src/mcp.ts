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
  setNodeStyle,
} from './scene.js';
import { resolveStyle } from './style.js';
import { renderToBase64 } from './render.js';
import { generateSceneId, storeScene, getScene, savePrev } from './store.js';
import { inspectScene } from './inspect.js';
import type { Style, FillValue, Gradient, LinearGradient, RadialGradient, Point } from './types.js';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT, MAX_SCENE_WIDTH, MAX_SCENE_HEIGHT } from './constants.js';

const server = new McpServer({
  name: 'vecscii',
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
  type: 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'path' | 'text' | 'group';
  name?: string;
  x?: number; y?: number; width?: number; height?: number;
  rx?: number; ry?: number;
  cx?: number; cy?: number; r?: number;
  x1?: number; y1?: number; x2?: number; y2?: number;
  points?: { x: number; y: number }[];
  d?: string;
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  style?: z.infer<typeof StyleSchema>;
  transform?: z.infer<typeof TransformSchema>;
  children?: ElementInput[];
}

const ElementSchema: z.ZodType<ElementInput> = z.object({
  type: z.enum(['rect', 'circle', 'ellipse', 'line', 'polygon', 'path', 'text', 'group']),
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

// ── Main ──

async function main() {
  await loadPalettes();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
