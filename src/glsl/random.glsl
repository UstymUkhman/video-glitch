#version 300 es

float random (vec2 co) {
  highp float a = 12.9898;
  highp float b = 78.233;
  highp float c = 43758.5453;

  highp float dt = dot(co.xy, vec2(a, b));
  return fract(sin(mod(dt, 3.14)) * c);
}
