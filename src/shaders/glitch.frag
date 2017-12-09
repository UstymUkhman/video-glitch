precision highp float;

uniform sampler2D tDiffuse;

uniform float amount;
uniform float time;
uniform float size;

varying vec4 vPosition;
varying vec2 vUv;

#pragma glslify: random = require(glsl-random)

// Alternative "noise" function:
// vec4 noise (float intensity) {
//   float coord = random(gl_FragCoord.xy);
//   float x = (vPosition.x * coord + 4.0) * (vPosition.y * coord + 4.0) * (sin(time) * 10.0);

//   return intensity * vec4(mod((mod(x, 13.0) + 1.0) * (mod(x, 123.0) + 1.0), 0.01) - 0.005);
// }

void main(void) {
  vec4 color = texture2D(tDiffuse, vUv);

  // color.r += color.r * filterColor.r;
  // color.g += color.g * filterColor.g;
  // color.b += color.b * filterColor.b;
  // color.a = alpha;

  float xs = floor(gl_FragCoord.x / size);
  float ys = floor(gl_FragCoord.y / size);

  vec2 noise = vec2(xs * time, ys * time);
  vec4 grain = vec4(random(noise) * amount);

  // Alternative "noise" function call:
  // vec4 grain = noise(amount * 100.0);

  gl_FragColor = vec4(color.rgb * color.a, color.a) + grain;
}
