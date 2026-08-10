// Time-animated color pulse (uses builtin.time)
@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = builtin.time;
  let r = 0.5 + 0.5 * sin(t * 2.0 + uv.x * 6.28);
  let g = 0.5 + 0.5 * sin(t * 1.7 + uv.y * 6.28);
  let b = 0.5 + 0.5 * cos(t * 1.3);
  return vec4f(r, g, b, 1.0);
}
