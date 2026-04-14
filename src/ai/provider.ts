export interface SpriteGenerationOptions {
  removeBackground?: boolean;
}

export interface SpriteProvider {
  name: string;
  generateSpriteSheet(prompt: string, frames: number, options?: SpriteGenerationOptions): Promise<Buffer>;
}

const providers = new Map<string, SpriteProvider>();

export function registerProvider(provider: SpriteProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): SpriteProvider {
  const p = providers.get(name);
  if (!p) throw new Error(`AI provider "${name}" not registered. Available: ${[...providers.keys()].join(', ')}`);
  return p;
}

export function listProviders(): string[] {
  return [...providers.keys()];
}
