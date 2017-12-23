#include <common>
precision highp float;

uniform sampler2D tDiffuse;

// Overlay Uniforms:
uniform int lines;

// Distortion Uniforms:
uniform float distortion;
uniform float speed;

// Glitch Uniforms:
uniform vec3 filterColor;
uniform float amount;
uniform float alpha;
uniform float time;
uniform float snow;
uniform int show;

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
  vec4 color = texture2D(tDiffuse, vUv);
  vec3 result = color.rgb;
  vec2 point = vUv;

  float yt = point.y - time * speed;
  float offset = 0.0;

  if (show == 1) {
    if (lines == 1) {
      float line = sin(vUv.y * 325.0) * 0.2;

      result = color.rgb * vec3(line) * 2.0;
      result = color.rgb + clamp(0.5, 0.0, 1.0) * (result - color.rgb);
    }

    if (distortion > 0.0) {
      offset += snoise(vec2(yt * 50.0, 0.0)) * distortion * 0.001;
      vec4 dist = texture2D(tDiffuse, vec2(fract(point.x + offset), fract(point.y)));
      result = mix(dist.rgb, result, 0.5);
    }

    result.r += result.r * filterColor.r;
    result.g += result.g * filterColor.g;
    result.b += result.b * filterColor.b;

    float xs = floor(gl_FragCoord.x / snow);
    float ys = floor(gl_FragCoord.y / snow);

    vec2 noise = vec2(xs * time, ys * time);
    color = vec4(result.rgb * alpha, alpha) + vec4(rand(noise) * amount / 10.0);
  }

  gl_FragColor = color;
}
