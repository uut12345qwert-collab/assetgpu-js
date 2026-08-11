/**
 * encode-video.js
 *
 * Encodes a sequence of raw RGBA8 frames into MP4, WebM, OGV or animated GIF
 * using a real ffmpeg binary via @ffmpeg-installer/ffmpeg.
 *
 * Frames are streamed directly to ffmpeg's stdin — they are never concatenated
 * into one giant Buffer and never written as a multi-gigabyte frames.rgba file.
 * Only the final encoded output uses a small temp file (needed for formats
 * like MP4 that benefit from seekable output / +faststart).
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
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

function assertFrames(rgbaFrames, width, height) {
  if (!Array.isArray(rgbaFrames) || rgbaFrames.length === 0) {
    throw new Error('rgbaFrames must be a non-empty array of Buffers');
  }
  const expectedFrameLength = width * height * 4;
  for (let i = 0; i < rgbaFrames.length; i++) {
    if (!Buffer.isBuffer(rgbaFrames[i]) || rgbaFrames[i].length !== expectedFrameLength) {
      throw new Error(
        `Frame ${i} has length ${rgbaFrames[i]?.length}, expected ${expectedFrameLength} ` +
        `for ${width}x${height} RGBA8.`
      );
    }
  }
}

/**
 * Write frames one-by-one to a writable stream with backpressure support.
 * Never builds a single concatenated Buffer of all frames.
 */
function writeFramesToStream(stream, frames) {
  return new Promise((resolve, reject) => {
    let i = 0;

    function writeNext() {
      while (i < frames.length) {
        const frame = frames[i++];
        const ok = stream.write(frame);
        if (!ok) {
          stream.once('drain', writeNext);
          return;
        }
      }
      stream.end();
    }

    stream.on('error', reject);
    stream.on('finish', resolve);
    writeNext();
  });
}

/**
 * Spawn ffmpeg with raw RGBA frames on stdin; return the encoded output Buffer.
 * Output is written to a temp file so MP4 +faststart and similar muxers work.
 */
async function encodeViaStdin(rgbaFrames, width, height, fps, outputArgs, outputExt) {
  const ffmpegInstaller = await loadFfmpegPath();
  const workDir = await mkdtemp(join(tmpdir(), 'assetgpu-'));
  const outputPath = join(workDir, `output.${outputExt}`);

  const args = [
    '-y',
    '-f', 'rawvideo',
    '-pixel_format', 'rgba',
    '-video_size', `${width}x${height}`,
    '-framerate', String(fps),
    '-i', 'pipe:0',          // read raw frames from stdin
    ...outputArgs,
    outputPath,
  ];

  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegInstaller.path, args, {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(
          `Failed to spawn ffmpeg at ${ffmpegInstaller.path}: ${err.message}. ` +
          'Verify @ffmpeg-installer/ffmpeg installed correctly for your platform.'
        ));
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}. stderr:\n${stderr.slice(-2000)}`));
      });

      // Stream frames to stdin (no Buffer.concat, no frames.rgba on disk)
      writeFramesToStream(proc.stdin, rgbaFrames).catch((err) => {
        try { proc.kill('SIGKILL'); } catch { /* ignore */ }
        reject(err);
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function encodeVideo(rgbaFrames, width, height, fps, format, options = {}) {
  const normalizedFormat = format.toLowerCase();
  const config = CONTAINER_CONFIG[normalizedFormat];
  if (!config) {
    throw new Error(
      `Unsupported video format "${format}". Supported: ${Object.keys(CONTAINER_CONFIG).join(', ')}`
    );
  }
  assertFrames(rgbaFrames, width, height);

  const outputArgs = [
    '-c:v', config.vcodec,
    ...(options.crf !== undefined ? ['-crf', String(options.crf)] : []),
    ...config.extraArgs,
  ];

  return encodeViaStdin(rgbaFrames, width, height, fps, outputArgs, normalizedFormat);
}

export async function encodeAnimatedGif(rgbaFrames, width, height, fps) {
  assertFrames(rgbaFrames, width, height);

  // Single-pass palette generation works with a non-seekable stdin pipe.
  // stats_mode=single avoids needing a second full pass over the stream.
  const outputArgs = [
    '-vf',
    'split[s0][s1];[s0]palettegen=stats_mode=single[p];[s1][p]paletteuse',
  ];

  return encodeViaStdin(rgbaFrames, width, height, fps, outputArgs, 'gif');
}
