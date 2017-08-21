precision mediump float;

varying vec3 vColor;

attribute float size;
attribute vec3 color;

void main(void) {
  vec4 pos = vec4(position, 1.0 / size);
  vec4 mvPosition = modelViewMatrix * pos;

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size;
  vColor = color;
}
