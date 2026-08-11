# Debugs and Fixes

A revised version of the video pipeline is in place. This page records the important bug and the fix.

## Issue: giant intermediate raw video (memory / disk)

**Where:** `src/video/encode-video.js` (older revision)

**What went wrong:**

1. All rendered frames were passed as an array of Buffers.
2. The encoder called `Buffer.concat(rgbaFrames)`, allocating one contiguous block equal to the sum of all frame sizes.
3. That block was written to disk as `frames.rgba`.
4. FFmpeg was then started with `-i frames.rgba`.

**Why it hurts:**

Raw RGBA size ≈ `width × height × 4 × fps × durationSeconds`.

Example: **60 s × 60 FPS × 1920×1080** ≈ **~30 GB**. The process could OOM on the concat step or fill the disk before FFmpeg ran.

## Fix: stream frames to FFmpeg stdin

**Current behavior:**

1. FFmpeg is spawned with `-f rawvideo ... -i pipe:0`.
2. Each frame Buffer is written to `proc.stdin` sequentially.
3. Backpressure is handled via the stream `drain` event (no unbounded buffering in the write loop).
4. Only the **final encoded** file is written to a small temp path (needed for seekable muxers such as MP4 + `faststart`).
5. No `frames.rgba` intermediate file is created.

**Still true (limitation):** `FragmentRenderer.renderSequence` keeps an array of frame buffers in memory until encode finishes. Eliminating that requires streaming frames from the GPU as they are rendered (future improvement).

## Other fixes in the lineage

| Topic | Fix |
|-------|-----|
| Flat / broken imports | Restructured to `src/` ESM package with `exports` |
| Eager sharp/ffmpeg imports | Dynamic `import()` inside encode paths |
| Hardcoded audio workgroup 64 | `workgroupSize` option on `exportAudio` / `ComputeAudioRenderer` |
| Unclear fragment UV contract | Documented default vertex shader in README + this wiki |
| Naming | Rebranded library to **assetgpu** (JS library) |
