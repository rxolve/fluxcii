import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAnimation } from '../store.js';
import { renderComposition, type CompositionSegment } from '../compose.js';
import { generatePresetTracks, PRESET_NAMES, type PresetName } from '../presets.js';
import { saveProject, loadProject, listProjects } from '../persist.js';
import { encodeGif } from '../export-gif.js';
import type { Animation } from '../animation-types.js';

export function registerComposeTools(server: McpServer): void {
  server.tool(
    'compose_animations',
    'Sequence or overlay multiple animation segments into a single output. Returns frame count.',
    {
      segments: z.array(z.object({
        anim_id: z.string().describe('Animation ID'),
        start_frame: z.number().int().min(0).describe('Start frame (inclusive)'),
        end_frame: z.number().int().min(1).describe('End frame (exclusive)'),
      })).min(1).describe('Animation segments to compose'),
      output_format: z.enum(['gif', 'frames']).default('frames').describe('Output format'),
      delay: z.number().int().min(1).optional().describe('Frame delay in ms for GIF (default: 100)'),
    },
    async ({ segments, output_format, delay }) => {
      try {
        const composition = {
          segments: segments.map((s) => ({
            animId: s.anim_id,
            startFrame: s.start_frame,
            endFrame: s.end_frame,
          })),
        };
        const buffers = renderComposition(composition);

        if (output_format === 'gif') {
          // Need width/height from first animation's scene
          const firstAnim = getAnimation(segments[0].anim_id);
          const { getScene } = await import('../store.js');
          const scene = getScene(firstAnim.sceneId);
          const gifBuffer = await encodeGif(buffers, scene.width, scene.height, { delay: delay ?? 100 });
          return {
            content: [
              { type: 'text' as const, text: `Composed ${buffers.length} frames from ${segments.length} segments` },
              { type: 'image' as const, data: gifBuffer.toString('base64'), mimeType: 'image/gif' as const },
            ],
          };
        }

        return {
          content: [
            { type: 'text' as const, text: `Composed ${buffers.length} frames from ${segments.length} segments` },
            ...buffers.map((buf) => ({
              type: 'image' as const,
              data: buf.toString('base64'),
              mimeType: 'image/png' as const,
            })),
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'apply_preset',
    `Apply a motion preset to a node. Available presets: ${PRESET_NAMES.join(', ')}`,
    {
      anim_id: z.string().describe('Animation ID'),
      node_id: z.string().describe('Node ID to apply preset to'),
      preset: z.enum(PRESET_NAMES as [string, ...string[]]).describe('Preset name'),
      offset: z.number().int().min(0).optional().describe('Frame offset'),
    },
    async ({ anim_id, node_id, preset, offset }) => {
      try {
        const anim = getAnimation(anim_id);
        const tracks = generatePresetTracks(preset as PresetName, {
          nodeId: node_id,
          totalFrames: anim.totalFrames,
          offset,
        });
        anim.tracks.push(...tracks);
        return { content: [{ type: 'text' as const, text: `Applied "${preset}" preset to ${node_id} (${tracks.length} tracks added) in ${anim_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'save_project',
    'Save all scenes and animations to a JSON file on disk.',
    {
      name: z.string().describe('Project name (used as filename)'),
    },
    async ({ name }) => {
      try {
        const filePath = await saveProject(name);
        return { content: [{ type: 'text' as const, text: `Project saved to ${filePath}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'load_project',
    'Load scenes and animations from a saved project file.',
    {
      name: z.string().describe('Project name'),
    },
    async ({ name }) => {
      try {
        const result = await loadProject(name);
        return { content: [{ type: 'text' as const, text: `Loaded project "${name}": ${result.sceneCount} scenes, ${result.animationCount} animations` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'list_projects',
    'List all saved projects on disk.',
    {},
    async () => {
      try {
        const projects = await listProjects();
        if (projects.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No saved projects.' }] };
        }
        return { content: [{ type: 'text' as const, text: `${projects.length} project(s):\n${projects.join('\n')}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
