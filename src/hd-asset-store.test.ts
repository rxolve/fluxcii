import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerHDAsset,
  getHDAsset,
  searchHDAssets,
  listHDAssets,
  removeHDAsset,
  clearHDAssets,
} from './hd-asset-store.js';

beforeEach(() => {
  clearHDAssets();
});

function makeAsset(id: string, name: string, category = 'test', tags: string[] = []) {
  return {
    id,
    name,
    category,
    tags,
    width: 100,
    height: 100,
    buffer: Buffer.from('fake-png'),
  };
}

describe('HD Asset Store', () => {
  it('registers and retrieves by ID', () => {
    registerHDAsset(makeAsset('ast-1', 'Astronaut'));
    const asset = getHDAsset('ast-1');
    expect(asset).toBeDefined();
    expect(asset!.name).toBe('Astronaut');
  });

  it('retrieves by name (case-insensitive)', () => {
    registerHDAsset(makeAsset('ast-1', 'Astronaut'));
    const asset = getHDAsset('astronaut');
    expect(asset).toBeDefined();
    expect(asset!.id).toBe('ast-1');
  });

  it('returns undefined for missing assets', () => {
    expect(getHDAsset('nonexistent')).toBeUndefined();
  });

  it('searches by name', () => {
    registerHDAsset(makeAsset('ast-1', 'Astronaut', 'characters'));
    registerHDAsset(makeAsset('rkt-1', 'Rocket', 'props'));
    const results = searchHDAssets('astro');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('ast-1');
  });

  it('searches by category', () => {
    registerHDAsset(makeAsset('ast-1', 'Astronaut', 'characters'));
    registerHDAsset(makeAsset('rkt-1', 'Rocket', 'props'));
    const results = searchHDAssets('characters');
    expect(results).toHaveLength(1);
  });

  it('searches by tags', () => {
    registerHDAsset(makeAsset('ast-1', 'Astronaut', 'characters', ['space', 'human']));
    const results = searchHDAssets('space');
    expect(results).toHaveLength(1);
  });

  it('lists all assets', () => {
    registerHDAsset(makeAsset('a1', 'A'));
    registerHDAsset(makeAsset('a2', 'B'));
    expect(listHDAssets()).toHaveLength(2);
  });

  it('removes assets', () => {
    registerHDAsset(makeAsset('a1', 'A'));
    expect(removeHDAsset('a1')).toBe(true);
    expect(getHDAsset('a1')).toBeUndefined();
    expect(removeHDAsset('a1')).toBe(false);
  });

  it('clears all assets', () => {
    registerHDAsset(makeAsset('a1', 'A'));
    registerHDAsset(makeAsset('a2', 'B'));
    clearHDAssets();
    expect(listHDAssets()).toHaveLength(0);
  });
});
