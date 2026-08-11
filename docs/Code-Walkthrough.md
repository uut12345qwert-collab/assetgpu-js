# Code Walkthrough

High-level tour of each source file. Not every line — the important behaviors.

## `src/index.js`

- Exports `exportImage`, `exportFavicon`, `exportVideo`, `exportAudio`.
- Validates formats with small sets (`STILL_IMAGE_FORMATS`, `VIDEO_FORMATS`).
- Constructs `FragmentRenderer` / `ComputeAudioRenderer`, calls render, then dynamic-imports the matching encoder.
- `finally { renderer.destroy() }` releases GPU resources for image/video paths.
- Re-exports renderer classes for advanced use.

## `src/core/gpu-backend.js`

- `getGpuDevice()`: dynamic `import('webgpu')`, `create([])`, `requestAdapter`, `requestDevice`.
- Caches adapter/device; clears cache on `device.lost`.
- Test hooks: `_setGpuDeviceForTesting`, `_resetGpuDeviceCache`.

## `src/core/fragment-renderer.js`

- Prepends `BuiltinUniforms` WGSL header to user fragment code.
- Default vertex: full-screen triangle + UV.
- Creates render texture (`RENDER_ATTACHMENT | COPY_SRC`), uniform buffer, readback buffer with **256-byte row padding** (WebGPU copy rule).
- `renderFrame(time)`: write uniforms → draw 3 verts → copy texture to buffer → map → strip padding → `Buffer`.
- `renderSequence`: loops `renderFrame(i/fps)` for `durationSeconds * fps` frames.

## `src/core/compute-audio-renderer.js`

- Constructor options: `computeWgsl`, `sampleRate`, `channels` (mono only), `workgroupSize` (default 64).
- Builds uniform (`AudioParams`) + storage buffer for samples.
- `dispatchWorkgroups(ceil(totalSamples / workgroupSize))`.
- Maps storage back to `Float32Array`.

## `src/image/encode-image.js`

- Dynamic `import('sharp')` with a clear install error if missing.
- `encodeImage`: raw RGBA → sharp → png/jpeg/webp/avif/gif.
- `encodeIco`: resize to each size as PNG, pack ICO directory + payloads.

## `src/video/encode-video.js`

- **`encodeViaStdin`**: spawn FFmpeg with `-i pipe:0`, write each frame with backpressure (`drain`), output to a small temp file, read result, delete temp dir.
- **Does not** `Buffer.concat` all frames or write `frames.rgba`.
- GIF uses a single-pass palette filter compatible with non-seekable stdin.

## `src/audio/encode-audio.js`

- `encodeWav`: pure JS RIFF/WAVE writer, 16-bit or 32-bit float, clamps samples.
- `encodeCompressedAudio`: writes a temp WAV, runs ffmpeg for mp3/ogg, returns encoded buffer.

## `bin/assetgpu.js`

- Minimal CLI: parse `--wgsl`, `--out`, dimensions, format, duration; call the same public API; write the Buffer to disk.
