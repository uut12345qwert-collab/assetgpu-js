/**
 * assetgpu
 *
 * JavaScript library that bakes WGSL shaders into real assets:
 *   1. WGSL fragment shader -> still image (PNG/JPEG/WebP/AVIF/GIF/ICO)
 *   2. WGSL fragment shader -> video (MP4/WebM/OGV) or animated GIF
 *   3. WGSL compute shader  -> audio (WAV/MP3/OGG)
 */

import { FragmentRenderer } from './core/fragment-renderer.js';
import { ComputeAudioRenderer } from './core/compute-audio-renderer.js';
// encode-image.js (sharp) and encode-video.js (@ffmpeg-installer/ffmpeg)
// are intentionally NOT imported at top level. Each export* function
// dynamic-imports only the encoder it needs at call time.

const STILL_IMAGE_FORMATS = new Set(['png', 'jpeg', 'jpg', 'webp', 'avif', 'gif']);
const VIDEO_FORMATS = new Set(['mp4', 'webm', 'ogv']);

/**
 * Renders a WGSL fragment shader to a still image.
 */
export async function exportImage({ wgsl, width, height, format, time = 0, vertexWgsl, encodeOptions = {} }) {
  if (!STILL_IMAGE_FORMATS.has(format?.toLowerCase())) {
    throw new Error(
      `exportImage: unsupported format "${format}". Supported: ${[...STILL_IMAGE_FORMATS].join(', ')}. ` +
      'For animated GIF, use exportVideo with format "gif" instead.'
    );
  }

  const { encodeImage } = await import('./image/encode-image.js');
  const renderer = new FragmentRenderer({ fragmentWgsl: wgsl, vertexWgsl, width, height });
  try {
    const rgba = await renderer.renderFrame(time);
    return await encodeImage(rgba, width, height, format, encodeOptions);
  } finally {
    renderer.destroy();
  }
}

/**
 * Renders a WGSL fragment shader to a multi-resolution .ico favicon.
 */
export async function exportFavicon({ wgsl, sourceSize = 256, time = 0, sizes = [16, 32, 48, 64], vertexWgsl }) {
  const { encodeIco } = await import('./image/encode-image.js');
  const renderer = new FragmentRenderer({ fragmentWgsl: wgsl, vertexWgsl, width: sourceSize, height: sourceSize });
  try {
    const rgba = await renderer.renderFrame(time);
    return await encodeIco(rgba, sourceSize, sourceSize, sizes);
  } finally {
    renderer.destroy();
  }
}

/**
 * Renders a WGSL fragment shader across time to a video or animated GIF.
 */
export async function exportVideo({
  wgsl, width, height, format, durationSeconds, fps = 30,
  vertexWgsl, onProgress, encodeOptions = {},
}) {
  const normalizedFormat = format?.toLowerCase();
  const isGif = normalizedFormat === 'gif';
  if (!isGif && !VIDEO_FORMATS.has(normalizedFormat)) {
    throw new Error(
      `exportVideo: unsupported format "${format}". Supported: ` +
      `${[...VIDEO_FORMATS, 'gif'].join(', ')}`
    );
  }

  const { encodeVideo, encodeAnimatedGif } = await import('./video/encode-video.js');
  const renderer = new FragmentRenderer({ fragmentWgsl: wgsl, vertexWgsl, width, height });
  try {
    const frames = await renderer.renderSequence({ durationSeconds, fps, onProgress });
    if (isGif) {
      return await encodeAnimatedGif(frames, width, height, fps);
    }
    return await encodeVideo(frames, width, height, fps, normalizedFormat, encodeOptions);
  } finally {
    renderer.destroy();
  }
}

/**
 * Synthesizes audio from a WGSL compute shader and encodes it.
 *
 * @param {object} opts
 * @param {string} opts.wgsl
 * @param {number} opts.durationSeconds
 * @param {'wav'|'mp3'|'ogg'} opts.format
 * @param {number} [opts.sampleRate=44100]
 * @param {number} [opts.workgroupSize=64] - Must match @workgroup_size(N) in the WGSL
 * @param {object} [opts.encodeOptions]
 */
export async function exportAudio({
  wgsl, durationSeconds, format, sampleRate = 44100,
  workgroupSize = 64, encodeOptions = {},
}) {
  const normalizedFormat = format?.toLowerCase();
  if (!['wav', 'mp3', 'ogg'].includes(normalizedFormat)) {
    throw new Error(`exportAudio: unsupported format "${format}". Supported: wav, mp3, ogg`);
  }

  const renderer = new ComputeAudioRenderer({
    computeWgsl: wgsl,
    sampleRate,
    workgroupSize,
  });
  const samples = await renderer.render(durationSeconds);

  const { encodeWav, encodeCompressedAudio } = await import('./audio/encode-audio.js');

  if (normalizedFormat === 'wav') {
    return encodeWav(samples, sampleRate, encodeOptions.bitDepth ?? 16);
  }
  return encodeCompressedAudio(samples, sampleRate, normalizedFormat, encodeOptions);
}

export { FragmentRenderer } from './core/fragment-renderer.js';
export { ComputeAudioRenderer } from './core/compute-audio-renderer.js';
