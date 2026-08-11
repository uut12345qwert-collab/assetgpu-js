# Shader Contracts

assetgpu expects a fixed binding layout so it can supply uniforms and read results without reflecting arbitrary WGSL.

## Fragment shaders (images / video)

### Injected uniform (do not redeclare)

```wgsl
struct BuiltinUniforms {
  resolution: vec2f,
  time: f32,
  _pad: f32,
};
@group(0) @binding(0) var<uniform> builtin: BuiltinUniforms;
```

### Default vertex stage (you usually do not write this)

The library draws a full-screen triangle and passes UV at `@location(0)`:

```wgsl
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var uvs = array<vec2f, 3>(
    vec2f(0.0, 1.0),
    vec2f(2.0, 1.0),
    vec2f(0.0, -1.0)
  );
  var out: VertexOutput;
  out.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  out.uv = uvs[vertexIndex];
  return out;
}
```

### What you write

```wgsl
@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // builtin.time, builtin.resolution available
  return vec4f(uv.x, uv.y, 0.5, 1.0);
}
```

Override the vertex stage with `vertexWgsl` if needed.

## Compute shaders (audio)

```wgsl
struct AudioParams {
  sampleRate: f32,
  totalSamples: u32,
  channels: u32,
  _pad: u32,
};
@group(0) @binding(0) var<uniform> params: AudioParams;
@group(0) @binding(1) var<storage, read_write> samples: array<f32>;

@compute @workgroup_size(64)  // must match exportAudio({ workgroupSize })
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.totalSamples) { return; }
  samples[i] = /* value in [-1, 1] */;
}
```

Only **mono** is fully supported end-to-end today.
