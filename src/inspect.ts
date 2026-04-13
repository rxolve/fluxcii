import type { Scene, SceneNode, GroupNode } from './types.js';
import { fillToString } from './style.js';
import { totalNodes } from './scene.js';

export function inspectScene(scene: Scene): string {
  const nodeCount = totalNodes(scene) - 1; // exclude root
  const palettePart = scene.palette ? ` | palette: ${scene.palette}` : '';
  const bgPart = scene.background ? ` | bg: ${scene.background}` : '';

  let header = `scene: ${scene.id} | ${scene.width}x${scene.height}${palettePart}${bgPart} | ${nodeCount} nodes`;
  if (nodeCount === 0) return header + '\n  (empty)';

  const tree = scene.root.children
    .map((n) => formatNode(n, 1))
    .join('\n');

  return header + '\n' + tree;
}

function formatNode(node: SceneNode, depth: number): string {
  const indent = '  '.repeat(depth);
  const nameStr = node.name ? ` ${node.name}` : '';
  const visStr = node.visible === false ? ' [hidden]' : '';

  switch (node.type) {
    case 'rect': {
      const fillStr = fillToString(node.style?.fill);
      const strokeStr = node.style?.stroke ? ` stroke:${node.style.stroke.color}/${node.style.stroke.width}` : '';
      return `${indent}[rect]${nameStr} | ${node.x},${node.y} ${node.width}x${node.height}${fillStr ? ` fill:${fillStr}` : ''}${strokeStr}${visStr}`;
    }
    case 'circle': {
      const fillStr = fillToString(node.style?.fill);
      const strokeStr = node.style?.stroke ? ` stroke:${node.style.stroke.color}/${node.style.stroke.width}` : '';
      return `${indent}[circle]${nameStr} | cx:${node.cx} cy:${node.cy} r:${node.r}${fillStr ? ` fill:${fillStr}` : ''}${strokeStr}${visStr}`;
    }
    case 'ellipse': {
      const fillStr = fillToString(node.style?.fill);
      return `${indent}[ellipse]${nameStr} | cx:${node.cx} cy:${node.cy} rx:${node.rx} ry:${node.ry}${fillStr ? ` fill:${fillStr}` : ''}${visStr}`;
    }
    case 'line': {
      const strokeStr = node.style?.stroke ? ` stroke:${node.style.stroke.color}/${node.style.stroke.width}` : '';
      return `${indent}[line]${nameStr} | ${node.x1},${node.y1} -> ${node.x2},${node.y2}${strokeStr}${visStr}`;
    }
    case 'polygon': {
      const fillStr = fillToString(node.style?.fill);
      const ptCount = node.points.length;
      return `${indent}[polygon]${nameStr} | ${ptCount} points${fillStr ? ` fill:${fillStr}` : ''}${visStr}`;
    }
    case 'path': {
      const fillStr = fillToString(node.style?.fill);
      const dPreview = node.d.length > 40 ? node.d.slice(0, 37) + '...' : node.d;
      return `${indent}[path]${nameStr} | d="${dPreview}"${fillStr ? ` fill:${fillStr}` : ''}${visStr}`;
    }
    case 'text': {
      const fillStr = fillToString(node.style?.fill);
      const textPreview = node.text.length > 30 ? node.text.slice(0, 27) + '...' : node.text;
      return `${indent}[text]${nameStr} | ${node.x},${node.y} "${textPreview}"${fillStr ? ` fill:${fillStr}` : ''}${visStr}`;
    }
    case 'image': {
      const sizeKB = Math.round((node.href.length * 3) / 4 / 1024);
      return `${indent}[image]${nameStr} | ${node.x},${node.y} ${node.width}x${node.height} (${sizeKB} KB)${visStr}`;
    }
    case 'group': {
      const childCount = node.children.length;
      const header = `${indent}[group]${nameStr} (${childCount} children)${visStr}`;
      const children = node.children.map((c) => formatNode(c, depth + 1)).join('\n');
      return children ? `${header}\n${children}` : header;
    }
  }
}
