import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { HDKeyframe, HDTrack } from '../hd-types.js';
import {
  generateHDSceneId,
  storeHDScene,
  getHDScene,
  generateHDAnimId,
  storeHDAnimation,
  getHDAnimation,
  listHDScenes,
  listHDAnimations,
  deleteHDScene,
  deleteHDAnimation,
} from '../hd-store.js';
import { renderHDScene, renderHDSceneBase64 } from '../hd-render.js';
import { generateHDBuffers, generateHDFrames } from '../hd-animate.js';
import { generateHDPresetTracks, HD_PRESET_NAMES } from '../hd-presets.js';
import { encodeGif } from '../export-gif.js';
import { exportVideo } from '../export-video.js';
import {
  HD_MAX_SCENE_WIDTH,
  HD_MAX_SCENE_HEIGHT,
  HD_DEFAULT_WIDTH,
  HD_DEFAULT_HEIGHT,
  HD_MAX_ANIMATION_FRAMES,
  HD_MAX_TRACKS_PER_ANIMATION,
  HD_MAX_LAYERS_PER_SCENE,
} from '../constants.js';

// ── Zod schemas ──

const KeyframeSchema = z.object({
  frame: z.number().int().min(0),
  value: z.number(),
  easing: z.union([
    z.enum([
      'linear', 'ease-in', 'ease-out', 'ease-in-out',
      'ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic',
      'bounce', 'elastic', 'back',
      'ease-in-expo', 'ease-out-expo',
      'step-start', 'step-end',
    ]),
    z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }),
  ]).optional(),
});

const HDAnimatablePropertySchema = z.enum([
  'x', 'y', 'opacity', 'scale', 'rotate', 'width', 'height',
]);

