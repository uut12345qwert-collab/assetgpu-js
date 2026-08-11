# Getting Started

## Requirements

- Node.js **≥ 18**
- A working **WebGPU** backend via `npm install webgpu`

Optional:

```bash
npm install sharp                       # images + favicons
npm install @ffmpeg-installer/ffmpeg    # video + mp3/ogg
```

WAV-only workflows need only `assetgpu` + `webgpu`.

## Install

```bash
npm install assetgpu webgpu
# optional:
npm install sharp @ffmpeg-installer/ffmpeg
```

## First image (PNG)

```js
import { exportImage } from 'assetgpu';
import { writeFile } from 'node:fs/promises';

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

await writeFile('gradient.png', png);
```

## First audio (WAV)

```js
import { exportAudio } from 'assetgpu';
import { writeFile } from 'node:fs/promises';

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

await writeFile('tone.wav', wav);
```

## CLI

```bash
npx assetgpu image --wgsl shader.wgsl --width 512 --height 512 --format png --out out.png
npx assetgpu video --wgsl shader.wgsl --width 640 --height 360 --format mp4 --duration 2 --out out.mp4
npx assetgpu audio --wgsl audio.wgsl --duration 1 --format wav --out out.wav
```

## If WebGPU fails

The `webgpu` package wraps Dawn and is platform-sensitive. If `requestAdapter()` returns nothing:

- Prefer a machine/GPU that exposes WebGPU to Node, or
- Use a software stack (SwiftShader / lavapipe) in CI/headless servers.

That is an environment constraint, not a bug in assetgpu’s API layer.
