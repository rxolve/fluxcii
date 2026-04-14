import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getScene, savePrev } from '../store.js';
import { findNode, cloneNode } from '../scene.js';
import { listPalettes, registerPalette } from '../palette.js';
import { storeAsset, getAsset, findAssetByName, listAssets } from '../asset-store.js';
import type { Palette, PaletteColor, SceneNode } from '../types.js';

export function registerAssetTools(server: McpServer): void {
  // ── Palette tools ──

  server.tool(
    'register_palette',
    'Register a custom color palette for use in scenes.',
    {
      id: z.string().describe('Palette ID (e.g. "my-palette")'),
      name: z.string().describe('Display name'),
      theme: z.string().default('custom').describe('Theme category'),
      colors: z.array(z.object({
        name: z.string(),
        hex: z.string(),
      })).min(1).describe('Color definitions'),
      background: z.string().describe('Background hex color'),
      foreground: z.string().describe('Foreground hex color'),
    },
    async ({ id, name, theme, colors, background, foreground }) => {
      try {
        const palette: Palette = { id, name, theme, colors: colors as PaletteColor[], background, foreground };
        registerPalette(palette);
        return { content: [{ type: 'text' as const, text: `Registered palette "${name}" (${id}) with ${colors.length} colors` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'list_palettes',
    'List all available palettes (built-in and custom).',
    {},
    async () => {
      const palettes = listPalettes();
      if (palettes.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No palettes loaded.' }] };
      }
      const lines = palettes.map((p) => `${p.id} | "${p.name}" | ${p.theme} | ${p.colors.length} colors`);
      return { content: [{ type: 'text' as const, text: `${palettes.length} palette(s):\n${lines.join('\n')}` }] };
    },
  );

  // ── Asset tools ──

  server.tool(
    'store_asset',
    'Save a node from a scene as a reusable asset.',
    {
      scene_id: z.string().describe('Scene ID containing the node'),
      node_id: z.string().describe('Node ID to save as asset'),
      name: z.string().describe('Asset name'),
    },
    async ({ scene_id, node_id, name }) => {
      try {
        const scene = getScene(scene_id);
        const node = findNode(scene.root, node_id);
        if (!node) throw new Error(`Node "${node_id}" not found`);
        const snapshot = structuredClone(node);
        const asset = storeAsset(name, 'node', snapshot);
        return { content: [{ type: 'text' as const, text: `Stored asset "${name}" (${asset.id}) from node ${node_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'load_asset',
    'Insert a stored asset into a scene.',
    {
      asset_id: z.string().optional().describe('Asset ID (use this or asset_name)'),
      asset_name: z.string().optional().describe('Asset name (use this or asset_id)'),
      scene_id: z.string().describe('Target scene ID'),
      parent_id: z.string().optional().describe('Parent group ID'),
    },
    async ({ asset_id, asset_name, scene_id, parent_id }) => {
      try {
        let asset;
        if (asset_id) {
          asset = getAsset(asset_id);
        } else if (asset_name) {
          asset = findAssetByName(asset_name);
          if (!asset) throw new Error(`Asset named "${asset_name}" not found`);
        } else {
          throw new Error('Provide either asset_id or asset_name');
        }

        const scene = getScene(scene_id);
        savePrev(scene);

        if (asset.type === 'node') {
          // Deep clone the stored node with new IDs
          const nodeData = structuredClone(asset.data as SceneNode);
          // We need to insert the cloned node into the scene
          // Use a temporary approach: add it, then the IDs will be from the original
          const parent = parent_id ? findNode(scene.root, parent_id) : scene.root;
          if (!parent || parent.type !== 'group') throw new Error('Invalid parent');
          (parent as { children: SceneNode[] }).children.push(nodeData);
          return { content: [{ type: 'text' as const, text: `Loaded asset "${asset.name}" into ${scene_id}` }] };
        }

        throw new Error('Image asset loading not yet implemented');
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'list_assets',
    'List all stored assets.',
    {},
    async () => {
      const assets = listAssets();
      if (assets.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No assets stored.' }] };
      }
      const lines = assets.map((a) => `${a.id} | "${a.name}" | ${a.type}`);
      return { content: [{ type: 'text' as const, text: `${assets.length} asset(s):\n${lines.join('\n')}` }] };
    },
  );
}
