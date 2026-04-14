import fs from 'fs/promises';
import { inflateRawSync } from 'zlib';

/**
 * Asset descriptor from a pack manifest.
 */
export interface AssetDescriptor {
  id: string;
  name: string;
  category: string;
  tags: string[];
  file: string;
  width: number;
  height: number;
}

/**
 * Parsed asset pack manifest.
 */
export interface PackManifest {
  name: string;
  version: string;
  assets: AssetDescriptor[];
}

/**
 * Loaded asset with PNG buffer.
 */
export interface LoadedAsset {
  descriptor: AssetDescriptor;
  buffer: Buffer;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Load an asset pack from a ZIP buffer.
 * Minimal ZIP parser supporting stored and deflated entries.
 */
export async function loadAssetPack(zipBuffer: Buffer): Promise<{ manifest: PackManifest; assets: LoadedAsset[] }> {
  const entries: ZipEntry[] = [];

  // Find End-of-Central-Directory record (PK\x05\x06)
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer[i] === 0x50 && zipBuffer[i + 1] === 0x4b && zipBuffer[i + 2] === 0x05 && zipBuffer[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Invalid ZIP file');

  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const cdEntries = zipBuffer.readUInt16LE(eocdOffset + 10);

  let pos = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (zipBuffer.readUInt32LE(pos) !== 0x02014b50) break;

    const compression = zipBuffer.readUInt16LE(pos + 10);
    const compressedSize = zipBuffer.readUInt32LE(pos + 20);
    const nameLen = zipBuffer.readUInt16LE(pos + 28);
    const extraLen = zipBuffer.readUInt16LE(pos + 30);
    const commentLen = zipBuffer.readUInt16LE(pos + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(pos + 42);
    const name = zipBuffer.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');

    pos += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith('/')) continue;

    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawData = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (compression === 0) {
      data = Buffer.from(rawData);
    } else if (compression === 8) {
      data = inflateRawSync(rawData);
    } else {
      continue;
    }

    entries.push({ name, data });
  }

  // Find manifest
  const manifestEntry = entries.find((e) => e.name === 'manifest.json' || e.name.endsWith('/manifest.json'));
  if (!manifestEntry) throw new Error('Asset pack missing manifest.json');

  const manifest: PackManifest = JSON.parse(manifestEntry.data.toString('utf8'));

  // Load all assets
  const assets: LoadedAsset[] = [];
  for (const desc of manifest.assets) {
    const entry = entries.find((e) => e.name === desc.file || e.name.endsWith(`/${desc.file}`));
    if (entry) {
      assets.push({ descriptor: desc, buffer: entry.data });
    }
  }

  return { manifest, assets };
}

/**
 * Load an asset pack from a file path.
 */
export async function loadAssetPackFromFile(filePath: string): Promise<{ manifest: PackManifest; assets: LoadedAsset[] }> {
  const buf = await fs.readFile(filePath);
  return loadAssetPack(buf);
}
