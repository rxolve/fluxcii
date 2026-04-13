# vecscii

Vector illustration MCP server for AI agents. Create, animate, and export vector graphics through natural language.

## Install

```bash
npx vecscii
```

Or add to your MCP client config:

```json
{
  "mcpServers": {
    "vecscii": {
      "command": "npx",
      "args": ["-y", "vecscii"]
    }
  }
}
```

## What it does

vecscii gives AI agents a full vector graphics pipeline:

1. **Build** scenes from shapes, text, and groups
2. **Style** with fills, strokes, gradients, and palettes
3. **Animate** with keyframe tracks, easing, and path animation
4. **Export** as GIF, animated PNG, or spritesheet

All through MCP tools — no code generation needed.

## MCP Tools (16)

### Scene

| Tool | Description |
|------|-------------|
| `create_illustration` | One-call scene creation with elements array |
| `new_scene` | Empty canvas, returns scene ID |
| `add_shape` | Add rect, circle, ellipse, line, polygon, or path |
| `add_text` | Add text node |
| `add_group` | Create group container |
| `set_style` | Apply fill, stroke, opacity to a node |
| `inspect` | Get text tree of scene structure |
| `render` | Render scene to PNG |

### Animation

| Tool | Description |
|------|-------------|
| `create_animation` | Create animation for a scene (set frames, mode) |
| `add_track` | Animate a property with keyframes |
| `add_path_track` | Animate a node along an SVG path |
| `animate_illustration` | One-call scene + animation creation |
| `render_animation` | Render all frames as PNGs |

### Export

| Tool | Description |
|------|-------------|
| `export_gif` | Export animation as animated GIF |
| `export_apng` | Export animation as animated PNG |
| `export_spritesheet` | Export animation as tiled spritesheet |

## Features

### Shapes

8 node types: `rect`, `circle`, `ellipse`, `line`, `polygon`, `path`, `text`, `group`

### Styling

- **Fill**: hex colors, palette names, linear/radial gradients, `"none"`
- **Stroke**: color, width, dasharray
- **Opacity**: 0-1
- **Transforms**: translate, rotate, scale

### Palettes

4 built-in color palettes:

| ID | Theme |
|----|-------|
| `kurz-space` | Deep space, cosmic (default) |
| `kurz-bio` | Biology, organic |
| `kurz-tech` | Technology, digital |
| `kurz-warm` | Warm, cozy |

### Animation

- **Keyframes**: animate any numeric property or color over time
- **Easing**: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `ease-in-cubic`, `ease-out-cubic`, `ease-in-out-cubic`
- **Playback modes**: `normal`, `reverse`, `pingpong`
- **Track offset**: stagger animation start per track
- **Path animation**: move nodes along SVG paths (M/L/C/Z)

### Export formats

- **GIF**: animated GIF with configurable delay and loop
- **APNG**: animated PNG (lossless, smaller files)
- **Spritesheet**: horizontal, vertical, or grid layout

## Example prompt

> "Draw a night sky with stars and a yellow moon. Animate a shooting star flying across with a trail."

The agent will call `animate_illustration` with elements and tracks to produce a multi-frame animation, then `export_gif` to get a single animated file.

## Development

```bash
npm install
npm run build    # TypeScript → dist/
npm test         # vitest (104 tests)
npm run dev      # run with tsx
```

## Limits

| Resource | Max |
|----------|-----|
| Scene dimensions | 1920 x 1080 |
| Scenes in memory | 20 |
| Nodes per scene | 200 |
| Group nesting depth | 8 |
| Animation frames | 32 |
| Tracks per animation | 32 |
| Animations in memory | 10 |

## License

MIT
