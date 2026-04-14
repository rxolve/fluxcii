import sharp from 'sharp';

export interface TextLabelOptions {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  maxWidth?: number;
}

/**
 * Render text to a PNG buffer using sharp's SVG overlay capability.
 * Returns the buffer and its dimensions.
 */
export async function renderTextLabel(
  options: TextLabelOptions,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const {
    text,
    fontSize = 32,
    fontFamily = 'sans-serif',
    fontWeight = 'normal',
    color = '#ffffff',
    backgroundColor,
    padding = 10,
    maxWidth,
  } = options;

  // Estimate text dimensions (rough approximation)
  const charWidth = fontSize * 0.6;
  const lineHeight = fontSize * 1.3;
  const estimatedWidth = maxWidth
    ? Math.min(text.length * charWidth + padding * 2, maxWidth)
    : text.length * charWidth + padding * 2;

  // Word wrap if maxWidth is set
  const lines: string[] = [];
  if (maxWidth) {
    const charsPerLine = Math.floor((maxWidth - padding * 2) / charWidth);
    const words = text.split(' ');
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > charsPerLine && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) lines.push(currentLine.trim());
  } else {
    lines.push(text);
  }

  const width = Math.ceil(maxWidth ?? estimatedWidth);
  const height = Math.ceil(lines.length * lineHeight + padding * 2);

  // Escape XML special characters
  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Build SVG
  const bgRect = backgroundColor
    ? `<rect width="${width}" height="${height}" fill="${backgroundColor}" rx="4"/>`
    : '';

  const textElements = lines
    .map((line, i) => {
      const y = padding + fontSize + i * lineHeight;
      return `<text x="${padding}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${escapeXml(line)}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${bgRect}${textElements}</svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, width, height };
}
