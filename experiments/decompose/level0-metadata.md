# Level 0 — Metadata round-trip

## Idea

When exporting, optionally attach the source WGSL to the file.
When decomposing, read it back.

## PNG

- Use `tEXt` or `iTXt` with keyword `assetgpu:wgsl` (and maybe `assetgpu:kind=fragment|compute`).
- sharp / pngjs can write and read text chunks.

## WAV

- Prefer a trailing custom chunk or a JSON sidecar `file.wav.assetgpu.json` for v1 simplicity.

## Video

- Sidecar `file.mp4.assetgpu.json` first; container metadata later.

## API sketch (not implemented yet)

```js
// export with embed
await exportImage({ wgsl, width, height, format: 'png', embedSource: true });

// decompose
const { wgsl, kind, method } = await decomposeAsset('out.png');
// method === 'metadata' when Level 0 succeeds
```

## Acceptance test

1. Export PNG with `embedSource: true`.
2. `decomposeAsset` returns the same WGSL string.
3. Re-export without looking at the original string; pixels match within tolerance.
