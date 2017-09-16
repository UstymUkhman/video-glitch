precision highp float;

uniform float noiseIntensity;
uniform vec3  filterColor;
uniform float alpha;
uniform float time;

varying vec4 vPosition;
varying vec3 vColor;
varying vec2 vUv;

#pragma glslify: random = require(glsl-random)

vec4 noise(float intensity) {
  float coord = random(gl_FragCoord.xy);
  float x = (vPosition.x * coord + 4.0) * (vPosition.y * coord + 4.0) * (sin(time) * 10.0);

  return intensity * vec4(mod((mod(x, 13.0) + 1.0) * (mod(x, 123.0) + 1.0), 0.01) - 0.005);
}

void main(void) {
  vec4 color = vec4(vColor, alpha);
  vec4 grain = vec4(0.0);

  color.r += color.r * filterColor.r;
  color.g += color.g * filterColor.g;
  color.b += color.b * filterColor.b;

  if (noiseIntensity > 0.0) {
    grain = noise(noiseIntensity);
  }

  gl_FragColor = vec4(color.rgb * color.a, color.a) + grain;
}
