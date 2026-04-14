import { describe, it, expect } from 'vitest';
import { registerProvider, getProvider, listProviders } from './ai/provider.js';
import type { SpriteProvider } from './ai/provider.js';

describe('AI provider registry', () => {
  it('registers and retrieves a provider', () => {
    const mock: SpriteProvider = {
      name: 'test-provider',
      async generateSpriteSheet() { return Buffer.from('fake'); },
    };
    registerProvider(mock);
    const p = getProvider('test-provider');
    expect(p.name).toBe('test-provider');
  });

  it('throws for unregistered provider', () => {
    expect(() => getProvider('nonexistent')).toThrow('not registered');
  });

  it('lists registered providers', () => {
    const names = listProviders();
    expect(names).toContain('test-provider');
  });
});
