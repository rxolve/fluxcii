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
2. **Compose** scenes with sprites, shapes, text, layers, and groups
3. **Animate** with keyframe tracks, 14 easings, cubic-bezier, presets, and path motion
4. **Export** as SVG, GIF, APNG, spritesheet (with JSON atlas), or MP4/WebM video

## MCP Tools

### Scene Management

| Tool | Description |
|------|-------------|
| `create_illustration` | One-call scene creation with elements array |
| `new_scene` | Empty canvas, returns scene ID |
| `list_scenes` | List all stored scenes with dimensions and node counts |
| `delete_scene` | Delete a scene by ID |
| `inspect` | Get text tree of scene structure |
| `render` | Render scene to PNG |

### Shape & Node Tools

| Tool | Description |
|------|-------------|
| `add_shape` | Add rect, circle, ellipse, line, polygon, or path |
| `add_text` | Add text node |
| `add_image` | Add a raster image (PNG/JPEG) to a scene |
| `add_group` | Create group container |
| `set_style` | Apply fill, stroke, opacity to a node |
| `remove_node` | Remove a node from a scene |
| `clone_node` | Deep-clone a node (new IDs) |
| `move_node` | Re-parent or reorder a node |
| `update_node` | Partial update of node properties |

### Layer Tools

| Tool | Description |
|------|-------------|
| `add_layer` | Create a named layer with visibility/lock/opacity |
| `reorder_layers` | Change layer z-order |
| `set_layer_props` | Set visibility, lock, opacity |
| `set_filter` | Apply blur, drop shadow, or glow to a node |

### Animation Tools

| Tool | Description |
|------|-------------|
| `create_animation` | Create animation for a scene (up to 240 frames) |
| `add_track` | Animate a property with keyframes |
| `add_path_track` | Animate a node along an SVG path |
| `update_track` | Modify track keyframes |
| `remove_track` | Delete a track from animation |
| `animate_illustration` | One-call scene + animation creation |
| `render_animation` | Render all frames as PNGs |
| `list_animations` | List all stored animations |
| `delete_animation` | Delete an animation by ID |
| `apply_preset` | Apply a motion preset (fade-in, bounce-in, spin, etc.) |
| `compose_animations` | Sequence multiple animation segments |

### Export Tools

| Tool | Description |
|------|-------------|
| `export_svg` | Export scene as SVG markup |
| `export_gif` | Export animation as animated GIF |
| `export_apng` | Export animation as animated PNG |
| `export_spritesheet` | Export as spritesheet with optional JSON atlas |
| `export_video` | Export as MP4 or WebM (requires ffmpeg) |

### AI Generation

| Tool | Description |
|------|-------------|
| `generate_sprite` | AI sprite sheet generation via Gemini |

### Asset & Palette Tools

| Tool | Description |
|------|-------------|
| `register_palette` | Register a custom color palette |
| `list_palettes` | List all available palettes |
| `store_asset` | Save a node as a reusable asset |
| `load_asset` | Insert a stored asset into a scene |
| `list_assets` | List all stored assets |

### Project Persistence

| Tool | Description |
|------|-------------|
| `save_project` | Save all scenes/animations to disk |
| `load_project` | Load a saved project |
| `list_projects` | List saved projects |

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
- **Filters**: blur, drop shadow, glow
- **Clip paths & masks**: reference other nodes

### Palettes

4 built-in palettes: `kurz-space`, `kurz-bio`, `kurz-tech`, `kurz-warm`

Register custom palettes at runtime with `register_palette`.

### Layers

Named layers with visibility, lock, and opacity controls. Reorder z-order with `reorder_layers`.

### Animation

- **Keyframes**: animate any numeric property or color over time
- **14 easings**: `linear`, `ease-in`, `ease-out`, `ease-in-out`, cubic variants, `bounce`, `elastic`, `back`, `ease-in-expo`, `ease-out-expo`, `step-start`, `step-end`
- **Custom cubic-bezier**: `{ x1, y1, x2, y2 }` control points
- **6 motion presets**: `fade-in`, `fade-out`, `bounce-in`, `slide-left`, `pulse`, `spin`
- **Playback modes**: `normal`, `reverse`, `pingpong`
- **Track offset**: stagger animation start per track
- **Path animation**: move nodes along SVG paths
- **Composition**: sequence or overlay multiple animations

### Export formats

- **SVG**: vector markup text
- **GIF**: animated GIF with configurable delay and loop
- **APNG**: animated PNG (lossless)
- **Spritesheet**: horizontal, vertical, or grid layout with optional JSON atlas (Phaser/PixiJS/Unity compatible)
- **Video**: MP4 (H.264) or WebM (VP9) via ffmpeg

### Persistence

Save and load projects to disk as JSON. Configure storage path via `FLUXCII_PROJECT_DIR` env var (default: `~/.fluxcii/projects/`).

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
| Animation frames | 240 (8 sec @ 30fps) |
| Tracks per animation | 64 |

## License

MIT
