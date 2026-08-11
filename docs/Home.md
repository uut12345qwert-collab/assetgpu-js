# assetgpu wiki

**assetgpu** is a **JavaScript / Node.js library** that bakes WGSL shaders into real asset files using headless WebGPU.

```
Fragment shader  →  PNG · JPEG · WebP · AVIF · GIF · ICO
Fragment shader  →  MP4 · WebM · OGV · animated GIF
Compute shader   →  WAV · MP3 · OGG
```

## Wiki map

| Page | What it covers |
|------|----------------|
| [Getting Started](Getting-Started) | Install, first PNG / WAV / MP4 |
| [API Reference](API-Reference) | `exportImage`, `exportVideo`, `exportAudio`, CLI |
| [Shader Contracts](Shader-Contracts) | WGSL rules, vertex stage, audio bindings |
| [Architecture](Architecture) | How the pipeline works end-to-end |
| [Code Walkthrough](Code-Walkthrough) | Module-by-module explanation of the source |
| [Tutorials](Tutorials) | Practical recipes |
| [Changelog & Versions](Changelog) | Version history |
| [Debugs and Fixes](Debugs-and-Fixes) | Past bugs and how they were fixed |

## Repository

- GitHub: https://github.com/uut12345qwert-collab/assetgpu-js  
- Package name: `assetgpu`  
- License: MIT  
- Current version: **1.0.0**

## Quick mental model

1. You pass **WGSL source** (string) + options.
2. The library uses **WebGPU** (`webgpu` npm package) to run the shader headlessly.
3. Pixels or samples are read back and encoded with **sharp** (images) or **ffmpeg** (video / compressed audio).
4. You get a **Buffer** of a normal file format.

You never pass WebGPU device objects yourself — only WGSL and encoding options.

---

*This wiki lives in `docs/` and is updated whenever the library changes.*
