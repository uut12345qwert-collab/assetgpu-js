import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../src/audio/encode-audio.js';

describe('encodeWav', () => {
  it('produces a valid RIFF/WAVE header for 16-bit mono', () => {
    const sampleRate = 44100;
    const samples = new Float32Array(100);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 0.5;
    }
    const buf = encodeWav(samples, sampleRate, 16);
    assert.equal(buf.slice(0, 4).toString('ascii'), 'RIFF');
    assert.equal(buf.slice(8, 12).toString('ascii'), 'WAVE');
    assert.equal(buf.readUInt16LE(20), 1);
    assert.equal(buf.readUInt16LE(22), 1);
    assert.equal(buf.readUInt32LE(24), sampleRate);
    assert.equal(buf.readUInt16LE(34), 16);
  });

  it('clamps samples to [-1, 1]', () => {
    const samples = new Float32Array([2.0, -2.0, 0.0]);
    const buf = encodeWav(samples, 44100, 16);
    assert.equal(buf.readInt16LE(44), 32767);
    assert.equal(buf.readInt16LE(46), -32767);
    assert.equal(buf.readInt16LE(48), 0);
  });
});
