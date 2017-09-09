precision highp float;

uniform vec3 gColor;

varying vec3 vColor;
varying vec2 vUv;

#pragma glslify: random = require('glsl-random')
#pragma glslify: blend = require('glsl-blend-overlay')

void main(void) {
  // NORMAL:
  vec4 color = vec4(vColor, 1.0); // 0.5

  color.r += color.r * gColor.r;
  color.g += color.g * gColor.g;
  color.b += color.b * gColor.b;

  gl_FragColor = vec4(color.rgb * color.a, color.a);

  // NOISE 1:
  // vec2 smoothing = vec2(-1.0, 1.0);

  // float dist = length(vUv);
  // dist = smoothstep(smoothing.x, smoothing.y, 2.0 - dist);

  // vec3 color = mix(gColor, vColor, dist);
  // vec3 noise = vec3(random(vUv * 1.5), random(vUv * 2.5), random(vUv)) * 1.5;
  // color.rgb = mix(color.rgb, blend(color.rgb, noise), 0.75) * 1.5;

  // gl_FragColor = vec4(color, 1.0); // 0.5

  // NOISE 2:
  // vec2 position = -3.0 + 2.0 * vUv;

  // float r = abs(sin(position.x * position.y + vColor.r / 0.5));
  // float g = abs(sin(position.x * position.y + vColor.g / 0.5));
  // float b = abs(sin(position.x * position.y + vColor.b / 0.5));

  // gl_FragColor = vec4(r, g, b, 1.0);
}
