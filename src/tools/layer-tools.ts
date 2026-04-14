import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getScene, savePrev } from '../store.js';
import { addLayer, reorderLayers, setLayerProps, findNode } from '../scene.js';
import type { Filter } from '../types.js';

export function registerLayerTools(server: McpServer): void {
  server.tool(
    'add_layer',
    'Create a named layer (a group with visibility/lock/opacity metadata).',
    {
      scene_id: z.string().describe('Scene ID'),
      name: z.string().describe('Layer name'),
    },
    async ({ scene_id, name }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        const layer = addLayer(scene, name);
        return { content: [{ type: 'text' as const, text: `Created layer "${name}" (${layer.id}, group: ${layer.groupId}) in ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'reorder_layers',
    'Change the z-order of layers by providing layer IDs in desired order (bottom to top).',
    {
      scene_id: z.string().describe('Scene ID'),
      layer_ids: z.array(z.string()).describe('Layer IDs in desired order (bottom to top)'),
    },
    async ({ scene_id, layer_ids }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        reorderLayers(scene, layer_ids);
        return { content: [{ type: 'text' as const, text: `Reordered ${layer_ids.length} layers in ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'set_layer_props',
    'Set layer visibility, lock, or opacity.',
    {
      scene_id: z.string().describe('Scene ID'),
      layer_id: z.string().describe('Layer ID'),
      visible: z.boolean().optional().describe('Layer visibility'),
      locked: z.boolean().optional().describe('Lock layer (prevents editing)'),
      opacity: z.number().min(0).max(1).optional().describe('Layer opacity'),
    },
    async ({ scene_id, layer_id, visible, locked, opacity }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        setLayerProps(scene, layer_id, { visible, locked, opacity });
        return { content: [{ type: 'text' as const, text: `Updated layer ${layer_id} in ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'set_filter',
    'Apply blur, drop shadow, or glow effect to a node.',
    {
      scene_id: z.string().describe('Scene ID'),
      node_id: z.string().describe('Node ID'),
      blur: z.number().min(0).optional().describe('Gaussian blur radius'),
      drop_shadow: z.object({
        dx: z.number(),
        dy: z.number(),
        blur: z.number().min(0),
        color: z.string(),
      }).optional().describe('Drop shadow effect'),
      glow: z.object({
        radius: z.number().min(0),
        color: z.string(),
      }).optional().describe('Glow effect'),
    },
    async ({ scene_id, node_id, blur, drop_shadow, glow }) => {
      try {
        const scene = getScene(scene_id);
        savePrev(scene);
        const node = findNode(scene.root, node_id);
        if (!node) throw new Error(`Node "${node_id}" not found`);
        if (!node.style) node.style = {};
        const filter: Filter = {};
        if (blur !== undefined) filter.blur = blur;
        if (drop_shadow) filter.dropShadow = drop_shadow;
        if (glow) filter.glow = glow;
        node.style.filter = filter;
        return { content: [{ type: 'text' as const, text: `Applied filter to node ${node_id} in ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
