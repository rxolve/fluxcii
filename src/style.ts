import type { Style, FillValue, Gradient, GradientStop, Stroke } from './types.js';
import type { Palette } from './types.js';
import { resolveColorName } from './palette.js';

/** Resolve all color names in a style to hex using the palette. */
export function resolveStyle(style: Style, palette: Palette): Style {
  const resolved: Style = { ...style };
  if (style.fill !== undefined) {
    resolved.fill = resolveFill(style.fill, palette);
  }
  if (style.stroke) {
    resolved.stroke = resolveStroke(style.stroke, palette);
  }
  return resolved;
}

function resolveFill(fill: FillValue, palette: Palette): FillValue {
  if (fill === 'none') return 'none';
  if (typeof fill === 'string') return resolveColorName(fill, palette);
  // Gradient
  return resolveGradient(fill, palette);
}

function resolveGradient(grad: Gradient, palette: Palette): Gradient {
  const stops: GradientStop[] = grad.stops.map((s) => ({
    offset: s.offset,
    color: resolveColorName(s.color, palette),
  }));
  if (grad.type === 'linear') {
    return { ...grad, stops };
  }
  return { ...grad, stops };
}

function resolveStroke(stroke: Stroke, palette: Palette): Stroke {
  return {
    ...stroke,
    color: resolveColorName(stroke.color, palette),
  };
}

/** Build a CSS-like color string for inspect display. */
export function fillToString(fill: FillValue | undefined): string {
  if (!fill) return '';
  if (fill === 'none') return 'none';
  if (typeof fill === 'string') return fill;
  if (fill.type === 'linear') {
    const stopStr = fill.stops.map((s) => s.color).join('\u2192');
    return `linear(${stopStr})`;
  }
  const stopStr = fill.stops.map((s) => s.color).join('\u2192');
  return `radial(${stopStr})`;
}
