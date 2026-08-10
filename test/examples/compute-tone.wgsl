struct AudioParams {
  sampleRate: f32,
  totalSamples: u32,
  channels: u32,
  _pad: u32,
};

@group(0) @binding(0) var<uniform> params: AudioParams;
@group(0) @binding(1) var<storage, read_write> samples: array<f32>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.totalSamples) { return; }
  let t = f32(i) / params.sampleRate;
  samples[i] = sin(2.0 * 3.14159265 * 440.0 * t) * 0.3;
}
