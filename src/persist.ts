import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Scene } from './types.js';
import type { Animation } from './animation-types.js';
import { storeScene, storeAnimation, getScene, getAnimation, listScenes, listAnimations } from './store.js';

export interface ProjectFile {
  version: 1;
  scenes: Scene[];
  animations: Animation[];
}

function getProjectDir(): string {
  return process.env.FLUXCII_PROJECT_DIR ?? path.join(os.homedir(), '.fluxcii', 'projects');
}

export async function saveProject(name: string): Promise<string> {
  const dir = getProjectDir();
  await fs.mkdir(dir, { recursive: true });

  const scenes = listScenes().map((s) => getScene(s.id));
  const animations = listAnimations().map((a) => getAnimation(a.id));

  // Strip prev (undo state) from scenes
  const cleanScenes = scenes.map(({ prev, ...rest }) => rest) as Scene[];

  const project: ProjectFile = {
    version: 1,
    scenes: cleanScenes,
    animations,
  };

  const filePath = path.join(dir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(project, null, 2));
  return filePath;
}

export async function loadProject(name: string): Promise<{ sceneCount: number; animationCount: number }> {
  const dir = getProjectDir();
  const filePath = path.join(dir, `${name}.json`);

  const raw = await fs.readFile(filePath, 'utf-8');
  const project: ProjectFile = JSON.parse(raw);

  for (const scene of project.scenes) {
    storeScene(scene);
  }
  for (const anim of project.animations) {
    storeAnimation(anim);
  }

  return {
    sceneCount: project.scenes.length,
    animationCount: project.animations.length,
  };
}

export async function listProjects(): Promise<string[]> {
  const dir = getProjectDir();
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}
