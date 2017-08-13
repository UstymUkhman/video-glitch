varying vec3 vColor;

attribute float size;
attribute vec3 color;

void main(void) {
  // vec3 pos = position * vec3(2.0, 2.0, 1.0);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size; // 2.0
  vColor = color;
}
