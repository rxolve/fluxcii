import type { HDScene, HDAnimation, HDPresetName, HDTrack, HDKeyframe } from './hd-types.js';
import { getHDScene, getHDAnimation, storeHDAnimation, generateHDAnimId } from './hd-store.js';
import { getHDAsset } from './hd-asset-store.js';
import { resolvePosition, type SemanticPosition } from './hd-layout.js';
import { generateHDPresetTracks } from './hd-presets.js';
import { renderTextLabel, type TextLabelOptions } from './hd-text.js';
import sharp from 'sharp';

/**
 * Place an asset onto a scene using a semantic position.
 */
export async function placeAsset(
  scene: HDScene,
  assetName: string,
  position: SemanticPosition,
  options?: {
    name?: string;
    scale?: number;
    opacity?: number;
    zIndex?: number;
  },
): Promise<string> {
  const asset = getHDAsset(assetName);
  if (!asset) throw new Error(`Asset "${assetName}" not found. Load an asset pack first.`);

  const scale = options?.scale ?? 1;
  const displayW = Math.round(asset.width * scale);
  const displayH = Math.round(asset.height * scale);
  const { x, y } = resolvePosition(position, scene.width, scene.height, displayW, displayH);

  const id = `layer-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}`;
  scene.layers.push({
    id,
    name: options?.name ?? asset.name,
    asset: asset.id,
    buffer: asset.buffer,
    x,
    y,
    width: asset.width,
    height: asset.height,
    opacity: options?.opacity ?? 1,
    scale,
    rotate: 0,
    visible: true,
    zIndex: options?.zIndex ?? scene.layers.length,
  });

  return id;
}

/**
 * Set the scene background from a color or an asset name.
 */
export async function setBackground(scene: HDScene, colorOrAsset: string): Promise<void> {
  // Check if it's a hex color
  if (/^#[0-9a-fA-F]{6,8}$/.test(colorOrAsset)) {
    scene.background = colorOrAsset;
    return;
  }

  // Try to find it as an asset
  const asset = getHDAsset(colorOrAsset);
  if (asset) {
    // Place asset as background layer at zIndex -1000
    const id = `bg-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}`;

    // Resize asset to fill scene
    const resizedBuffer = await sharp(asset.buffer)
      .resize(scene.width, scene.height, { fit: 'cover' })
      .png()
      .toBuffer();

    // Remove existing background layers
    scene.layers = scene.layers.filter((l) => !l.id.startsWith('bg-'));

    scene.layers.push({
      id,
      name: `bg:${asset.name}`,
      asset: asset.id,
      buffer: resizedBuffer,
      x: 0,
      y: 0,
      width: scene.width,
      height: scene.height,
      opacity: 1,
      scale: 1,
      rotate: 0,
      visible: true,
      zIndex: -1000,
    });
    return;
  }

  throw new Error(`"${colorOrAsset}" is not a valid hex color or asset name`);
}

/**
 * Animate a layer using a preset or custom keyframes.
 */
export function animateLayer(
  animation: HDAnimation,
  layerId: string,
  preset: HDPresetName,
  options?: {
    offset?: number;
    duration?: number;
  },
): void {
  const scene = getHDScene(animation.sceneId);
  const totalFrames = options?.duration ?? animation.totalFrames;

  const tracks = generateHDPresetTracks(preset, {
    layerId,
    totalFrames,
    offset: options?.offset,
    sceneWidth: scene.width,
    sceneHeight: scene.height,
  });

  for (const t of tracks) {
    animation.tracks.push(t);
  }
}

/**
 * Add a text label to the scene.
 */
export async function addTextLabel(
  scene: HDScene,
  text: string,
  position: SemanticPosition,
  style?: Partial<TextLabelOptions>,
): Promise<string> {
  const { buffer, width, height } = await renderTextLabel({
    text,
    ...style,
  });

  const { x, y } = resolvePosition(position, scene.width, scene.height, width, height);

  const id = `label-${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}`;
  scene.layers.push({
    id,
    name: `label:${text.slice(0, 20)}`,
    asset: '',
    buffer,
    x,
    y,
    width,
    height,
    opacity: 1,
    scale: 1,
    rotate: 0,
    visible: true,
    zIndex: 1000, // labels on top
  });

  return id;
}

/**
 * Describe the current state of a scene (for LLM context).
 */
export function describeScene(scene: HDScene): string {
  const lines = [
    `HD Scene: ${scene.id} (${scene.width}x${scene.height})`,
    `Background: ${scene.background}`,
    `Layers (${scene.layers.length}):`,
  ];

  const sorted = [...scene.layers].sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of sorted) {
    const vis = layer.visible ? '' : ' [hidden]';
    const pos = `(${layer.x}, ${layer.y})`;
    const size = `${layer.width}x${layer.height}`;
    const props = [];
    if (layer.scale !== 1) props.push(`scale=${layer.scale}`);
    if (layer.opacity !== 1) props.push(`opacity=${layer.opacity}`);
    if (layer.rotate !== 0) props.push(`rotate=${layer.rotate}`);
    const extra = props.length ? ` [${props.join(', ')}]` : '';
    lines.push(`  z${layer.zIndex}: "${layer.name}" at ${pos} ${size}${extra}${vis}`);
  }

  return lines.join('\n');
}

/**
 * Find a layer by name (case-insensitive).
 */
export function findLayerByName(scene: HDScene, name: string): string | undefined {
  const lower = name.toLowerCase();
  const layer = scene.layers.find((l) => l.name.toLowerCase() === lower);
  return layer?.id;
}
