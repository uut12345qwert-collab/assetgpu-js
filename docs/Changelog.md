# Changelog & Versions

## 1.0.0 (current)

- Package name: **`assetgpu`**
- Repo: **`assetgpu-js`**
- JavaScript library (ESM, Node ≥ 18)
- Features:
  - `exportImage` / `exportFavicon` / `exportVideo` / `exportAudio`
  - CLI: `npx assetgpu`
  - Configurable audio `workgroupSize`
  - Video frames streamed to FFmpeg stdin (no giant raw file)
  - Dynamic optional peers: `sharp`, `@ffmpeg-installer/ffmpeg`, `webgpu`
  - Docs wiki under `docs/`

## Pre-1.0 history (same lineage)

Earlier names and repos in this project’s history:

- Experimental / flat layouts under `webAsset`-style code
- `webgpu-wgsl-to-assets` / `webAsset-js` packaging experiments
- Rebrand to **assetgpu** / **assetgpu-js** for clearer npm + GitHub identity

Functional fixes during that period included correct ESM layout, peer dependency loading, shader contract docs, and the video memory fix (see [Debugs and Fixes](Debugs-and-Fixes)).
