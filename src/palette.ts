import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Palette } from './types.js';
import { DEFAULT_PALETTE } from './constants.js';

const palettes = new Map<string, Palette>();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadPalettes(): Promise<void> {
  const dir = path.join(__dirname, '..', 'palettes');
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir, file), 'utf-8');
    const palette: Palette = JSON.parse(raw);
    palettes.set(palette.id, palette);
  }
}

export function getPalette(id?: string): Palette {
  const p = palettes.get(id ?? DEFAULT_PALETTE);
  if (!p) {
    const def = palettes.get(DEFAULT_PALETTE);
    if (!def) throw new Error(`Palette "${id ?? DEFAULT_PALETTE}" not found`);
    return def;
  }
  return p;
}

export function listPalettes(): Palette[] {
  return [...palettes.values()];
}

/** Register a custom palette at runtime. */
export function registerPalette(palette: Palette): void {
  palettes.set(palette.id, palette);
}

/** Delete a custom palette. Returns false if not found. */
export function deletePalette(id: string): boolean {
  return palettes.delete(id);
}

/** Resolve a palette color name to hex. Returns input unchanged if not found. */
export function resolveColorName(name: string, palette: Palette): string {
  const entry = palette.colors.find((c) => c.name === name);
  return entry ? entry.hex : name;
}
