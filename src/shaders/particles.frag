varying float vLines;
varying vec3 vColor;

void main(void) {
  if (vColor == vec3(1.0, 1.0, 1.0)) {
    discard;
  }

  gl_FragColor = vec4(vColor, 0.5);
}
