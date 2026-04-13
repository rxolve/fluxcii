import type {
  Scene,
  SceneNode,
  GroupNode,
  RectNode,
  CircleNode,
  EllipseNode,
  LineNode,
  PolygonNode,
  PathNode,
  TextNode,
  ImageNode,
  Style,
  Transform,
  Point,
} from './types.js';
import { MAX_NODES_PER_SCENE, MAX_GROUP_DEPTH } from './constants.js';

let _nodeCounter = 0;

export function nextNodeId(): string {
  return `n${(++_nodeCounter).toString().padStart(4, '0')}`;
}

export function resetNodeCounter(): void {
  _nodeCounter = 0;
}

// ── Scene creation ──

export function createScene(
  id: string,
  width: number,
  height: number,
  background?: string,
  palette?: string,
): Scene {
  return {
    id,
    width,
    height,
    background,
    root: { id: 'root', type: 'group', name: 'root', children: [] },
    palette,
  };
}

// ── Node count ──

export function countNodes(node: SceneNode): number {
  if (node.type === 'group') {
    return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
  }
  return 1;
}

export function totalNodes(scene: Scene): number {
  return countNodes(scene.root);
}

// ── Tree traversal ──

export function findNode(root: GroupNode, id: string): SceneNode | null {
  for (const child of root.children) {
    if (child.id === id) return child;
    if (child.type === 'group') {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(root: GroupNode, id: string): GroupNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    if (child.type === 'group') {
      const found = findParent(child, id);
      if (found) return found;
    }
  }
  return null;
}

function groupDepth(root: GroupNode, targetId: string, depth = 0): number {
  if (root.id === targetId) return depth;
  for (const child of root.children) {
    if (child.type === 'group') {
      const d = groupDepth(child, targetId, depth + 1);
      if (d >= 0) return d;
    }
  }
  return -1;
}

// ── Add nodes ──

function resolveParent(scene: Scene, parentId?: string): GroupNode {
  if (!parentId) return scene.root;
  const node = findNode(scene.root, parentId);
  if (!node) throw new Error(`Parent "${parentId}" not found`);
  if (node.type !== 'group') throw new Error(`Parent "${parentId}" is not a group`);
  return node;
}

function checkLimits(scene: Scene, parentId?: string): void {
  if (totalNodes(scene) >= MAX_NODES_PER_SCENE) {
    throw new Error(`Scene has reached max node limit (${MAX_NODES_PER_SCENE})`);
  }
  if (parentId) {
    const depth = groupDepth(scene.root, parentId);
    if (depth >= MAX_GROUP_DEPTH) {
      throw new Error(`Max group nesting depth reached (${MAX_GROUP_DEPTH})`);
    }
  }
}

export function addRect(
  scene: Scene,
  props: { x: number; y: number; width: number; height: number; rx?: number; ry?: number; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): RectNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: RectNode = { id: nextNodeId(), type: 'rect', ...props };
  parent.children.push(node);
  return node;
}

export function addCircle(
  scene: Scene,
  props: { cx: number; cy: number; r: number; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): CircleNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: CircleNode = { id: nextNodeId(), type: 'circle', ...props };
  parent.children.push(node);
  return node;
}

export function addEllipse(
  scene: Scene,
  props: { cx: number; cy: number; rx: number; ry: number; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): EllipseNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: EllipseNode = { id: nextNodeId(), type: 'ellipse', ...props };
  parent.children.push(node);
  return node;
}

export function addLine(
  scene: Scene,
  props: { x1: number; y1: number; x2: number; y2: number; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): LineNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: LineNode = { id: nextNodeId(), type: 'line', ...props };
  parent.children.push(node);
  return node;
}

export function addPolygon(
  scene: Scene,
  props: { points: Point[]; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): PolygonNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: PolygonNode = { id: nextNodeId(), type: 'polygon', ...props };
  parent.children.push(node);
  return node;
}

export function addPath(
  scene: Scene,
  props: { d: string; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): PathNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: PathNode = { id: nextNodeId(), type: 'path', ...props };
  parent.children.push(node);
  return node;
}

export function addText(
  scene: Scene,
  props: {
    x: number; y: number; text: string;
    fontSize?: number; fontFamily?: string; fontWeight?: string;
    textAnchor?: 'start' | 'middle' | 'end';
    name?: string; style?: Style; transform?: Transform;
  },
  parentId?: string,
): TextNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: TextNode = { id: nextNodeId(), type: 'text', ...props };
  parent.children.push(node);
  return node;
}

export function addImage(
  scene: Scene,
  props: { x: number; y: number; width: number; height: number; href: string; name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): ImageNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: ImageNode = { id: nextNodeId(), type: 'image', ...props };
  parent.children.push(node);
  return node;
}

export function addGroup(
  scene: Scene,
  props: { name?: string; style?: Style; transform?: Transform },
  parentId?: string,
): GroupNode {
  checkLimits(scene, parentId);
  const parent = resolveParent(scene, parentId);
  const node: GroupNode = { id: nextNodeId(), type: 'group', children: [], ...props };
  parent.children.push(node);
  return node;
}

// ── Remove / update ──

export function removeNode(scene: Scene, id: string): boolean {
  const parent = findParent(scene.root, id);
  if (!parent) return false;
  const idx = parent.children.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  parent.children.splice(idx, 1);
  return true;
}

export function setNodeStyle(scene: Scene, id: string, style: Style): void {
  const node = findNode(scene.root, id);
  if (!node) throw new Error(`Node "${id}" not found`);
  node.style = { ...node.style, ...style };
}
