precision mediump float;

uniform float size;

uniform float xSlide;
uniform float ySlide;

varying vec2 vUv;

void main (void) {
  vec4 position = vec4(position, 1.0 / size);
  vec4 mvPosition = modelViewMatrix * position;

  gl_Position = projectionMatrix * mvPosition;

  // if (show == 1) {
  //   gl_Position.x += xSlide * 2.0;
  //   gl_Position.y += ySlide * 2.0;
  // }

  gl_PointSize = 3.0; // size;
  vUv = uv;
}
