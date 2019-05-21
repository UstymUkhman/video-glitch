precision mediump float;

uniform float size;

uniform float xSlide;
uniform float ySlide;

varying vec2 vUv;

void main (void) {
  vec4 position = vec4(position, 1.0 / size);
  vec4 mvPosition = modelViewMatrix * position;

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size;
  vUv = uv;
}
