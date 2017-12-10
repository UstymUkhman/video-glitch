#include <common>
precision highp float;

uniform sampler2D tDiffuse;

uniform float amount;
uniform float alpha;
uniform float time;
uniform float snow;

varying vec2 vUv;

void main(void) {
  vec4 color = texture2D(tDiffuse, vUv);

  // color.r += color.r * filterColor.r;
  // color.g += color.g * filterColor.g;
  // color.b += color.b * filterColor.b;
  // color.a = alpha;

  float xs = floor(gl_FragCoord.x / snow);
  float ys = floor(gl_FragCoord.y / snow);

  vec2 noise = vec2(xs * time, ys * time);
  vec4 grain = vec4(rand(noise) * amount);

  gl_FragColor = vec4(color.rgb * color.a, color.a) + grain;
}
