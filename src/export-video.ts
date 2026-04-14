import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface VideoExportOptions {
  width: number;
  height: number;
  format: 'mp4' | 'webm';
  fps: number;
  crf: number;
}

export async function exportVideo(
  pngBuffers: Buffer[],
  options: VideoExportOptions,
): Promise<Buffer> {
  // Check ffmpeg availability
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch {
    throw new Error('ffmpeg is not installed or not in PATH. Install ffmpeg to use video export.');
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fluxcii-video-'));

  try {
    // Write frames as numbered PNGs
    for (let i = 0; i < pngBuffers.length; i++) {
      await fs.writeFile(path.join(tmpDir, `frame_${i.toString().padStart(5, '0')}.png`), pngBuffers[i]);
    }

    const outputPath = path.join(tmpDir, `output.${options.format}`);

    const args: string[] = [
      '-y',
      '-framerate', options.fps.toString(),
      '-i', path.join(tmpDir, 'frame_%05d.png'),
    ];

    if (options.format === 'mp4') {
      // Ensure even dimensions for H.264
      const w = options.width % 2 === 0 ? options.width : options.width + 1;
      const h = options.height % 2 === 0 ? options.height : options.height + 1;
      args.push(
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', options.crf.toString(),
        '-vf', `scale=${w}:${h}`,
      );
    } else {
      args.push(
        '-c:v', 'libvpx-vp9',
        '-pix_fmt', 'yuva420p',
        '-crf', options.crf.toString(),
        '-b:v', '0',
      );
    }

    args.push(outputPath);

    await execFileAsync('ffmpeg', args, { timeout: 60000 });
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
