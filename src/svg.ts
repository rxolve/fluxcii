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
  FillValue,
  Gradient,
  Transform,
  Filter,
} from './types.js';
import { getPalette, resolveColorName } from './palette.js';
import { resolveStyle } from './style.js';
import { DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY } from './constants.js';

interface SvgContext {
  defs: string[];
  gradientCounter: number;
  filterCounter: number;
  paletteId?: string;
}

export function sceneToSvg(scene: Scene): string {
  const ctx: SvgContext = { defs: [], gradientCounter: 0, filterCounter: 0, paletteId: scene.palette };
  const palette = getPalette(scene.palette);

  const bg = scene.background
    ? resolveColorName(scene.background, palette)
    : undefined;

  const childrenSvg = scene.root.children
    .filter((n) => n.visible !== false)
    .map((n) => nodeToSvg(n, ctx, palette))
    .join('\n');

  const defsBlock = ctx.defs.length > 0 ? `  <defs>\n${ctx.defs.join('\n')}\n  </defs>\n` : '';
  const bgRect = bg ? `  <rect width="${scene.width}" height="${scene.height}" fill="${bg}"/>\n` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">\n${defsBlock}${bgRect}${childrenSvg}\n</svg>`;
}

function nodeToSvg(node: SceneNode, ctx: SvgContext, palette: ReturnType<typeof getPalette>): string {
  if (node.visible === false) return '';

  const resolvedStyle = node.style ? resolveStyle(node.style, palette) : undefined;
  const styleAttrs = resolvedStyle ? buildStyleAttrs(resolvedStyle, ctx) : '';
  const transformAttr = node.transform ? ` transform="${buildTransform(node.transform)}"` : '';
  const filterAttr = resolvedStyle?.filter ? buildFilterAttr(resolvedStyle.filter, ctx) : '';
  const clipAttr = resolvedStyle?.clip ? ` clip-path="url(#clip-${resolvedStyle.clip})"` : '';
  const maskAttr = resolvedStyle?.mask ? ` mask="url(#mask-${resolvedStyle.mask})"` : '';
  const extraAttrs = filterAttr + clipAttr + maskAttr;

  switch (node.type) {
    case 'rect':
      return rectToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'circle':
      return circleToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'ellipse':
      return ellipseToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'line':
      return lineToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'polygon':
      return polygonToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'path':
      return pathToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'text':
      return textToSvg(node, styleAttrs, transformAttr + extraAttrs);
    case 'image':
      return imageToSvg(node, resolvedStyle, transformAttr + extraAttrs);
    case 'group':
      return groupToSvg(node, ctx, palette, styleAttrs, transformAttr + extraAttrs);
  }
}

function rectToSvg(n: RectNode, style: string, transform: string): string {
  const rx = n.rx ? ` rx="${n.rx}"` : '';
  const ry = n.ry ? ` ry="${n.ry}"` : '';
  return `  <rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}"${rx}${ry}${style}${transform}/>`;
}

function circleToSvg(n: CircleNode, style: string, transform: string): string {
  return `  <circle cx="${n.cx}" cy="${n.cy}" r="${n.r}"${style}${transform}/>`;
}

function ellipseToSvg(n: EllipseNode, style: string, transform: string): string {
  return `  <ellipse cx="${n.cx}" cy="${n.cy}" rx="${n.rx}" ry="${n.ry}"${style}${transform}/>`;
}

function lineToSvg(n: LineNode, style: string, transform: string): string {
  return `  <line x1="${n.x1}" y1="${n.y1}" x2="${n.x2}" y2="${n.y2}"${style}${transform}/>`;
}

function polygonToSvg(n: PolygonNode, style: string, transform: string): string {
  const pts = n.points.map((p) => `${p.x},${p.y}`).join(' ');
  return `  <polygon points="${pts}"${style}${transform}/>`;
}

function pathToSvg(n: PathNode, style: string, transform: string): string {
  return `  <path d="${n.d}"${style}${transform}/>`;
}

function textToSvg(n: TextNode, style: string, transform: string): string {
  const fontSize = n.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = n.fontFamily ?? DEFAULT_FONT_FAMILY;
  const weight = n.fontWeight ? ` font-weight="${n.fontWeight}"` : '';
  const anchor = n.textAnchor ? ` text-anchor="${n.textAnchor}"` : '';
  const escaped = escapeXml(n.text);
  return `  <text x="${n.x}" y="${n.y}" font-size="${fontSize}" font-family="${fontFamily}"${weight}${anchor}${style}${transform}>${escaped}</text>`;
}

