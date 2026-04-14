import type { SceneNode } from './types.js';

export interface Asset {
  id: string;
  name: string;
  type: 'node' | 'image';
  data: SceneNode | string; // SceneNode for node assets, base64 for images
  createdAt: number;
}

const assets = new Map<string, Asset>();
let _assetCounter = 0;

export function storeAsset(name: string, type: 'node' | 'image', data: SceneNode | string): Asset {
  const id = `asset-${(++_assetCounter).toString().padStart(3, '0')}`;
  const asset: Asset = { id, name, type, data, createdAt: Date.now() };
  assets.set(id, asset);
  return asset;
}

export function getAsset(id: string): Asset {
  const a = assets.get(id);
  if (!a) throw new Error(`Asset "${id}" not found`);
  return a;
}

export function findAssetByName(name: string): Asset | undefined {
  return [...assets.values()].find((a) => a.name === name);
}

export function listAssets(): { id: string; name: string; type: string }[] {
  return [...assets.values()].map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
  }));
}

export function deleteAsset(id: string): boolean {
  return assets.delete(id);
}

export function clearAssets(): void {
  assets.clear();
  _assetCounter = 0;
}
