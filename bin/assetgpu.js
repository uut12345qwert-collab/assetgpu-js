#!/usr/bin/env node

/**
 * CLI wrapper around assetgpu.
 *
 * Examples:
 *   npx assetgpu image --wgsl shader.wgsl --width 512 --height 512 --format png --out out.png
 *   npx assetgpu video --wgsl shader.wgsl --width 640 --height 360 --format mp4 --duration 2 --out out.mp4
 *   npx assetgpu audio --wgsl audio.wgsl --duration 1 --format wav --out out.wav
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exportImage, exportVideo, exportAudio } from '../src/index.js';

function usage() {
  console.log(`\nassetgpu CLI\n\nUsage:\n  assetgpu <command> [options]\n\nCommands:\n  image   Render fragment shader → still image\n  video   Render fragment shader → video / animated GIF\n  audio   Run compute shader → audio\n\nOptions:\n  --wgsl <file>          Path to .wgsl file (required)\n  --out <file>           Output path (required)\n  --width <n>            Width (image/video)\n  --height <n>           Height (image/video)\n  --format <fmt>         png|jpeg|webp|avif|gif|mp4|webm|ogv|wav|mp3|ogg\n  --duration <seconds>   Length for video/audio\n  --fps <n>              Frames per second (video, default 30)\n  --time <seconds>       Time uniform for still image (default 0)\n  --sample-rate <n>      Sample rate for audio (default 44100)\n`);
}

function getArg(args, name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    usage();
    process.exit(0);
  }

  const wgslPath = getArg(args, '--wgsl');
  const outPath = getArg(args, '--out');

  if (!wgslPath || !outPath) {
    console.error('Error: --wgsl and --out are required');
    usage();
    process.exit(1);
  }

  const wgsl = await readFile(resolve(wgslPath), 'utf8');
  let buffer;

  if (command === 'image') {
    const width = Number(getArg(args, '--width', 512));
    const height = Number(getArg(args, '--height', 512));
    const format = getArg(args, '--format', 'png');
    const time = Number(getArg(args, '--time', 0));
    console.log(`Rendering image ${width}x${height} → ${format} ...`);
    buffer = await exportImage({ wgsl, width, height, format, time });
  } else if (command === 'video') {
    const width = Number(getArg(args, '--width', 640));
    const height = Number(getArg(args, '--height', 360));
    const format = getArg(args, '--format', 'mp4');
    const durationSeconds = Number(getArg(args, '--duration', 2));
    const fps = Number(getArg(args, '--fps', 30));
    console.log(`Rendering video ${width}x${height} @ ${fps}fps for ${durationSeconds}s → ${format} ...`);
    buffer = await exportVideo({
      wgsl, width, height, format, durationSeconds, fps,
      onProgress: (done, total) => process.stdout.write(`\r  frames: ${done}/${total}`),
    });
    process.stdout.write('\n');
  } else if (command === 'audio') {
    const format = getArg(args, '--format', 'wav');
    const durationSeconds = Number(getArg(args, '--duration', 1));
    const sampleRate = Number(getArg(args, '--sample-rate', 44100));
    console.log(`Synthesizing audio ${durationSeconds}s @ ${sampleRate}Hz → ${format} ...`);
    buffer = await exportAudio({ wgsl, durationSeconds, format, sampleRate });
  } else {
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
  }

  await writeFile(resolve(outPath), buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
