import { Resvg } from '@resvg/resvg-js';
import type { Scene } from './types.js';
import { sceneToSvg } from './svg.js';

export function renderToBuffer(scene: Scene): Buffer {
  const svg = sceneToSvg(scene);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: scene.width },
  });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

export function renderToBase64(scene: Scene): string {
  return renderToBuffer(scene).toString('base64');
}