export function registerHDTools(server: McpServer): void {

  // ── Scene CRUD ──

  server.tool(
    'hd_create_scene',
    'Create an HD compositing scene with a background color. Returns scene ID.',
    {
      width: z.number().int().min(1).max(HD_MAX_SCENE_WIDTH).default(HD_DEFAULT_WIDTH).describe('Canvas width'),
      height: z.number().int().min(1).max(HD_MAX_SCENE_HEIGHT).default(HD_DEFAULT_HEIGHT).describe('Canvas height'),
      background: z.string().default('#000000').describe('Background hex color'),
    },
    async ({ width, height, background }) => {
      try {
        const id = generateHDSceneId();
        storeHDScene({ id, width, height, background, layers: [] });
        return { content: [{ type: 'text' as const, text: `Created HD scene: ${id} (${width}x${height})` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_add_layer',
    'Add a PNG layer to an HD scene. Provide base64-encoded PNG data.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      name: z.string().describe('Layer name'),
      asset: z.string().default('').describe('Asset name/ID reference'),
      data: z.string().describe('Base64-encoded PNG data'),
      x: z.number().default(0).describe('X position'),
      y: z.number().default(0).describe('Y position'),
      width: z.number().int().min(1).describe('Display width'),
      height: z.number().int().min(1).describe('Display height'),
      opacity: z.number().min(0).max(1).default(1).describe('Opacity (0-1)'),
      scale: z.number().min(0).default(1).describe('Scale factor'),
      rotate: z.number().default(0).describe('Rotation in degrees'),
      visible: z.boolean().default(true).describe('Visibility'),
      zIndex: z.number().int().default(0).describe('Z-index for layer ordering'),
    },
    async ({ scene_id, name, asset, data, x, y, width, height, opacity, scale, rotate, visible, zIndex }) => {
      try {
        const scene = getHDScene(scene_id);
        if (scene.layers.length >= HD_MAX_LAYERS_PER_SCENE) {
          throw new Error(`Max layers (${HD_MAX_LAYERS_PER_SCENE}) reached`);
        }
        const id = `layer-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}`;
        const buffer = Buffer.from(data, 'base64');
        scene.layers.push({ id, name, asset, buffer, x, y, width, height, opacity, scale, rotate, visible, zIndex });
        return { content: [{ type: 'text' as const, text: `Added layer "${name}" (${id}) to ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_update_layer',
    'Update properties of an existing HD layer.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      layer_id: z.string().describe('Layer ID'),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().int().min(1).optional(),
      height: z.number().int().min(1).optional(),
      opacity: z.number().min(0).max(1).optional(),
      scale: z.number().min(0).optional(),
      rotate: z.number().optional(),
      visible: z.boolean().optional(),
      zIndex: z.number().int().optional(),
      name: z.string().optional(),
    },
    async ({ scene_id, layer_id, ...updates }) => {
      try {
        const scene = getHDScene(scene_id);
        const layer = scene.layers.find((l) => l.id === layer_id);
        if (!layer) throw new Error(`Layer "${layer_id}" not found`);
        for (const [key, val] of Object.entries(updates)) {
          if (val !== undefined) (layer as any)[key] = val;
        }
        return { content: [{ type: 'text' as const, text: `Updated layer "${layer_id}"` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_remove_layer',
    'Remove a layer from an HD scene.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      layer_id: z.string().describe('Layer ID to remove'),
    },
    async ({ scene_id, layer_id }) => {
      try {
        const scene = getHDScene(scene_id);
        const idx = scene.layers.findIndex((l) => l.id === layer_id);
        if (idx === -1) throw new Error(`Layer "${layer_id}" not found`);
        scene.layers.splice(idx, 1);
        return { content: [{ type: 'text' as const, text: `Removed layer "${layer_id}" from ${scene_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ── Animation CRUD ──

  server.tool(
    'hd_create_animation',
    'Create an HD animation for a scene.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      totalFrames: z.number().int().min(1).max(HD_MAX_ANIMATION_FRAMES).describe('Total frames'),
      delay: z.number().int().min(1).optional().describe('Frame delay in ms'),
      loop: z.boolean().optional().describe('Loop animation'),
    },
    async ({ scene_id, totalFrames, delay, loop }) => {
      try {
        getHDScene(scene_id); // validate scene exists
        const id = generateHDAnimId();
        storeHDAnimation({ id, sceneId: scene_id, totalFrames, tracks: [], delay, loop });
        return { content: [{ type: 'text' as const, text: `Created HD animation: ${id} (${totalFrames} frames)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_add_track',
    'Add an animation track to an HD animation.',
    {
      anim_id: z.string().describe('HD Animation ID'),
      layer_id: z.string().describe('Target layer ID'),
      property: HDAnimatablePropertySchema.describe('Property to animate'),
      keyframes: z.array(KeyframeSchema).min(1).describe('Keyframes'),
      offset: z.number().int().min(0).optional().describe('Frame offset'),
    },
    async ({ anim_id, layer_id, property, keyframes, offset }) => {
      try {
        const anim = getHDAnimation(anim_id);
        if (anim.tracks.length >= HD_MAX_TRACKS_PER_ANIMATION) {
          throw new Error(`Max tracks (${HD_MAX_TRACKS_PER_ANIMATION}) reached`);
        }
        const sorted = [...keyframes].sort((a, b) => a.frame - b.frame) as HDKeyframe[];
        anim.tracks.push({ layerId: layer_id, property, keyframes: sorted, offset });
        return { content: [{ type: 'text' as const, text: `Added track: ${property} on ${layer_id} (${keyframes.length} keyframes)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_apply_preset',
    `Apply a motion preset to a layer. Available: ${HD_PRESET_NAMES.join(', ')}`,
    {
      anim_id: z.string().describe('HD Animation ID'),
      layer_id: z.string().describe('Target layer ID'),
      preset: z.enum(HD_PRESET_NAMES as [string, ...string[]]).describe('Preset name'),
      offset: z.number().int().min(0).optional().describe('Frame offset'),
    },
    async ({ anim_id, layer_id, preset, offset }) => {
      try {
        const anim = getHDAnimation(anim_id);
        const scene = getHDScene(anim.sceneId);
        const tracks = generateHDPresetTracks(preset as any, {
          layerId: layer_id,
          totalFrames: anim.totalFrames,
          offset,
          sceneWidth: scene.width,
          sceneHeight: scene.height,
        });
        for (const t of tracks) {
          if (anim.tracks.length >= HD_MAX_TRACKS_PER_ANIMATION) break;
          anim.tracks.push(t);
        }
        return { content: [{ type: 'text' as const, text: `Applied preset "${preset}" to ${layer_id} (${tracks.length} tracks)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ── Render + Export ──

  server.tool(
    'hd_render_scene',
    'Render the current state of an HD scene as PNG.',
    {
      scene_id: z.string().describe('HD Scene ID'),
    },
    async ({ scene_id }) => {
      try {
        const scene = getHDScene(scene_id);
        const base64 = await renderHDSceneBase64(scene);
        return {
          content: [
            { type: 'text' as const, text: `Rendered HD scene: ${scene_id} (${scene.width}x${scene.height}, ${scene.layers.length} layers)` },
            { type: 'image' as const, data: base64, mimeType: 'image/png' as const },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_render_frames',
    'Render all frames of an HD animation as PNGs.',
    {
      anim_id: z.string().describe('HD Animation ID'),
    },
    async ({ anim_id }) => {
      try {
        const anim = getHDAnimation(anim_id);
        const scene = getHDScene(anim.sceneId);
        const frames = await generateHDFrames(scene, anim);
        return {
          content: [
            { type: 'text' as const, text: `HD Animation: ${anim.id} | ${anim.totalFrames} frames | ${anim.tracks.length} tracks` },
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
    'hd_export_gif',
    'Export an HD animation as an animated GIF.',
    {
      anim_id: z.string().describe('HD Animation ID'),
      delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
      loop: z.boolean().optional().describe('Loop (default: true)'),
    },
    async ({ anim_id, delay, loop }) => {
      try {
        const anim = getHDAnimation(anim_id);
        const scene = getHDScene(anim.sceneId);
        const buffers = await generateHDBuffers(scene, anim);
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
    'hd_export_video',
    'Export an HD animation as MP4 or WebM video. Requires ffmpeg.',
    {
      anim_id: z.string().describe('HD Animation ID'),
      format: z.enum(['mp4', 'webm']).default('mp4').describe('Video format'),
      fps: z.number().int().min(1).max(60).default(30).describe('Frames per second'),
      quality: z.number().int().min(1).max(51).default(23).describe('Quality (CRF, lower = better)'),
    },
    async ({ anim_id, format, fps, quality }) => {
      try {
        const anim = getHDAnimation(anim_id);
        const scene = getHDScene(anim.sceneId);
        const buffers = await generateHDBuffers(scene, anim);
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
            { type: 'text' as const, text: `Exported HD ${format}: ${videoBuffer.length} bytes | ${buffers.length} frames @ ${fps}fps` },
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

  // ── Management ──

  server.tool(
    'hd_list_scenes',
    'List all HD scenes.',
    {},
    async () => {
      const scenes = listHDScenes();
      if (scenes.length === 0) return { content: [{ type: 'text' as const, text: 'No HD scenes' }] };
      const text = scenes.map((s) => `${s.id}: ${s.width}x${s.height} (${s.layerCount} layers)`).join('\n');
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  server.tool(
    'hd_list_animations',
    'List all HD animations.',
    {},
    async () => {
      const anims = listHDAnimations();
      if (anims.length === 0) return { content: [{ type: 'text' as const, text: 'No HD animations' }] };
      const text = anims.map((a) => `${a.id}: scene=${a.sceneId} frames=${a.totalFrames} tracks=${a.trackCount}`).join('\n');
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  server.tool(
    'hd_delete_scene',
    'Delete an HD scene.',
    { scene_id: z.string().describe('HD Scene ID') },
    async ({ scene_id }) => {
      const ok = deleteHDScene(scene_id);
      return { content: [{ type: 'text' as const, text: ok ? `Deleted ${scene_id}` : `Scene "${scene_id}" not found` }] };
    },
  );

  server.tool(
    'hd_delete_animation',
    'Delete an HD animation.',
    { anim_id: z.string().describe('HD Animation ID') },
    async ({ anim_id }) => {
      const ok = deleteHDAnimation(anim_id);
      return { content: [{ type: 'text' as const, text: ok ? `Deleted ${anim_id}` : `Animation "${anim_id}" not found` }] };
    },
  );
}
