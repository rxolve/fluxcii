import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addGroup, addImage } from '../scene.js';
import { getScene, savePrev, getAnimation } from '../store.js';
import { generateFrames, generateBuffers } from '../animate.js';
import { inspectScene } from '../inspect.js';
import { encodeGif } from '../export-gif.js';
import { encodeApng } from '../export-apng.js';
import { createSpritesheet } from '../export-spritesheet.js';
import { generateSpriteSheet, sliceSpriteSheet, removeWhiteBg } from '../gemini.js';
import { sceneToSvg } from '../svg.js';
import { exportVideo } from '../export-video.js';

export function registerExportTools(server: McpServer): void {
  server.tool(
    'export_svg',
    'Export a scene as SVG markup text.',
    {
      scene_id: z.string().describe('Scene ID'),
    },
    async ({ scene_id }) => {
      try {
        const scene = getScene(scene_id);
        const svg = sceneToSvg(scene);
        return { content: [{ type: 'text' as const, text: svg }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

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

  server.tool(
    'export_spritesheet',
    'Export an animation as a single spritesheet PNG. Optionally include JSON atlas metadata (Phaser/PixiJS/Unity compatible).',
    {
      anim_id: z.string().describe('Animation ID'),
      layout: z.enum(['horizontal', 'vertical', 'grid']).optional().describe('Layout (default: horizontal)'),
      columns: z.number().int().min(1).optional().describe('Columns for grid layout (default: sqrt of frame count)'),
      atlas: z.boolean().default(false).describe('Include JSON atlas metadata'),
    },
    async ({ anim_id, layout, columns, atlas }) => {
      try {
        const anim = getAnimation(anim_id);
        const scene = getScene(anim.sceneId);
        const buffers = generateBuffers(scene, anim);
        const result = await createSpritesheet(buffers, scene.width, scene.height, { layout, columns });
        const meta = `Spritesheet: ${result.width}x${result.height} | ${result.columns}x${result.rows} grid | ${result.frameCount} frames (${result.frameWidth}x${result.frameHeight} each)`;

        const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' }> = [
          { type: 'text' as const, text: meta },
        ];

        if (atlas) {
          const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
          for (let i = 0; i < result.frameCount; i++) {
            frames[`frame_${i}`] = {
              frame: {
                x: (i % result.columns) * result.frameWidth,
                y: Math.floor(i / result.columns) * result.frameHeight,
                w: result.frameWidth,
                h: result.frameHeight,
              },
            };
          }
          const atlasJson = {
            frames,
            meta: {
              size: { w: result.width, h: result.height },
              format: 'RGBA8888',
              scale: 1,
              frameCount: result.frameCount,
            },
          };
          content.push({ type: 'text' as const, text: JSON.stringify(atlasJson, null, 2) });
        }

        content.push({
          type: 'image' as const,
          data: result.buffer.toString('base64'),
          mimeType: 'image/png' as const,
        });

        return { content };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'export_video',
    'Export an animation as MP4 or WebM video. Requires ffmpeg installed on the system.',
    {
      anim_id: z.string().describe('Animation ID'),
      format: z.enum(['mp4', 'webm']).default('mp4').describe('Video format'),
      fps: z.number().int().min(1).max(60).default(30).describe('Frames per second'),
      quality: z.number().int().min(1).max(51).default(23).describe('Quality (CRF value, lower = better, 1-51)'),
    },
    async ({ anim_id, format, fps, quality }) => {
      try {
        const anim = getAnimation(anim_id);
        const scene = getScene(anim.sceneId);
        const buffers = generateBuffers(scene, anim);
        const videoBuffer = await exportVideo(buffers, {
          width: scene.width,
          height: scene.height,
          format,
          fps,
          crf: quality,
        });
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        return {
          content: [
            { type: 'text' as const, text: `Exported ${format} video: ${videoBuffer.length} bytes | ${buffers.length} frames @ ${fps}fps` },
            {
              type: 'resource' as const,
              resource: {
                uri: `data:${mimeType};base64,${videoBuffer.toString('base64')}`,
                mimeType,
                text: videoBuffer.toString('base64'),
              },
            } as any,
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

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
}
