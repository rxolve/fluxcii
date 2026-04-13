# fluxcii

AI animation workbench — generate sprites, compose scenes, animate and export.

## Install

```bash
npx fluxcii
```

Or add to your MCP client config:

```json
{
  "mcpServers": {
    "fluxcii": {
      "command": "npx",
      "args": ["-y", "fluxcii"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Pipeline

**Generate → Compose → Animate → Export**

1. **Generate** AI sprites from text prompts via Gemini
2. **Compose** scenes with sprites, shapes, text, and groups
3. **Animate** with keyframe tracks, easing, and path motion
4. **Export** as GIF, animated PNG, or spritesheet

## MCP Tools (19)

### Generate

| Tool | Description |
|------|-------------|
| `generate_sprite` | AI sprite sheet generation via Gemini — auto-slices into frames and adds to scene |

### Compose

| Tool | Description |
|------|-------------|
| `create_illustration` | One-call scene creation with elements array |
| `new_scene` | Empty canvas, returns scene ID |
| `add_shape` | Add rect, circle, ellipse, line, polygon, or path |
| `add_text` | Add text node |
| `add_image` | Add a raster image (PNG/JPEG) to a scene |
| `add_group` | Create group container |
| `set_style` | Apply fill, stroke, opacity to a node |
| `inspect` | Get text tree of scene structure |
| `render` | Render scene to PNG |

### Animate

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

## Example prompt

> "Generate a running pixel-art cat sprite, place it on a grassy field with clouds, animate it running across the screen, and export as GIF."

The agent will:
1. `generate_sprite` — AI-generate a cat run cycle
2. `new_scene` + `add_image` — compose the background
3. `create_animation` + `add_track` — animate position and frame cycling
4. `export_gif` — produce the final animated file

## Features

### AI Sprite Generation

`generate_sprite` calls Gemini to create a sprite sheet from a text prompt, auto-slices it into frames, removes white backgrounds, and adds each frame to the scene as an image node. Requires `GEMINI_API_KEY`.

### Styling

- **Fill**: hex colors, palette names, linear/radial gradients, `"none"`
- **Stroke**: color, width, dasharray
- **Opacity**: 0-1
- **Transforms**: translate, rotate, scale

### Palettes

4 built-in color palettes: `kurz-space`, `kurz-bio`, `kurz-tech`, `kurz-warm`

### Animation

- **Keyframes**: animate any numeric property or color over time
- **Easing**: `linear`, `ease-in`, `ease-out`, `ease-in-out`, cubic variants
- **Playback modes**: `normal`, `reverse`, `pingpong`
- **Track offset**: stagger animation start per track
- **Path animation**: move nodes along SVG paths

### Export formats

- **GIF**: animated GIF with configurable delay and loop
- **APNG**: animated PNG (lossless)
- **Spritesheet**: horizontal, vertical, or grid layout

## Development

```bash
npm install
npm run build
npm test
npm run dev
```

## Limits

| Resource | Max |
|----------|-----|
| Scene dimensions | 1920 x 1080 |
| Scenes in memory | 20 |
| Nodes per scene | 200 |
| Animation frames | 32 |
| Tracks per animation | 32 |

## License

MIT
