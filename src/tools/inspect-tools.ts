import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { renderToBase64 } from '../render.js';
import { getScene } from '../store.js';
import { inspectScene } from '../inspect.js';

export function registerInspectTools(server: McpServer): void {
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
}
