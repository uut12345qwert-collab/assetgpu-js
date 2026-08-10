/**
 * encode-video.js
 *
 * Encodes a sequence of raw RGBA8 frames into MP4, WebM, OGV or animated GIF
 * using a real ffmpeg binary via @ffmpeg-installer/ffmpeg.
 *
 * `@ffmpeg-installer/ffmpeg` is dynamically imported so that consumers
 * who only need still images or WAV audio do not require it.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CONTAINER_CONFIG = {
  mp4: { vcodec: 'libx264', extraArgs: ['-pix_fmt', 'yuv420p', '-movflags', '+faststart'] },
  webm: { vcodec: 'libvpx-vp9', extraArgs: ['-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '30'] },
  ogv: { vcodec: 'libtheora', extraArgs: [] },
};

async function loadFfmpegPath() {
  try {
    const mod = await import('@ffmpeg-installer/ffmpeg');
    return mod.default;
  } catch (err) {
    throw new Error(
      '@ffmpeg-installer/ffmpeg is required for video/GIF encoding but failed to load. ' +
      'Install it with: npm install @ffmpeg-installer/ffmpeg\nOriginal error: ' + err.message
    );
  }
}

export async function encodeVideo(rgbaFrames, width, height, fps, format, options = {}) {
  const normalizedFormat = format.toLowerCase();
  const config = CONTAINER_CONFIG[normalizedFormat];
  if (!config) {
    throw new Error(`Unsupported video format "${format}". Supported: ${Object.keys(CONTAINER_CONFIG).join(', ')}`);
  }
  if (!Array.isArray(rgbaFrames) || rgbaFrames.length === 0) {
    throw new Error('rgbaFrames must be a non-empty array of Buffers');
  }
  const expectedFrameLength = width * height * 4;
  for (let i = 0; i < rgbaFrames.length; i++) {
    if (rgbaFrames[i].length !== expectedFrameLength) {
      throw new Error(
        `Frame ${i} has length ${rgbaFrames[i].length}, expected ${expectedFrameLength} ` +
        `for ${width}x${height}.`
      );
    }
  }

  const workDir = await mkdtemp(join(tmpdir(), 'assetgpu-'));
  const rawFramesPath = join(workDir, 'frames.rgba');
  const outputPath = join(workDir, `output.${normalizedFormat}`);

  try {
    await writeFile(rawFramesPath, Buffer.concat(rgbaFrames));

    const args = [
      '-y',
      '-f', 'rawvideo',
      '-pixel_format', 'rgba',
      '-video_size', `${width}x${height}`,
      '-framerate', String(fps),
      '-i', rawFramesPath,
      '-c:v', config.vcodec,
      ...(options.crf !== undefined ? ['-crf', String(options.crf)] : []),
      ...config.extraArgs,
      outputPath,
    ];

    await runFfmpeg(args);
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function encodeAnimatedGif(rgbaFrames, width, height, fps) {
  if (!Array.isArray(rgbaFrames) || rgbaFrames.length === 0) {
    throw new Error('rgbaFrames must be a non-empty array of Buffers');
  }
  const expectedFrameLength = width * height * 4;
  for (let i = 0; i < rgbaFrames.length; i++) {
    if (rgbaFrames[i].length !== expectedFrameLength) {
      throw new Error(`Frame ${i} has unexpected length for ${width}x${height} RGBA8`);
    }
  }

  const workDir = await mkdtemp(join(tmpdir(), 'assetgpu-gif-'));
  const rawFramesPath = join(workDir, 'frames.rgba');
  const outputPath = join(workDir, 'output.gif');

  try {
    await writeFile(rawFramesPath, Buffer.concat(rgbaFrames));

    const filterComplex =
      '[0:v] split [a][b];' +
      '[a] palettegen [p];' +
      '[b][p] paletteuse';

    const args = [
      '-y',
      '-f', 'rawvideo',
      '-pixel_format', 'rgba',
      '-video_size', `${width}x${height}`,
      '-framerate', String(fps),
      '-i', rawFramesPath,
      '-filter_complex', filterComplex,
      outputPath,
    ];

    await runFfmpeg(args);
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runFfmpeg(args) {
  const ffmpegPath = await loadFfmpegPath();
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath.path, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', (err) => {
      reject(new Error(
        `Failed to spawn ffmpeg binary at ${ffmpegPath.path}: ${err.message}. ` +
        'Verify @ffmpeg-installer/ffmpeg installed correctly for your platform.'
      ));
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}. stderr:\n${stderr.slice(-2000)}`));
    });
  });
}
