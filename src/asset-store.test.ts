import { describe, it, expect, beforeEach } from 'vitest';
import { storeAsset, getAsset, findAssetByName, listAssets, deleteAsset, clearAssets } from './asset-store.js';
import type { RectNode } from './types.js';

beforeEach(() => clearAssets());

describe('storeAsset', () => {
  it('stores and retrieves a node asset', () => {
    const node: RectNode = { id: 'n1', type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    const asset = storeAsset('my-rect', 'node', node);
    expect(asset.id).toMatch(/^asset-/);
    expect(asset.name).toBe('my-rect');
    expect(asset.type).toBe('node');
    const fetched = getAsset(asset.id);
    expect(fetched.name).toBe('my-rect');
  });

  it('stores an image asset', () => {
    const asset = storeAsset('bg-image', 'image', 'base64data...');
    expect(asset.type).toBe('image');
    expect(asset.data).toBe('base64data...');
  });
});

describe('getAsset', () => {
  it('throws for unknown ID', () => {
    expect(() => getAsset('nope')).toThrow('not found');
  });
});

describe('findAssetByName', () => {
  it('finds by name', () => {
    storeAsset('star', 'node', { id: 'n1', type: 'circle', cx: 0, cy: 0, r: 5 } as any);
    const found = findAssetByName('star');
    expect(found).toBeDefined();
    expect(found!.name).toBe('star');
  });

  it('returns undefined when not found', () => {
    expect(findAssetByName('nope')).toBeUndefined();
  });
});

describe('listAssets', () => {
  it('lists all assets', () => {
    storeAsset('a', 'node', { id: 'n1', type: 'rect', x: 0, y: 0, width: 1, height: 1 } as any);
    storeAsset('b', 'image', 'data');
    const list = listAssets();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('a');
    expect(list[1].name).toBe('b');
  });

  it('returns empty when no assets', () => {
    expect(listAssets()).toHaveLength(0);
  });
});

describe('deleteAsset', () => {
  it('deletes an existing asset', () => {
    const asset = storeAsset('temp', 'node', { id: 'n1', type: 'rect', x: 0, y: 0, width: 1, height: 1 } as any);
    expect(deleteAsset(asset.id)).toBe(true);
    expect(() => getAsset(asset.id)).toThrow();
  });

  it('returns false for nonexistent', () => {
    expect(deleteAsset('bad')).toBe(false);
  });
});
