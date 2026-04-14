import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listScenes, listAnimations, deleteScene, deleteAnimation } from '../store.js';

export function registerManageTools(server: McpServer): void {
  server.tool(
    'list_scenes',
    'List all stored scenes with their dimensions and node counts.',
    {},
    async () => {
      const scenes = listScenes();
      if (scenes.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No scenes stored.' }] };
      }
      const lines = scenes.map((s) => `${s.id} | ${s.width}x${s.height} | ${s.nodeCount} nodes`);
      return { content: [{ type: 'text' as const, text: `${scenes.length} scene(s):\n${lines.join('\n')}` }] };
    },
  );

  server.tool(
    'list_animations',
    'List all stored animations with their scene references and track counts.',
    {},
    async () => {
      const anims = listAnimations();
      if (anims.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No animations stored.' }] };
      }
      const lines = anims.map((a) => `${a.id} | scene: ${a.sceneId} | ${a.totalFrames} frames | ${a.trackCount} tracks`);
      return { content: [{ type: 'text' as const, text: `${anims.length} animation(s):\n${lines.join('\n')}` }] };
    },
  );

  server.tool(
    'delete_scene',
    'Delete a scene by ID.',
    {
      scene_id: z.string().describe('Scene ID to delete'),
    },
    async ({ scene_id }) => {
      const deleted = deleteScene(scene_id);
      if (!deleted) {
        return { content: [{ type: 'text' as const, text: `Scene "${scene_id}" not found.` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: `Deleted scene ${scene_id}` }] };
    },
  );

  server.tool(
    'delete_animation',
    'Delete an animation by ID.',
    {
      anim_id: z.string().describe('Animation ID to delete'),
    },
    async ({ anim_id }) => {
      const deleted = deleteAnimation(anim_id);
      if (!deleted) {
        return { content: [{ type: 'text' as const, text: `Animation "${anim_id}" not found.` }], isError: true };
      }
      return { content: [{ type: 'text' as const, text: `Deleted animation ${anim_id}` }] };
    },
  );
}
