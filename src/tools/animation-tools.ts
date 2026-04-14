import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createScene, findNode } from '../scene.js';
import { generateSceneId, storeScene, getScene, generateAnimId, storeAnimation, getAnimation } from '../store.js';
import { generateFrames } from '../animate.js';
import { inspectScene } from '../inspect.js';
import { DEFAULT_WIDTH, DEFAULT_HEIGHT, MAX_SCENE_WIDTH, MAX_SCENE_HEIGHT, MAX_ANIMATION_FRAMES, MAX_TRACKS_PER_ANIMATION } from '../constants.js';
import type { Animation, Track, PathTrack, AnimatableProperty, EasingName, CubicBezier, PlaybackMode } from '../animation-types.js';
import {
  ElementSchema, AnimatablePropertySchema, KeyframeSchema, PlaybackModeSchema, TrackSchema,
} from './schemas.js';
import { addElement, findNodeByName } from './helpers.js';

export function registerAnimationTools(server: McpServer): void {
  server.tool(
    'animate_illustration',
    'Create an animated illustration in one call. Provide elements and animation tracks. Returns PNG frames.',
    {
      width: z.number().int().min(1).max(MAX_SCENE_WIDTH).default(DEFAULT_WIDTH).describe('Canvas width'),
      height: z.number().int().min(1).max(MAX_SCENE_HEIGHT).default(DEFAULT_HEIGHT).describe('Canvas height'),
      background: z.string().optional().describe('Background color'),
      palette: z.string().optional().describe('Palette ID'),
      elements: z.array(ElementSchema).describe('Array of shape/text/group elements'),
      total_frames: z.number().int().min(1).max(MAX_ANIMATION_FRAMES).describe('Total number of frames'),
      tracks: z.array(TrackSchema).max(MAX_TRACKS_PER_ANIMATION).describe('Animation tracks (use node_name to reference elements)'),
      delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
      loop: z.boolean().optional().describe('Loop animation (default: true)'),
      mode: PlaybackModeSchema,
    },
    async ({ width, height, background, palette, elements, total_frames, tracks, delay, loop, mode }) => {
      try {
        const id = generateSceneId();
        const scene = createScene(id, width, height, background, palette);
        for (const el of elements) {
          addElement(scene, el);
        }
        storeScene(scene);

        // Resolve node_name → nodeId by searching the scene tree
        const resolvedTracks: Track[] = [];
        for (const t of tracks) {
          const node = findNodeByName(scene.root, t.node_name);
          if (!node) throw new Error(`Element with name "${t.node_name}" not found`);
          resolvedTracks.push({
            nodeId: node.id,
            property: t.property as AnimatableProperty,
            keyframes: t.keyframes.map((kf) => ({
              frame: kf.frame,
              value: kf.value,
              easing: kf.easing as EasingName | CubicBezier | undefined,
            })),
            offset: t.offset,
          });
        }

        const animation: Animation = {
          id: generateAnimId(),
          sceneId: scene.id,
          totalFrames: total_frames,
          tracks: resolvedTracks,
          delay,
          loop,
          mode: mode as PlaybackMode | undefined,
        };
        storeAnimation(animation);

        const frames = generateFrames(scene, animation);
        const info = inspectScene(scene);
        return {
          content: [
            { type: 'text' as const, text: `${info}\n\nAnimation: ${animation.id} | ${total_frames} frames | ${resolvedTracks.length} tracks` },
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
    'create_animation',
    'Create an animation for an existing scene. Returns animation ID for add_track calls.',
    {
      scene_id: z.string().describe('Scene ID'),
      total_frames: z.number().int().min(1).max(MAX_ANIMATION_FRAMES).describe('Total number of frames'),
      delay: z.number().int().min(1).optional().describe('Frame delay in ms (default: 100)'),
      loop: z.boolean().optional().describe('Loop animation (default: true)'),
      mode: PlaybackModeSchema,
    },
    async ({ scene_id, total_frames, delay, loop, mode }) => {
      try {
        getScene(scene_id); // validate scene exists
        const anim: Animation = {
          id: generateAnimId(),
          sceneId: scene_id,
          totalFrames: total_frames,
          tracks: [],
          delay,
          loop,
          mode: mode as PlaybackMode | undefined,
        };
        storeAnimation(anim);
        return { content: [{ type: 'text' as const, text: `Created animation ${anim.id} for scene ${scene_id} (${total_frames} frames)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'add_track',
    'Add an animation track to an existing animation. Each track animates one property on one node.',
    {
      anim_id: z.string().describe('Animation ID'),
      node_id: z.string().describe('Node ID to animate'),
      property: AnimatablePropertySchema,
      keyframes: z.array(KeyframeSchema).min(1).describe('Keyframe values'),
      offset: z.number().int().min(0).optional().describe('Frame offset (delays this track by N frames)'),
    },
    async ({ anim_id, node_id, property, keyframes, offset }) => {
      try {
        const anim = getAnimation(anim_id);
        if (anim.tracks.length >= MAX_TRACKS_PER_ANIMATION) {
          throw new Error(`Animation has reached max track limit (${MAX_TRACKS_PER_ANIMATION})`);
        }
        // Validate node exists in scene
        const scene = getScene(anim.sceneId);
        if (node_id !== 'root' && !findNode(scene.root, node_id)) {
          throw new Error(`Node "${node_id}" not found in scene ${anim.sceneId}`);
        }
        const track: Track = {
          nodeId: node_id,
          property: property as AnimatableProperty,
          keyframes: keyframes.map((kf) => ({
            frame: kf.frame,
            value: kf.value,
            easing: kf.easing as EasingName | CubicBezier | undefined,
          })),
          offset,
        };
        anim.tracks.push(track);
        return { content: [{ type: 'text' as const, text: `Added track: ${node_id}.${property} (${keyframes.length} keyframes) to ${anim_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'add_path_track',
    'Add a path animation track. The node moves along an SVG path (M/L/C/Z). Keyframes control progress (0-1) along the path.',
    {
      anim_id: z.string().describe('Animation ID'),
      node_id: z.string().describe('Node ID to animate along path'),
      path: z.string().describe('SVG path d attribute (M, L, C, Z commands)'),
      keyframes: z.array(KeyframeSchema).min(1).describe('Keyframes with progress values (0-1)'),
      offset: z.number().int().min(0).optional().describe('Frame offset (delays this track by N frames)'),
    },
    async ({ anim_id, node_id, path, keyframes, offset }) => {
      try {
        const anim = getAnimation(anim_id);
        const scene = getScene(anim.sceneId);
        if (node_id !== 'root' && !findNode(scene.root, node_id)) {
          throw new Error(`Node "${node_id}" not found in scene ${anim.sceneId}`);
        }
        const pathTrack: PathTrack = {
          nodeId: node_id,
          path,
          keyframes: keyframes.map((kf) => ({
            frame: kf.frame,
            value: kf.value,
            easing: kf.easing as EasingName | CubicBezier | undefined,
          })),
          offset,
        };
        if (!anim.pathTracks) anim.pathTracks = [];
        anim.pathTracks.push(pathTrack);
        return { content: [{ type: 'text' as const, text: `Added path track for ${node_id} (${keyframes.length} keyframes) to ${anim_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'update_track',
    'Update a track\'s keyframes by index in the animation.',
    {
      anim_id: z.string().describe('Animation ID'),
      track_index: z.number().int().min(0).describe('Track index (0-based)'),
      keyframes: z.array(KeyframeSchema).min(1).optional().describe('New keyframes (replaces existing)'),
      offset: z.number().int().min(0).optional().describe('New frame offset'),
    },
    async ({ anim_id, track_index, keyframes, offset }) => {
      try {
        const anim = getAnimation(anim_id);
        if (track_index >= anim.tracks.length) {
          throw new Error(`Track index ${track_index} out of range (${anim.tracks.length} tracks)`);
        }
        const track = anim.tracks[track_index];
        if (keyframes) {
          track.keyframes = keyframes.map((kf) => ({
            frame: kf.frame,
            value: kf.value,
            easing: kf.easing as EasingName | CubicBezier | undefined,
          }));
        }
        if (offset !== undefined) track.offset = offset;
        return { content: [{ type: 'text' as const, text: `Updated track ${track_index} (${track.nodeId}.${track.property}) in ${anim_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  server.tool(
    'remove_track',
    'Remove a track from an animation by index.',
    {
      anim_id: z.string().describe('Animation ID'),
      track_index: z.number().int().min(0).describe('Track index (0-based)'),
      is_path_track: z.boolean().default(false).describe('If true, removes from pathTracks instead of tracks'),
    },
    async ({ anim_id, track_index, is_path_track }) => {
      try {
        const anim = getAnimation(anim_id);
        if (is_path_track) {
          if (!anim.pathTracks || track_index >= anim.pathTracks.length) {
            throw new Error(`Path track index ${track_index} out of range`);
          }
          const removed = anim.pathTracks.splice(track_index, 1)[0];
          return { content: [{ type: 'text' as const, text: `Removed path track ${track_index} (${removed.nodeId}) from ${anim_id}` }] };
        }
        if (track_index >= anim.tracks.length) {
          throw new Error(`Track index ${track_index} out of range (${anim.tracks.length} tracks)`);
        }
        const removed = anim.tracks.splice(track_index, 1)[0];
        return { content: [{ type: 'text' as const, text: `Removed track ${track_index} (${removed.nodeId}.${removed.property}) from ${anim_id}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
