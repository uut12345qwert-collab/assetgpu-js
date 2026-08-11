# Architecture

## Pipeline overview

```
User WGSL
   │
   ├─ fragment ──► FragmentRenderer ──► RGBA Buffer(s)
   │                      │
   │                      ├─ encode-image.js (sharp) ──► PNG/JPEG/…
   │                      └─ encode-video.js (ffmpeg stdin) ──► MP4/WebM/GIF
   │
   └─ compute ───► ComputeAudioRenderer ──► Float32Array samples
                          │
                          └─ encode-audio.js ──► WAV (JS) / MP3/OGG (ffmpeg)
```

## Layers

1. **`src/index.js`** — public API; dynamic-imports encoders so optional peers are not required until used.
2. **`src/core/gpu-backend.js`** — loads `webgpu`, caches adapter/device, surfaces clear errors if no adapter.
3. **`src/core/fragment-renderer.js`** — shader modules, full-screen pass, texture → padded copy → unpadded RGBA `Buffer`.
4. **`src/core/compute-audio-renderer.js`** — uniform + storage buffer, dispatch by `workgroupSize`, map samples back.
5. **Encoders** — format-specific; video streams frames to FFmpeg stdin.

## Design choices

| Choice | Why |
|--------|-----|
| Input is WGSL strings only | Simple API; no need to pass GPU objects |
| Dynamic `import()` of sharp/ffmpeg | WAV-only users never need those natives |
| Fixed binding contracts | Reliable without full WGSL reflection |
| Video via stdin pipe | Avoid multi-GB intermediate raw files |

## Memory notes

- Video encode no longer concatenates all frames into one buffer for disk.
- `FragmentRenderer.renderSequence` still accumulates an array of frame buffers in RAM; very long 4K sequences can still be heavy. Future work: stream frames from GPU straight into FFmpeg without holding the full sequence.
