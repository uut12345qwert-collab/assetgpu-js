# API Reference

All public entry points are exported from the package root:

```js
import {
  exportImage,
  exportFavicon,
  exportVideo,
  exportAudio,
  FragmentRenderer,
  ComputeAudioRenderer,
} from 'assetgpu';
```

## `exportImage(opts)` → `Promise<Buffer>`

Renders one frame of a fragment shader to a still image.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wgsl` | string | required | Fragment WGSL with `fs_main` |
| `width` | number | required | Output width |
| `height` | number | required | Output height |
| `format` | string | required | `png` \| `jpeg` \| `jpg` \| `webp` \| `avif` \| `gif` |
| `time` | number | `0` | Seconds → `builtin.time` |
| `vertexWgsl` | string | default triangle | Optional custom vertex stage |
| `encodeOptions` | object | `{}` | Passed through to sharp |

Requires peer **`sharp`**.

## `exportFavicon(opts)` → `Promise<Buffer>`

Renders once, resizes to multiple sizes, packs a multi-resolution `.ico`.

| Option | Type | Default |
|--------|------|---------|
| `wgsl` | string | required |
| `sourceSize` | number | `256` |
| `time` | number | `0` |
| `sizes` | number[] | `[16,32,48,64]` |
| `vertexWgsl` | string | default |

## `exportVideo(opts)` → `Promise<Buffer>`

Renders a time sequence and encodes with FFmpeg.

| Option | Type | Default |
|--------|------|---------|
| `wgsl` | string | required |
| `width` / `height` | number | required |
| `format` | string | required (`mp4` \| `webm` \| `ogv` \| `gif`) |
| `durationSeconds` | number | required |
| `fps` | number | `30` |
| `vertexWgsl` | string | default |
| `onProgress` | `(done, total) => void` | — |
| `encodeOptions` | object | e.g. `{ crf }` |

Requires peer **`@ffmpeg-installer/ffmpeg`**.

**Encoding behavior:** frames are streamed to FFmpeg **stdin** (not written as a giant `frames.rgba`). See [Debugs and Fixes](Debugs-and-Fixes).

## `exportAudio(opts)` → `Promise<Buffer>`

| Option | Type | Default |
|--------|------|---------|
| `wgsl` | string | required |
| `durationSeconds` | number | required |
| `format` | string | required (`wav` \| `mp3` \| `ogg`) |
| `sampleRate` | number | `44100` |
| `workgroupSize` | number | `64` (must match `@workgroup_size(N)`) |
| `encodeOptions` | object | e.g. `{ bitrateKbps }` for mp3 |

- `wav`: pure JS encoder (no ffmpeg)
- `mp3` / `ogg`: needs `@ffmpeg-installer/ffmpeg`

## CLI (`bin/assetgpu.js`)

```
assetgpu image|video|audio --wgsl <file> --out <file> [options]
```

Common flags: `--width`, `--height`, `--format`, `--duration`, `--fps`, `--time`, `--sample-rate`.

## Low-level classes

- **`FragmentRenderer`** — full-screen triangle → RGBA buffers / frame sequences  
- **`ComputeAudioRenderer`** — compute dispatch → `Float32Array` samples  

Use these when you want to render once and encode to multiple formats yourself.
