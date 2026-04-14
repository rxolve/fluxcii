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
  Layer,
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

// ── Clone / move / update ──

function reassignIds(node: SceneNode): SceneNode {
  const clone = { ...node, id: nextNodeId() };
  if (clone.type === 'group') {
    (clone as GroupNode).children = (clone as GroupNode).children.map((c) => reassignIds(c));
  }
  return clone as SceneNode;
}

export function cloneNode(scene: Scene, id: string, newParentId?: string): SceneNode {
  const original = findNode(scene.root, id);
  if (!original) throw new Error(`Node "${id}" not found`);
  const cloned = reassignIds(structuredClone(original));
  const parent = resolveParent(scene, newParentId);
  checkLimits(scene, newParentId);
  parent.children.push(cloned);
  return cloned;
}

export function moveNode(scene: Scene, id: string, newParentId: string, index?: number): void {
  const oldParent = findParent(scene.root, id);
  if (!oldParent) throw new Error(`Node "${id}" not found`);
  const idx = oldParent.children.findIndex((c) => c.id === id);
  const [node] = oldParent.children.splice(idx, 1);
  const newParent = newParentId === 'root' ? scene.root : resolveParent(scene, newParentId);
  if (index !== undefined && index >= 0 && index <= newParent.children.length) {
    newParent.children.splice(index, 0, node);
  } else {
    newParent.children.push(node);
  }
}

export function updateNode(scene: Scene, id: string, props: Record<string, unknown>): void {
  const node = findNode(scene.root, id);
  if (!node) throw new Error(`Node "${id}" not found`);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'id' || key === 'type' || key === 'children') continue;
    if (key === 'style') {
      node.style = { ...node.style, ...(value as Style) };
    } else if (key === 'transform') {
      node.transform = { ...node.transform, ...(value as Transform) };
    } else {
      (node as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

// ── Layer management ──

let _layerCounter = 0;

export function addLayer(scene: Scene, name: string): Layer {
  if (!scene.layers) scene.layers = [];
  const group = addGroup(scene, { name });
  const layer: Layer = {
    id: `layer-${(++_layerCounter).toString().padStart(3, '0')}`,
    name,
    groupId: group.id,
    visible: true,
    locked: false,
    opacity: 1,
    order: scene.layers.length,
  };
  scene.layers.push(layer);
  return layer;
}

export function reorderLayers(scene: Scene, layerIds: string[]): void {
  if (!scene.layers) throw new Error('Scene has no layers');
  const map = new Map(scene.layers.map((l) => [l.id, l]));
  const reordered: Layer[] = [];
  for (let i = 0; i < layerIds.length; i++) {
    const layer = map.get(layerIds[i]);
    if (!layer) throw new Error(`Layer "${layerIds[i]}" not found`);
    layer.order = i;
    reordered.push(layer);
  }
  scene.layers = reordered;

  // Reorder root children to match layer order
  const groupOrder = new Map(reordered.map((l, i) => [l.groupId, i]));
  scene.root.children.sort((a, b) => {
    const oa = groupOrder.get(a.id) ?? Infinity;
    const ob = groupOrder.get(b.id) ?? Infinity;
    return oa - ob;
  });
}

export function setLayerProps(
  scene: Scene,
  layerId: string,
  props: { visible?: boolean; locked?: boolean; opacity?: number },
): void {
  if (!scene.layers) throw new Error('Scene has no layers');
  const layer = scene.layers.find((l) => l.id === layerId);
  if (!layer) throw new Error(`Layer "${layerId}" not found`);
  if (props.visible !== undefined) layer.visible = props.visible;
  if (props.locked !== undefined) layer.locked = props.locked;
  if (props.opacity !== undefined) layer.opacity = props.opacity;

  // Apply visibility to the group node
  const group = findNode(scene.root, layer.groupId);
  if (group) {
    group.visible = layer.visible;
    if (!group.style) group.style = {};
    group.style.opacity = layer.opacity;
  }
}
