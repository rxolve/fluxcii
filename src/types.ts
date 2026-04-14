// ── Primitives ──

export interface Point {
  x: number;
  y: number;
}

// ── Gradient ──

export interface GradientStop {
  offset: number; // 0–1
  color: string; // hex or palette color name
}

export interface LinearGradient {
  type: 'linear';
  angle: number; // degrees
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial';
  cx: number; // 0–1 relative
  cy: number;
  r: number;
  stops: GradientStop[];
}

export type Gradient = LinearGradient | RadialGradient;

// ── Style ──

export type FillValue = string | Gradient | 'none'; // string = hex or palette name

export interface Stroke {
  color: string;
  width: number;
  dasharray?: string;
}

export interface DropShadow {
  dx: number;
  dy: number;
  blur: number;
  color: string;
}

export interface Filter {
  blur?: number;
  dropShadow?: DropShadow;
  glow?: { radius: number; color: string };
}

export interface Style {
  fill?: FillValue;
  stroke?: Stroke;
  opacity?: number; // 0–1
  filter?: Filter;
  clip?: string;   // reference to a path node ID for clipPath
  mask?: string;    // reference to a node ID for mask
}

// ── Transform ──

export interface Transform {
  translate?: Point;
  rotate?: number; // degrees
  scale?: number | Point;
}

// ── Scene Nodes ──

interface BaseNode {
  id: string;
  type: string;
  name?: string;
  style?: Style;
  transform?: Transform;
  visible?: boolean;
}

export interface RectNode extends BaseNode {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
}

export interface CircleNode extends BaseNode {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseNode extends BaseNode {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface LineNode extends BaseNode {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolygonNode extends BaseNode {
  type: 'polygon';
  points: Point[];
}

export interface PathNode extends BaseNode {
  type: 'path';
  d: string; // SVG path data
}

export interface TextNode extends BaseNode {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAnchor?: 'start' | 'middle' | 'end';
}

export interface ImageNode extends BaseNode {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  href: string; // data URI (data:image/png;base64,...)
}

export interface GroupNode extends BaseNode {
  type: 'group';
  children: SceneNode[];
}

export type SceneNode =
  | RectNode
  | CircleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | PathNode
  | TextNode
  | ImageNode
  | GroupNode;

export type ShapeNode = Exclude<SceneNode, TextNode | GroupNode>;

// ── Layer ──

export interface Layer {
  id: string;
  name: string;
  groupId: string;   // references a GroupNode
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

// ── Scene ──

export interface Scene {
  id: string;
  width: number;
  height: number;
  background?: string; // hex or palette color name
  root: GroupNode;
  palette?: string; // palette ID
  prev?: GroupNode; // for undo
  layers?: Layer[];
}

// ── Palette ──

export interface PaletteColor {
  name: string;
  hex: string;
}

export interface Palette {
  id: string;
  name: string;
  theme: string;
  colors: PaletteColor[];
  background: string; // hex
  foreground: string; // hex
}
