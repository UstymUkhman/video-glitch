precision mediump float;

attribute float size;
// attribute vec3 color;

uniform sampler2D color;

varying vec4 vPosition;
varying vec3 vColor;
varying vec2 vUv;

void main(void) {
  vec4 pos = vec4(position, 1.0 / size);
  // vec4 pos = vec4(position, 1.0);

  vec4 mvPosition = modelViewMatrix * pos;

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size;

  vec3 col = texture2D(color, position.xy).xyz;

  vPosition = gl_Position;
  vColor = col;
  vUv = uv;
}
