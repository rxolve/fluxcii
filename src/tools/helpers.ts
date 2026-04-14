import {
  createScene,
  addRect,
  addCircle,
  addEllipse,
  addLine,
  addPolygon,
  addPath,
  addText,
  addGroup,
  addImage,
} from '../scene.js';
import type { Style, GroupNode, SceneNode } from '../types.js';
import type { ElementInput } from './schemas.js';

export function addElement(scene: ReturnType<typeof createScene>, el: ElementInput, parentId?: string): void {
  const common = { name: el.name, style: el.style as Style | undefined, transform: el.transform };
  switch (el.type) {
    case 'rect':
      addRect(scene, { x: el.x ?? 0, y: el.y ?? 0, width: el.width ?? 100, height: el.height ?? 100, rx: el.rx, ry: el.ry, ...common }, parentId);
      break;
    case 'circle':
      addCircle(scene, { cx: el.cx ?? 0, cy: el.cy ?? 0, r: el.r ?? 50, ...common }, parentId);
      break;
    case 'ellipse':
      addEllipse(scene, { cx: el.cx ?? 0, cy: el.cy ?? 0, rx: el.rx ?? 50, ry: el.ry ?? 30, ...common }, parentId);
      break;
    case 'line':
      addLine(scene, { x1: el.x1 ?? 0, y1: el.y1 ?? 0, x2: el.x2 ?? 100, y2: el.y2 ?? 100, ...common }, parentId);
      break;
    case 'polygon':
      addPolygon(scene, { points: el.points ?? [], ...common }, parentId);
      break;
    case 'path':
      addPath(scene, { d: el.d ?? '', ...common }, parentId);
      break;
    case 'text':
      addText(scene, { x: el.x ?? 0, y: el.y ?? 0, text: el.text ?? '', fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, textAnchor: el.textAnchor, ...common }, parentId);
      break;
    case 'image':
      addImage(scene, { x: el.x ?? 0, y: el.y ?? 0, width: el.width ?? 100, height: el.height ?? 100, href: el.href ?? '', ...common }, parentId);
      break;
    case 'group': {
      const g = addGroup(scene, common, parentId);
      if (el.children) {
        for (const child of el.children) {
          addElement(scene, child, g.id);
        }
      }
      break;
    }
  }
}

export function findNodeByName(root: GroupNode, name: string): SceneNode | null {
  for (const child of root.children) {
    if (child.name === name) return child;
    if (child.type === 'group') {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}
