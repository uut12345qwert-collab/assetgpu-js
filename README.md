# assetgpu

**JavaScript library that bakes WGSL shaders into real assets.**

`assetgpu` is a **Node.js / JavaScript library** for turning WebGPU / WGSL shaders into the files you actually ship:

```
Fragment shader  →  PNG · JPEG · WebP · AVIF · GIF · ICO
Fragment shader  →  MP4 · WebM · OGV · animated GIF
Compute shader   →  WAV · MP3 · OGG
```

Use it as a normal JS dependency in build scripts, generative art tools, game pipelines, or CI.

**Full documentation (wiki):** [docs/Home.md](docs/Home.md) — getting started, API, architecture, code walkthrough, tutorials, changelog, debugs & fixes.

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

**Required for any rendering:**

```bash
npm install webgpu
```

**Optional (install only what you need):**

```bash
npm install sharp                       # images + favicons
npm install @ffmpeg-installer/ffmpeg    # video + mp3/ogg
```

WAV audio works with **zero** extra deps beyond `webgpu`.

> **WebGPU on your machine:** The `webgpu` npm package is a native Dawn binding and is platform-sensitive. Many laptops work out of the box; headless servers often need a software renderer (SwiftShader / lavapipe) or a GPU-enabled environment. If `requestAdapter()` fails, that is an environment issue — not a bug in this library.

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
  wgsl: `/* same shape as above */`,
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
  // workgroupSize: 64,  // must match @workgroup_size(N) above
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

### `exportImage(opts)` / `exportVideo(opts)` / `exportFavicon(opts)`
See the tables in previous docs. All accept an optional `vertexWgsl` if you want to replace the default full-screen triangle.

### `exportAudio(opts)`

| Option | Type | Description |
|--------|------|-------------|
| `wgsl` | string | Compute shader with `cs_main` |
| `durationSeconds` | number | Length of the audio |
| `format` | string | `wav` \| `mp3` \| `ogg` |
| `sampleRate` | number | Default 44100 |
| `workgroupSize` | number | Default 64 — **must match** `@workgroup_size(N)` in your WGSL |

---

## Shader contracts (important)

### Fragment shaders

**You only write the fragment stage.** The library supplies a default full-screen triangle vertex stage.

#### What the library injects (do **not** redeclare)

```wgsl
struct BuiltinUniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
};
@group(0) @binding(0) var<uniform> builtin: BuiltinUniforms;
```

#### Default vertex stage (hidden — you do not write this)

```wgsl
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen triangle covering clip space
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var uvs = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );
  var out: VertexOutput;
  out.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  out.uv = uvs[vertexIndex];
  return out;
}
```

#### What you write

```wgsl
@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // uv comes from the default vertex stage above
  // builtin.time / builtin.resolution are available
  return vec4f(uv.x, uv.y, 0.5, 1.0);
}
```

If you need a custom vertex stage, pass `vertexWgsl` to `exportImage` / `exportVideo`.

### Compute shaders (audio)

Your WGSL must follow this binding contract. `@workgroup_size(N)` must match the `workgroupSize` option (default **64**):

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
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.totalSamples) { return; }
  // write samples[i] in [-1, 1]
}
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
docs/                    # Project wiki (maintained with the code)
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

---

## Debugs and fixes

A revised version of the video pipeline is in place. Details below.

### Issue: giant intermediate raw video (memory / disk)

Earlier versions of `encode-video.js` took every rendered frame, concatenated them with `Buffer.concat(...)` into one enormous binary buffer, wrote that buffer to a temporary file (`frames.rgba`), and only then asked FFmpeg to read it.

For long or high-resolution clips this was unsafe. Example: a **60 second** video at **60 FPS** in **1080p** is on the order of **~30 GB** of raw RGBA. That path could:

- exhaust process memory while building the concatenated buffer, and/or
- fill the disk with a multi-gigabyte temporary file before FFmpeg even started.

### Fix: stream frames to FFmpeg stdin

The current implementation streams each frame **directly to FFmpeg’s standard input** (`-i pipe:0`). It does **not**:

- concatenate all frames into one giant in-memory buffer, or
- write a raw `frames.rgba` file to disk.

Frames are written one-by-one to the FFmpeg process with backpressure handling. Only the **final encoded** output (MP4 / WebM / GIF / …) uses a small temporary file, which is required for muxers that need seekable output (e.g. MP4 with `+faststart`).

This revision lives in `src/video/encode-video.js`.

Full write-up: [docs/Debugs-and-Fixes.md](docs/Debugs-and-Fixes.md).
