/**
 * Semantic position resolver.
 * Converts named positions like "center", "top-left" to pixel coordinates.
 */

export type SemanticPosition =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'
  | 'off-left' | 'off-right' | 'off-top' | 'off-bottom';

const SEMANTIC_POSITIONS: ReadonlySet<string> = new Set([
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
  'off-left', 'off-right', 'off-top', 'off-bottom',
]);

export function isSemanticPosition(value: string): value is SemanticPosition {
  return SEMANTIC_POSITIONS.has(value);
}

/**
 * Resolve a semantic position to pixel coordinates.
 * Returns the top-left corner position for an element of the given size.
 */
export function resolvePosition(
  position: SemanticPosition,
  sceneWidth: number,
  sceneHeight: number,
  elementWidth: number,
  elementHeight: number,
): { x: number; y: number } {
  const margin = 0.05; // 5% margin from edges
  const mx = Math.round(sceneWidth * margin);
  const my = Math.round(sceneHeight * margin);

  switch (position) {
    case 'top-left':
      return { x: mx, y: my };
    case 'top':
      return { x: Math.round((sceneWidth - elementWidth) / 2), y: my };
    case 'top-right':
      return { x: sceneWidth - elementWidth - mx, y: my };
    case 'left':
      return { x: mx, y: Math.round((sceneHeight - elementHeight) / 2) };
    case 'center':
      return {
        x: Math.round((sceneWidth - elementWidth) / 2),
        y: Math.round((sceneHeight - elementHeight) / 2),
      };
    case 'right':
      return { x: sceneWidth - elementWidth - mx, y: Math.round((sceneHeight - elementHeight) / 2) };
    case 'bottom-left':
      return { x: mx, y: sceneHeight - elementHeight - my };
    case 'bottom':
      return { x: Math.round((sceneWidth - elementWidth) / 2), y: sceneHeight - elementHeight - my };
    case 'bottom-right':
      return { x: sceneWidth - elementWidth - mx, y: sceneHeight - elementHeight - my };
    case 'off-left':
      return { x: -elementWidth, y: Math.round((sceneHeight - elementHeight) / 2) };
    case 'off-right':
      return { x: sceneWidth, y: Math.round((sceneHeight - elementHeight) / 2) };
    case 'off-top':
      return { x: Math.round((sceneWidth - elementWidth) / 2), y: -elementHeight };
    case 'off-bottom':
      return { x: Math.round((sceneWidth - elementWidth) / 2), y: sceneHeight };
  }
}

export const SEMANTIC_POSITION_NAMES: SemanticPosition[] = [
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
  'off-left', 'off-right', 'off-top', 'off-bottom',
];
