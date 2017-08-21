precision mediump float;

varying vec3 textCoord;
varying vec3 vColor;
varying float vLines;

uniform sampler2D texture;

void main(void) {
  vec4 color = vec4(vColor, 0.8);
  gl_FragColor = vec4(color.rgb * color.a, color.a);
}
