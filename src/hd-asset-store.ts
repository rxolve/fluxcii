import type { AssetDescriptor } from './asset-pack.js';

/**
 * A registered HD asset with its PNG buffer.
 */
export interface HDAsset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  width: number;
  height: number;
  buffer: Buffer;
  packName?: string;
}

// ── In-memory asset registry ──

const assetRegistry = new Map<string, HDAsset>();

/**
 * Register an asset in the store.
 */
export function registerHDAsset(asset: HDAsset): void {
  assetRegistry.set(asset.id, asset);
}

/**
 * Register assets from a loaded pack.
 */
export function registerPackAssets(
  packName: string,
  assets: { descriptor: AssetDescriptor; buffer: Buffer }[],
): number {
  let count = 0;
  for (const { descriptor, buffer } of assets) {
    registerHDAsset({
      id: descriptor.id,
      name: descriptor.name,
      category: descriptor.category,
      tags: descriptor.tags,
      width: descriptor.width,
      height: descriptor.height,
      buffer,
      packName,
    });
    count++;
  }
  return count;
}

/**
 * Get an asset by ID or name (case-insensitive name match).
 */
export function getHDAsset(idOrName: string): HDAsset | undefined {
  // Try exact ID match first
  const byId = assetRegistry.get(idOrName);
  if (byId) return byId;

  // Try case-insensitive name match
  const lower = idOrName.toLowerCase();
  for (const asset of assetRegistry.values()) {
    if (asset.name.toLowerCase() === lower) return asset;
  }

  return undefined;
}

/**
 * Search assets by name, category, or tags.
 */
export function searchHDAssets(query: string): HDAsset[] {
  const q = query.toLowerCase();
  const results: HDAsset[] = [];
  for (const asset of assetRegistry.values()) {
    if (
      asset.name.toLowerCase().includes(q) ||
      asset.category.toLowerCase().includes(q) ||
      asset.tags.some((t) => t.toLowerCase().includes(q))
    ) {
      results.push(asset);
    }
  }
  return results;
}

/**
 * List all registered assets.
 */
export function listHDAssets(): HDAsset[] {
  return [...assetRegistry.values()];
}

/**
 * Remove an asset by ID.
 */
export function removeHDAsset(id: string): boolean {
  return assetRegistry.delete(id);
}

/**
 * Clear all assets.
 */
export function clearHDAssets(): void {
  assetRegistry.clear();
}
