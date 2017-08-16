varying float vLines;
varying vec3 vColor;

uniform float lines;

void main(void) {
  gl_FragColor = vec4(vColor, 1.0);
}
