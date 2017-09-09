precision mediump float;

attribute float size;
attribute vec3 color;

varying vec3 vColor;
varying vec2 vUv;

void main(void) {
  vec4 pos = vec4(position, 1.0);
  vec4 mvPosition = modelViewMatrix * pos;

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size;

  vColor = color;
  vUv = uv;
}
