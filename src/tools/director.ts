import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import sharp from 'sharp';
import { getHDScene, getHDAnimation, generateHDSceneId, storeHDScene, generateHDAnimId, storeHDAnimation } from '../hd-store.js';
import { placeAsset, setBackground, animateLayer, addTextLabel, describeScene, findLayerByName } from '../hd-director.js';
import { renderHDSceneBase64 } from '../hd-render.js';
import { generateHDBuffers } from '../hd-animate.js';
import { encodeGif } from '../export-gif.js';
import { exportVideo } from '../export-video.js';
import { loadAssetPack } from '../asset-pack.js';
import { registerPackAssets, searchHDAssets, listHDAssets, getHDAsset, registerHDAsset } from '../hd-asset-store.js';
import { SEMANTIC_POSITION_NAMES } from '../hd-layout.js';
import { HD_PRESET_NAMES } from '../hd-presets.js';
import { HD_DEFAULT_WIDTH, HD_DEFAULT_HEIGHT, HD_MAX_SCENE_WIDTH, HD_MAX_SCENE_HEIGHT, HD_MAX_ANIMATION_FRAMES } from '../constants.js';
import { setCameraForFrame, type CameraState } from '../hd-camera.js';
import { renderTimeline } from '../hd-timeline.js';

export function registerDirectorTools(server: McpServer): void {

  // ── Asset management ──

  server.tool(
    'hd_load_pack',
    'Load a ZIP asset pack. Provide base64-encoded ZIP data.',
    {
      data: z.string().describe('Base64-encoded ZIP file'),
    },
    async ({ data }) => {
      try {
        const zipBuffer = Buffer.from(data, 'base64');
        const { manifest, assets } = await loadAssetPack(zipBuffer);
        const count = registerPackAssets(manifest.name, assets);
        return { content: [{ type: 'text' as const, text: `Loaded pack "${manifest.name}" v${manifest.version}: ${count} assets registered` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_search_assets',
    'Search loaded assets by name, category, or tag.',
    {
      query: z.string().describe('Search query'),
    },
    async ({ query }) => {
      try {
        const results = searchHDAssets(query);
        if (results.length === 0) return { content: [{ type: 'text' as const, text: 'No assets found' }] };
        const text = results.map((a) => `${a.id}: "${a.name}" (${a.category}) ${a.width}x${a.height} [${a.tags.join(', ')}]`).join('\n');
        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_list_assets',
    'List all loaded assets.',
    {},
    async () => {
      const assets = listHDAssets();
      if (assets.length === 0) return { content: [{ type: 'text' as const, text: 'No assets loaded' }] };
      const text = assets.map((a) => `${a.id}: "${a.name}" (${a.category}) ${a.width}x${a.height}`).join('\n');
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  server.tool(
    'hd_import_asset',
    'Import a single PNG as a named HD asset.',
    {
      id: z.string().describe('Unique asset ID'),
      name: z.string().describe('Display name'),
      category: z.string().default('imported').describe('Category'),
      tags: z.array(z.string()).default([]).describe('Tags'),
      data: z.string().describe('Base64-encoded PNG data'),
    },
    async ({ id, name, category, tags, data }) => {
      try {
        const buffer = Buffer.from(data, 'base64');
        const meta = await sharp(buffer).metadata();
        registerHDAsset({
          id,
          name,
          category,
          tags,
          width: meta.width ?? 100,
          height: meta.height ?? 100,
          buffer,
        });
        return { content: [{ type: 'text' as const, text: `Imported asset "${name}" (${id}) ${meta.width}x${meta.height}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ── Semantic scene building ──

  server.tool(
    'hd_set_background',
    'Set the background of an HD scene to a hex color or an asset name.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      background: z.string().describe('Hex color (#rrggbb) or asset name'),
    },
    async ({ scene_id, background }) => {
      try {
        const scene = getHDScene(scene_id);
        await setBackground(scene, background);
        return { content: [{ type: 'text' as const, text: `Background set to "${background}"` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_place',
    `Place an asset at a semantic position. Positions: ${SEMANTIC_POSITION_NAMES.join(', ')}`,
    {
      scene_id: z.string().describe('HD Scene ID'),
      asset: z.string().describe('Asset name or ID'),
      position: z.enum(SEMANTIC_POSITION_NAMES as [string, ...string[]]).describe('Semantic position'),
      name: z.string().optional().describe('Layer name (defaults to asset name)'),
      scale: z.number().min(0).optional().describe('Scale factor'),
      opacity: z.number().min(0).max(1).optional().describe('Opacity'),
      zIndex: z.number().int().optional().describe('Z-index'),
    },
    async ({ scene_id, asset, position, name, scale, opacity, zIndex }) => {
      try {
        const scene = getHDScene(scene_id);
        const layerId = await placeAsset(scene, asset, position as any, { name, scale, opacity, zIndex });
        return { content: [{ type: 'text' as const, text: `Placed "${asset}" at ${position} → layer ${layerId}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_animate',
    `Animate a layer by name or ID using a preset. Presets: ${HD_PRESET_NAMES.join(', ')}`,
    {
      anim_id: z.string().describe('HD Animation ID'),
      layer: z.string().describe('Layer name or ID'),
      preset: z.enum(HD_PRESET_NAMES as [string, ...string[]]).describe('Motion preset'),
      offset: z.number().int().min(0).optional().describe('Start frame offset'),
      duration: z.number().int().min(1).optional().describe('Duration in frames'),
    },
    async ({ anim_id, layer, preset, offset, duration }) => {
      try {
        const anim = getHDAnimation(anim_id);
        const scene = getHDScene(anim.sceneId);

        // Resolve layer name to ID
        let layerId = layer;
        const found = scene.layers.find((l) => l.id === layer);
        if (!found) {
          const byName = findLayerByName(scene, layer);
          if (!byName) throw new Error(`Layer "${layer}" not found`);
          layerId = byName;
        }

        animateLayer(anim, layerId, preset as any, { offset, duration });
        return { content: [{ type: 'text' as const, text: `Animated "${layer}" with "${preset}"` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_add_label',
    'Add a text label to the scene.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      text: z.string().describe('Label text'),
      position: z.enum(SEMANTIC_POSITION_NAMES as [string, ...string[]]).default('bottom').describe('Position'),
      color: z.string().default('#ffffff').describe('Text color'),
      fontSize: z.number().int().min(8).max(200).default(32).describe('Font size'),
      fontFamily: z.string().default('sans-serif').describe('Font family'),
      backgroundColor: z.string().optional().describe('Background color'),
    },
    async ({ scene_id, text, position, color, fontSize, fontFamily, backgroundColor }) => {
      try {
        const scene = getHDScene(scene_id);
        const layerId = await addTextLabel(scene, text, position as any, { color, fontSize, fontFamily, backgroundColor });
        return { content: [{ type: 'text' as const, text: `Added label "${text}" → ${layerId}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_describe',
    'Get a text description of the current HD scene state.',
    {
      scene_id: z.string().describe('HD Scene ID'),
    },
    async ({ scene_id }) => {
      try {
        const scene = getHDScene(scene_id);
        return { content: [{ type: 'text' as const, text: describeScene(scene) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_render',
    'Render an HD scene or animation. Returns PNG for scenes, GIF/video for animations.',
    {
      scene_id: z.string().optional().describe('HD Scene ID (render static)'),
      anim_id: z.string().optional().describe('HD Animation ID (render animated)'),
      format: z.enum(['png', 'gif', 'mp4', 'webm']).default('png').describe('Output format'),
      fps: z.number().int().min(1).max(60).default(30).describe('FPS (for gif/video)'),
    },
    async ({ scene_id, anim_id, format, fps }) => {
      try {
        if (anim_id) {
          const anim = getHDAnimation(anim_id);
          const scene = getHDScene(anim.sceneId);
          const buffers = await generateHDBuffers(scene, anim);

          if (format === 'gif' || format === 'png') {
            const delay = Math.round(1000 / fps);
            const gifBuffer = await encodeGif(buffers, scene.width, scene.height, { delay, loop: anim.loop });
            return {
              content: [{
                type: 'image' as const,
                data: gifBuffer.toString('base64'),
                mimeType: 'image/gif' as const,
              }],
            };
          } else {
            const videoBuffer = await exportVideo(buffers, {
              width: scene.width, height: scene.height, format, fps, crf: 23,
            });
            const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
            return {
              content: [
                { type: 'text' as const, text: `Exported HD ${format}: ${videoBuffer.length} bytes` },
                { type: 'resource' as const, resource: { uri: `data:${mimeType};base64,${videoBuffer.toString('base64')}`, mimeType, text: videoBuffer.toString('base64') } } as any,
              ],
            };
          }
        } else if (scene_id) {
          const scene = getHDScene(scene_id);
          const base64 = await renderHDSceneBase64(scene);
          return {
            content: [
              { type: 'text' as const, text: describeScene(scene) },
              { type: 'image' as const, data: base64, mimeType: 'image/png' as const },
            ],
          };
        } else {
          throw new Error('Provide either scene_id or anim_id');
        }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ── Camera tools ──

  server.tool(
    'hd_set_camera',
    'Set camera position/zoom/rotation for an HD scene.',
    {
      scene_id: z.string().describe('HD Scene ID'),
      x: z.number().default(0).describe('Camera X offset'),
      y: z.number().default(0).describe('Camera Y offset'),
      zoom: z.number().min(0.1).max(10).default(1).describe('Zoom level'),
      rotate: z.number().default(0).describe('Camera rotation in degrees'),
    },
    async ({ scene_id, x, y, zoom, rotate }) => {
      try {
        const scene = getHDScene(scene_id);
        setCameraForFrame(scene, { x, y, zoom, rotate });
        return { content: [{ type: 'text' as const, text: `Camera set: offset(${x},${y}) zoom=${zoom} rotate=${rotate}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_animate_camera',
    'Add camera animation tracks to an HD animation.',
    {
      anim_id: z.string().describe('HD Animation ID'),
      property: z.enum(['x', 'y', 'zoom', 'rotate']).describe('Camera property'),
      keyframes: z.array(z.object({
        frame: z.number().int().min(0),
        value: z.number(),
        easing: z.string().optional(),
      })).min(1).describe('Keyframes'),
    },
    async ({ anim_id, property, keyframes }) => {
      try {
        const anim = getHDAnimation(anim_id);
        // Store camera tracks with special layerId prefix
        const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
        anim.tracks.push({
          layerId: `__camera__`,
          property: property === 'zoom' ? 'scale' : property as any,
          keyframes: sorted.map((kf) => ({ frame: kf.frame, value: kf.value, easing: kf.easing as any })),
        });
        return { content: [{ type: 'text' as const, text: `Added camera track: ${property} (${keyframes.length} keyframes)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // ── Timeline tools ──

  server.tool(
    'hd_add_timeline_scene',
    'Add a scene to the multi-scene timeline.',
    {
      anim_id: z.string().describe('HD Animation ID (timeline)'),
      scene_id: z.string().describe('Scene to add'),
      start_frame: z.number().int().min(0).describe('Start frame in timeline'),
      duration: z.number().int().min(1).describe('Duration in frames'),
    },
    async ({ anim_id, scene_id, start_frame, duration }) => {
      try {
        getHDScene(scene_id);
        const anim = getHDAnimation(anim_id);
        // Store timeline entries as metadata on the animation
        if (!(anim as any).timeline) (anim as any).timeline = [];
        (anim as any).timeline.push({ sceneId: scene_id, startFrame: start_frame, duration });
        return { content: [{ type: 'text' as const, text: `Added scene ${scene_id} to timeline at frame ${start_frame} (${duration} frames)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_set_transition',
    'Set transition between timeline scenes.',
    {
      anim_id: z.string().describe('HD Animation ID'),
      from_index: z.number().int().min(0).describe('Source scene index in timeline'),
      type: z.enum(['cut', 'dissolve', 'fade', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down']).describe('Transition type'),
      duration: z.number().int().min(1).default(15).describe('Transition duration in frames'),
    },
    async ({ anim_id, from_index, type, duration }) => {
      try {
        const anim = getHDAnimation(anim_id);
        if (!(anim as any).transitions) (anim as any).transitions = [];
        (anim as any).transitions.push({ fromIndex: from_index, type, duration });
        return { content: [{ type: 'text' as const, text: `Set ${type} transition from scene ${from_index} (${duration} frames)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'hd_render_timeline',
    'Render a multi-scene timeline as GIF or video.',
    {
      anim_id: z.string().describe('HD Animation ID with timeline'),
      format: z.enum(['gif', 'mp4', 'webm']).default('gif').describe('Output format'),
      fps: z.number().int().min(1).max(60).default(30).describe('FPS'),
    },
    async ({ anim_id, format, fps }) => {
      try {
        const anim = getHDAnimation(anim_id);
        const buffers = await renderTimeline(anim);

        if (buffers.length === 0) throw new Error('No frames rendered. Add scenes to timeline first.');

        // Get dimensions from first scene in timeline
        const timeline = (anim as any).timeline;
        const firstScene = getHDScene(timeline[0].sceneId);

        if (format === 'gif') {
          const delay = Math.round(1000 / fps);
          const gifBuffer = await encodeGif(buffers, firstScene.width, firstScene.height, { delay, loop: true });
          return {
            content: [{
              type: 'image' as const,
              data: gifBuffer.toString('base64'),
              mimeType: 'image/gif' as const,
            }],
          };
        } else {
          const videoBuffer = await exportVideo(buffers, {
            width: firstScene.width, height: firstScene.height, format, fps, crf: 23,
          });
          const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
          return {
            content: [
              { type: 'text' as const, text: `Rendered timeline: ${buffers.length} frames` },
              { type: 'resource' as const, resource: { uri: `data:${mimeType};base64,${videoBuffer.toString('base64')}`, mimeType, text: videoBuffer.toString('base64') } } as any,
            ],
          };
        }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
