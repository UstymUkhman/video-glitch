#include <common>
precision highp float;

uniform sampler2D tDiffuse;

// Overlay Uniforms:
uniform float nIntensity;
uniform float sIntensity;
uniform float sCount;

// Glitch Uniforms:
uniform vec3 filterColor;
uniform float amount;
uniform float alpha;
uniform float time;
uniform float snow;

varying vec2 vUv;

void main (void) {
  vec4 color = texture2D(tDiffuse, vUv);
  float line = sin(vUv.y * sCount) * 0.2;

  vec3 result = color.rgb * vec3(line) * sIntensity;
  result = color.rgb + clamp(nIntensity, 0.0, 1.0) * (result - color.rgb);

  result.r += result.r * filterColor.r;
  result.g += result.g * filterColor.g;
  result.b += result.b * filterColor.b;

  float xs = floor(gl_FragCoord.x / snow);
  float ys = floor(gl_FragCoord.y / snow);

  vec2 noise = vec2(xs * time, ys * time);
  vec4 grain = vec4(rand(noise) * amount);

  gl_FragColor = vec4(result.rgb * alpha, alpha) + grain;
}
