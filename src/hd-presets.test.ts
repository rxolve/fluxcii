import { describe, it, expect } from 'vitest';
import { generateHDPresetTracks, HD_PRESET_NAMES } from './hd-presets.js';
import type { HDPresetName } from './hd-types.js';

describe('generateHDPresetTracks', () => {
  it('generates tracks for all presets without errors', () => {
    for (const preset of HD_PRESET_NAMES) {
      const tracks = generateHDPresetTracks(preset, {
        layerId: 'test-layer',
        totalFrames: 30,
        sceneWidth: 800,
        sceneHeight: 600,
      });
      expect(tracks.length).toBeGreaterThan(0);
      for (const track of tracks) {
        expect(track.layerId).toBe('test-layer');
        expect(track.keyframes.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('applies offset to all tracks', () => {
    const tracks = generateHDPresetTracks('fade-in', {
      layerId: 'test-layer',
      totalFrames: 30,
      offset: 10,
    });
    expect(tracks[0].offset).toBe(10);
  });

  it('generates fade-in with opacity track', () => {
    const tracks = generateHDPresetTracks('fade-in', {
      layerId: 'layer-1',
      totalFrames: 20,
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0].property).toBe('opacity');
    expect(tracks[0].keyframes[0].value).toBe(0);
    expect(tracks[0].keyframes[1].value).toBe(1);
  });

  it('generates slide-in-from-left with x and opacity tracks', () => {
    const tracks = generateHDPresetTracks('slide-in-from-left', {
      layerId: 'layer-1',
      totalFrames: 30,
      sceneWidth: 800,
    });
    expect(tracks.length).toBeGreaterThanOrEqual(2);
    const xTrack = tracks.find((t) => t.property === 'x');
    expect(xTrack).toBeDefined();
    expect(xTrack!.keyframes[0].value).toBe(-800);
    expect(xTrack!.keyframes[1].value).toBe(0);
  });

  it('generates shake-x with multiple keyframes', () => {
    const tracks = generateHDPresetTracks('shake-x', {
      layerId: 'layer-1',
      totalFrames: 30,
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0].property).toBe('x');
    expect(tracks[0].keyframes.length).toBeGreaterThan(2);
    // First and last should be 0
    expect(tracks[0].keyframes[0].value).toBe(0);
    expect(tracks[0].keyframes[tracks[0].keyframes.length - 1].value).toBe(0);
  });

  it('has 34 preset names', () => {
    expect(HD_PRESET_NAMES).toHaveLength(34);
  });
});