function imageToSvg(n: ImageNode, style: Style | undefined, transform: string): string {
  const opacity = style?.opacity !== undefined ? ` opacity="${style.opacity}"` : '';
  return `  <image href="${n.href}" x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}"${opacity}${transform}/>`;
}

function groupToSvg(
  n: GroupNode,
  ctx: SvgContext,
  palette: ReturnType<typeof getPalette>,
  style: string,
  transform: string,
): string {
  const children = n.children
    .filter((c) => c.visible !== false)
    .map((c) => nodeToSvg(c, ctx, palette))
    .join('\n');
  return `  <g${style}${transform}>\n${children}\n  </g>`;
}

// ── Filter support ──

function buildFilterAttr(filter: Filter, ctx: SvgContext): string {
  const parts: string[] = [];

  if (filter.blur) {
    parts.push(`    <feGaussianBlur in="SourceGraphic" stdDeviation="${filter.blur}"/>`);
  }

  if (filter.dropShadow) {
    const ds = filter.dropShadow;
    parts.push(`    <feDropShadow dx="${ds.dx}" dy="${ds.dy}" stdDeviation="${ds.blur}" flood-color="${ds.color}"/>`);
  }

  if (filter.glow) {
    const g = filter.glow;
    parts.push(`    <feGaussianBlur in="SourceGraphic" stdDeviation="${g.radius}" result="glow"/>`);
    parts.push(`    <feFlood flood-color="${g.color}" result="glowColor"/>`);
    parts.push(`    <feComposite in="glowColor" in2="glow" operator="in" result="coloredGlow"/>`);
    parts.push(`    <feMerge>`);
    parts.push(`      <feMergeNode in="coloredGlow"/>`);
    parts.push(`      <feMergeNode in="SourceGraphic"/>`);
    parts.push(`    </feMerge>`);
  }

  if (parts.length === 0) return '';

  const filterId = `filter${++ctx.filterCounter}`;
  ctx.defs.push(`    <filter id="${filterId}">\n${parts.join('\n')}\n    </filter>`);
  return ` filter="url(#${filterId})"`;
}

// ── Style attributes ──

function buildStyleAttrs(style: Style, ctx: SvgContext): string {
  let attrs = '';
  if (style.fill !== undefined) {
    attrs += ` fill="${resolveFillAttr(style.fill, ctx)}"`;
  }
  if (style.stroke) {
    attrs += ` stroke="${style.stroke.color}" stroke-width="${style.stroke.width}"`;
    if (style.stroke.dasharray) {
      attrs += ` stroke-dasharray="${style.stroke.dasharray}"`;
    }
  }
  if (style.opacity !== undefined) {
    attrs += ` opacity="${style.opacity}"`;
  }
  return attrs;
}

function resolveFillAttr(fill: FillValue, ctx: SvgContext): string {
  if (fill === 'none') return 'none';
  if (typeof fill === 'string') return fill;
  // Gradient — add to defs and return url(#id)
  const gradId = `grad${++ctx.gradientCounter}`;
  ctx.defs.push(buildGradientDef(fill, gradId));
  return `url(#${gradId})`;
}

function buildGradientDef(grad: Gradient, id: string): string {
  const stops = grad.stops
    .map((s) => `      <stop offset="${s.offset}" stop-color="${s.color}"/>`)
    .join('\n');

  if (grad.type === 'linear') {
    const rad = (grad.angle * Math.PI) / 180;
    const x1 = 50 - 50 * Math.cos(rad);
    const y1 = 50 - 50 * Math.sin(rad);
    const x2 = 50 + 50 * Math.cos(rad);
    const y2 = 50 + 50 * Math.sin(rad);
    return `    <linearGradient id="${id}" x1="${x1.toFixed(1)}%" y1="${y1.toFixed(1)}%" x2="${x2.toFixed(1)}%" y2="${y2.toFixed(1)}%">\n${stops}\n    </linearGradient>`;
  }

  // Radial
  return `    <radialGradient id="${id}" cx="${(grad.cx * 100).toFixed(1)}%" cy="${(grad.cy * 100).toFixed(1)}%" r="${(grad.r * 100).toFixed(1)}%">\n${stops}\n    </radialGradient>`;
}

// ── Transform ──

function buildTransform(t: Transform): string {
  const parts: string[] = [];
  if (t.translate) parts.push(`translate(${t.translate.x},${t.translate.y})`);
  if (t.rotate !== undefined) parts.push(`rotate(${t.rotate})`);
  if (t.scale !== undefined) {
    if (typeof t.scale === 'number') {
      parts.push(`scale(${t.scale})`);
    } else {
      parts.push(`scale(${t.scale.x},${t.scale.y})`);
    }
  }
  return parts.join(' ');
}

// ── Utility ──

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
