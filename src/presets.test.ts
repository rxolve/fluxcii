import { describe, it, expect } from 'vitest';
import { generatePresetTracks, PRESET_NAMES } from './presets.js';

describe('presets', () => {
  for (const preset of PRESET_NAMES) {
    it(`${preset} generates at least one track`, () => {
      const tracks = generatePresetTracks(preset, { nodeId: 'n1', totalFrames: 30 });
      expect(tracks.length).toBeGreaterThanOrEqual(1);
      for (const t of tracks) {
        expect(t.nodeId).toBe('n1');
        expect(t.keyframes.length).toBeGreaterThanOrEqual(2);
      }
    });
  }

  it('fade-in animates style.opacity from 0 to 1', () => {
    const tracks = generatePresetTracks('fade-in', { nodeId: 'n1', totalFrames: 10 });
    expect(tracks).toHaveLength(1);
    expect(tracks[0].property).toBe('style.opacity');
    expect(tracks[0].keyframes[0].value).toBe(0);
    expect(tracks[0].keyframes[1].value).toBe(1);
  });

  it('spin rotates 360 degrees', () => {
    const tracks = generatePresetTracks('spin', { nodeId: 'n1', totalFrames: 20 });
    expect(tracks[0].property).toBe('transform.rotate');
    expect(tracks[0].keyframes[0].value).toBe(0);
    expect(tracks[0].keyframes[1].value).toBe(360);
  });

  it('respects offset parameter', () => {
    const tracks = generatePresetTracks('fade-in', { nodeId: 'n1', totalFrames: 10, offset: 5 });
    expect(tracks[0].offset).toBe(5);
  });
});
