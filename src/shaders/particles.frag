precision highp float;

uniform vec3 gColor;

varying vec3 vColor;
varying vec2 vUv;

#pragma glslify: random = require('glsl-random')
#pragma glslify: blend = require('glsl-blend-overlay')

void main(void) {
  // vec4 color = vec4(vColor, 1.0); // 0.5

  // color.r += color.r * gColor.r;
  // color.g += color.g * gColor.g;
  // color.b += color.b * gColor.b;

  // gl_FragColor = vec4(color.rgb * color.a, color.a);

  const vec3 white = vec3(0.8, 0.8, 0.8);
  const vec3 black = vec3(0.0, 0.0, 0.0);

  vec2 smoothing = vec2(-0.4, 0.8);
  vec2 offset = vec2(0.0, 0.0);
  vec2 scale = vec2(1.0, 1.0);
  vec2 pos = vUv;

  float dist = length(pos);
  float prog = 0.75;

  vec3 centerColor = vec3(0.5, 0.5, 0.5); // vec3(vUv, 1.0);
  vec4 color = vec4(1.0);

  dist = smoothstep(smoothing.x, smoothing.y, 1.0 - dist);
  // color.rgb = mix(black, centerColor, dist);
  color.rgb = vColor; // mix(vColor, vColor, 1.0);

  vec3 noise = vec3(random(vUv * 1.5), random(vUv * 2.5), random(vUv)) * 5.0;
  color.rgb = mix(color.rgb, blend(color.rgb, noise), 0.1) * 5.0;

  gl_FragColor = vec4(color.r, color.g, color.b, 1.0);

  // TO IMPROVE:
  // vec2 position = -5.0 + 2.0 * vUv;

  // float red = abs(sin(position.x * position.y + vColor.r / 5.0));
  // float green = abs(sin(position.x * position.y + vColor.g / 4.0));
  // float blue = abs(sin(position.x * position.y + vColor.b / 3.0 ));

  // gl_FragColor = vec4(red, green, blue, 1.0);
}
