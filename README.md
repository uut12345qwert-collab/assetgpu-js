# assetgpu

**JavaScript library that bakes WGSL shaders into real assets.**

`assetgpu` is a **Node.js / JavaScript library** for turning WebGPU / WGSL shaders into the files you actually ship:

```
Fragment shader  →  PNG · JPEG · WebP · AVIF · GIF · ICO
Fragment shader  →  MP4 · WebM · OGV · animated GIF
Compute shader   →  WAV · MP3 · OGG
```

Use it as a normal JS dependency in build scripts, generative art tools, game pipelines, or CI.

---

## Why assetgpu?

WebGPU is excellent for live rendering. Most pipelines still need traditional files:

- Game engines want textures and videos, not live shaders
- Generative artists need exportable PNGs and MP4s
- CI systems need deterministic visual snapshots
- Design tools need favicons and stills

This library runs your WGSL headlessly in Node and writes standard asset files.

---

## Install

```bash
npm install assetgpu
```

Optional peer dependencies (install only what you need):

```bash
npm install sharp                       # images + favicons
npm install @ffmpeg-installer/ffmpeg    # video + mp3/ogg
npm install webgpu                      # headless WebGPU (required for rendering)
```

> **Note:** The `webgpu` native binding is platform-sensitive. Headless environments often need a software renderer (SwiftShader / lavapipe) or a GPU-enabled machine.

---

## Quick start (JavaScript)

```js
import { exportImage, exportVideo, exportAudio } from 'assetgpu';

// Fragment shader → PNG
const png = await exportImage({
  wgsl: `
    @fragment
    fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
      return vec4f(uv.x, uv.y, 0.5, 1.0);
    }
  `,
  width: 512,
  height: 512,
  format: 'png',
});

// Fragment shader → MP4
const mp4 = await exportVideo({
  wgsl: `/* same shape */`,
  width: 640,
  height: 360,
  format: 'mp4',
  durationSeconds: 2,
  fps: 30,
});

// Compute shader → WAV (440 Hz tone)
const wav = await exportAudio({
  wgsl: `
    struct AudioParams {
      sampleRate: f32,
      totalSamples: u32,
      channels: u32,
      _pad: u32,
    };
    @group(0) @binding(0) var<uniform> params: AudioParams;
    @group(0) @binding(1) var<storage, read_write> samples: array<f32>;

    @compute @workgroup_size(64)
    fn cs_main(@builtin(global_invocation_id) id: vec3u) {
      let i = id.x;
      if (i >= params.totalSamples) { return; }
      let t = f32(i) / params.sampleRate;
      samples[i] = sin(2.0 * 3.14159265 * 440.0 * t) * 0.3;
    }
  `,
  durationSeconds: 1,
  format: 'wav',
});
```

---

## CLI

```bash
npx assetgpu image --wgsl shader.wgsl --width 512 --height 512 --format png --out out.png
npx assetgpu video --wgsl shader.wgsl --width 640 --height 360 --format mp4 --duration 2 --out out.mp4
npx assetgpu audio --wgsl audio.wgsl --duration 1 --format wav --out out.wav
```

---

## API

### `exportImage(opts)`
Renders one frame of a fragment shader to a still image.

| Option | Type | Description |
|--------|------|-------------|
| `wgsl` | string | Fragment shader with `fs_main` |
| `width` / `height` | number | Output size |
| `format` | string | `png` \| `jpeg` \| `webp` \| `avif` \| `gif` |
| `time` | number | Seconds (passed as `builtin.time`) |

### `exportFavicon(opts)`
Renders once and packs multiple sizes into a single `.ico`.

### `exportVideo(opts)`
Renders a sequence of frames → MP4 / WebM / OGV / animated GIF.

### `exportAudio(opts)`
Runs a compute shader → WAV / MP3 / OGG.

---

## Shader contracts

### Fragment shaders
The library injects this uniform automatically — do **not** declare it yourself:

```wgsl
struct BuiltinUniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
};
@group(0) @binding(0) var<uniform> builtin: BuiltinUniforms;
```

A full-screen triangle is supplied by default. UV is at `@location(0)`.

### Compute shaders (audio)
Your WGSL must follow this binding contract:

```wgsl
struct AudioParams {
  sampleRate: f32,
  totalSamples: u32,
  channels: u32,
  _pad: u32,
};
@group(0) @binding(0) var<uniform> params: AudioParams;
@group(0) @binding(1) var<storage, read_write> samples: array<f32>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) { ... }
```

Only mono is fully supported end-to-end right now.

---

## Common use cases

- **Game asset pipelines** – Pre-render textures / videos from shaders during `npm run build`
- **Generative art** – Export high-quality, reproducible stills and loops from procedural code
- **Visual regression testing** – Snapshot WebGPU output as PNGs in CI
- **Favicon / icon generation** – One shader → multi-size `.ico`

---

## Project structure

```
src/                     # JavaScript library source
  index.js               # Public API
  core/
    gpu-backend.js
    fragment-renderer.js
    compute-audio-renderer.js
  image/  encode-image.js
  video/  encode-video.js
  audio/  encode-audio.js
bin/
  assetgpu.js            # CLI entry point
```

---

## Development

```bash
git clone https://github.com/uut12345qwert-collab/assetgpu-js.git
cd assetgpu-js
npm install
npm test
```

---

## License

MIT
