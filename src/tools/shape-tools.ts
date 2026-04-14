import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  addRect, addCircle, addEllipse, addLine, addPolygon, addPath,
  addText, addImage, addGroup, setNodeStyle,
  removeNode, cloneNode, moveNode, updateNode,
} from '../scene.js';
import { getScene, savePrev } from '../store.js';
import type { Style, FillValue } from '../types.js';
import { StyleSchema, TransformSchema, FillSchema, StrokeSchema } from './schemas.js';

export function registerShapeTools(server: McpServer): void {
  server.tool(
    'add_shape',
    'Add a shape (rect, circle, ellipse, line, polygon, path) to an existing scene.',
    {
      scene_id: z.string().describe('Scene ID'),
      type: z.enum(['rect', 'circle', 'ellipse', 'line', 'polygon', 'path']).describe('Shape type'),
      name: z.string().optional().describe('Name for the shape'),
      parent_id: z.string().optional().describe('Parent group ID (default: root)'),
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

  server.tool(
    'remove_node',
    'Remove a node from a scene by ID.',
    {
      scene_id: z.string().describe('Scene ID'),
      node_id: z.string().describe('Node ID to remove'),
    },
    async ({ scene_id, node_id }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        const removed = removeNode(scene, node_id);
        if (!removed) {
          return { content: [{ type: 'text' as const, text: `Node "${node_id}" not found in ${scene_id}` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: `Removed node ${node_id} from ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'clone_node',
    'Deep-clone a node (with new IDs) and add to the scene.',
    {
      scene_id: z.string().describe('Scene ID'),
      node_id: z.string().describe('Node ID to clone'),
      parent_id: z.string().optional().describe('Parent group for the clone (default: same parent)'),
    },
    async ({ scene_id, node_id, parent_id }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        const cloned = cloneNode(scene, node_id, parent_id);
        return { content: [{ type: 'text' as const, text: `Cloned node ${node_id} → ${cloned.id} in ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'move_node',
    'Re-parent or reorder a node within the scene tree.',
    {
      scene_id: z.string().describe('Scene ID'),
      node_id: z.string().describe('Node ID to move'),
      new_parent_id: z.string().describe('New parent group ID (use "root" for root)'),
      index: z.number().int().min(0).optional().describe('Position in parent children array'),
    },
    async ({ scene_id, node_id, new_parent_id, index }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        moveNode(scene, node_id, new_parent_id, index);
        return { content: [{ type: 'text' as const, text: `Moved node ${node_id} to parent ${new_parent_id} in ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'update_node',
    'Partially update node properties (position, size, text, style, transform, etc.).',
    {
      scene_id: z.string().describe('Scene ID'),
      node_id: z.string().describe('Node ID to update'),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      cx: z.number().optional(),
      cy: z.number().optional(),
      r: z.number().optional(),
      rx: z.number().optional(),
      ry: z.number().optional(),
      x1: z.number().optional(),
      y1: z.number().optional(),
      x2: z.number().optional(),
      y2: z.number().optional(),
      d: z.string().optional(),
      text: z.string().optional(),
      fontSize: z.number().optional(),
      fontFamily: z.string().optional(),
      fontWeight: z.string().optional(),
      name: z.string().optional(),
      visible: z.boolean().optional(),
      style: StyleSchema,
      transform: TransformSchema,
    },
    async ({ scene_id, node_id, ...props }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        const filtered = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined));
        updateNode(scene, node_id, filtered);
        return { content: [{ type: 'text' as const, text: `Updated node ${node_id} in ${scene_id} (${Object.keys(filtered).join(', ')})` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
