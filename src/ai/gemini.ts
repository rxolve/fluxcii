import type { SpriteProvider, SpriteGenerationOptions } from './provider.js';
import { generateSpriteSheet as geminiGenerate } from '../gemini.js';

export class GeminiProvider implements SpriteProvider {
  name = 'gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateSpriteSheet(prompt: string, frames: number, _options?: SpriteGenerationOptions): Promise<Buffer> {
    return geminiGenerate(prompt, frames, this.apiKey);
  }
}
