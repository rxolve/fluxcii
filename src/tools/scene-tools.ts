import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createScene } from '../scene.js';
import { renderToBase64 } from '../render.js';
import { generateSceneId, storeScene } from '../store.js';
import { inspectScene } from '../inspect.js';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT, MAX_SCENE_WIDTH, MAX_SCENE_HEIGHT } from '../constants.js';
import { ElementSchema } from './schemas.js';
import { addElement } from './helpers.js';

export function registerSceneTools(server: McpServer): void {
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
}
