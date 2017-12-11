precision highp float;

uniform sampler2D tDiffuse;

uniform float distortion2;
uniform float distortion;
uniform float rollSpeed;
uniform float speed;
uniform float time;

varying vec2 vUv;

vec3 mod289 (vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289 (vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute (vec3 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

float snoise (vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);

  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
 
  x12.xy -= i1;
  i = mod289(i);

  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 ox = floor(x + 0.5);
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - ox;
  vec3 g;

  m = m * m;
  m = m * m;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  g.x = a0.x * x0.x + h.x * x0.y;
  return 130.0 * dot(m, g);
}

void main (void) {
  vec2 p = vUv;

  float ty = time * speed;
  float yt = p.y - ty;

  float offset = snoise(vec2(yt * 3.0, 0.0)) * 0.2;

  offset = offset * distortion * offset * distortion * offset;
  offset += snoise(vec2(yt * 50.0, 0.0)) * distortion2 * 0.001;

  gl_FragColor = texture2D(tDiffuse, vec2(fract(p.x + offset), fract(p.y - time * rollSpeed)));
}
