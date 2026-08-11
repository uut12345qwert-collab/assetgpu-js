# Decomposition (experimental): assets → WGSL / WebGPU

> **Branch:** `experiments` only. Not part of stable `assetgpu` 1.x export API.

## Goal

Explore the **inverse** of the main library:

```
PNG / video / audio  →  WGSL source and/or WebGPU setup code
```

Forward path (stable today):

```
WGSL + WebGPU  →  PNG / MP4 / WAV
```

## Hard truth

You **cannot** uniquely recover the original generative WGSL from an arbitrary image or video.

Many different shaders (or non-shader programs) can produce the same pixels. Decomposition is therefore **lossy / approximate** unless extra information was stored on the way out.

## Practical levels (what we can actually build)

| Level | Name | What you get | Feasible? |
|-------|------|--------------|-----------|
| **0** | Round-trip metadata | Original WGSL recovered from PNG/MP4/WAV *if* export embedded it | Yes |
| **1** | Display wrapper | Generated WGSL + JS that samples the asset as a texture / buffer | Yes |
| **2** | Simple analytic fit | Solid color, linear gradient, basic patterns → parametric WGSL | Partial |
| **3** | Learned / search-based image→shader | Approximate shader that looks similar | Research-heavy |

**Recommended order on this branch:** Level 0 → Level 1 → optional Level 2.

## Proposed experiment layout

```
experiments/decompose/
  README.md           # this effort’s notes
  levels.md           # same as above, working notes
  level0-metadata/    # embed + extract WGSL on export/import
  level1-wrapper/     # asset file → texture-sampling WGSL + boot JS
```

Stable `src/` stays export-only until something graduates from experiments.

## Level 0 — metadata round-trip (first concrete win)

1. On **export**, optionally write a chunk/tag:
   - PNG: `tEXt` / `iTXt` key e.g. `assetgpu:wgsl`
   - WAV: `INFO`/`IMT` or a custom `agpu` chunk
   - MP4: harder (use sidecar `.wgsl.json` first)
2. On **decompose**, read that metadata and return the original string.

This is honest: “decomposition” works perfectly for assets **this tool** produced with embedding enabled.

## Level 1 — wrapper generation

Given `photo.png`:

- Emit WGSL that samples `@group(0) @binding(1) var img: texture_2d<f32>`
- Emit small WebGPU JS (or keep using assetgpu’s full-screen triangle) that loads the image bitmap into a texture

Result is not the *creative* shader that made the image; it is a **reproducible WebGPU program that shows the asset**.

## Level 2 — analytic fits (optional later)

Heuristics only, e.g.:

- Near-constant image → `return vec4f(r,g,b,1.0)`
- Dominant horizontal/vertical gradient → mix of two colors by `uv.x` / `uv.y`

Never claim bit-exact recovery of unknown authors’ shaders.

## Non-goals (for now)

- Full Shadertoy-quality reverse engineering of arbitrary art
- Guaranteed reconstruction of compute audio synthesis graphs from WAV
- Shipping decompose on npm `assetgpu` main until Level 0/1 are solid

## Status

- [x] Problem framed on `experiments`
- [ ] Level 0 embed on export
- [ ] Level 0 extract API
- [ ] Level 1 PNG → texture WGSL + loader stub
