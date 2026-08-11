# Tutorials

## 1. Gradient PNG in 10 lines

```js
import { exportImage } from 'assetgpu';
import { writeFile } from 'node:fs/promises';

const buf = await exportImage({
  wgsl: `@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(uv.x, uv.y, 0.25, 1.0);
  }`,
  width: 256,
  height: 256,
  format: 'png',
});
await writeFile('out.png', buf);
```

## 2. Time-based animation → MP4

Use `builtin.time` in the fragment shader and `exportVideo` with `durationSeconds` + `fps`.

```js
const mp4 = await exportVideo({
  wgsl: `@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let t = builtin.time;
    let c = 0.5 + 0.5 * sin(t + uv.x * 6.28);
    return vec4f(c, uv.y, 1.0 - c, 1.0);
  }`,
  width: 640,
  height: 360,
  format: 'mp4',
  durationSeconds: 3,
  fps: 30,
  onProgress: (d, t) => console.log(`${d}/${t}`),
});
```

## 3. Build-step texture bake

In `package.json`:

```json
"scripts": {
  "bake-assets": "node scripts/bake.js"
}
```

`scripts/bake.js` imports `exportImage` / `exportVideo` and writes into `public/assets/`.

## 4. Favicon from one shader

```js
import { exportFavicon } from 'assetgpu';
const ico = await exportFavicon({ wgsl: myFragmentWgsl, sizes: [16, 32, 48] });
```

## 5. Custom audio workgroup size

WGSL:

```wgsl
@compute @workgroup_size(128)
fn cs_main(/* ... */) { /* ... */ }
```

JS:

```js
await exportAudio({ wgsl, durationSeconds: 2, format: 'wav', workgroupSize: 128 });
```

## 6. Repo examples

See `test/examples/`:

- `fragment-gradient.wgsl`
- `fragment-time.wgsl`
- `compute-tone.wgsl`
- `run-examples.js` (renders PNG + WAV when WebGPU + sharp are available)
