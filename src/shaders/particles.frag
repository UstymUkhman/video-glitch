precision highp float;

varying vec3 vColor;
uniform vec3 gColor;

void main(void) {
  vec4 color = vec4(vColor, 0.5);

  color.r += color.r * gColor.r;
  color.g += color.g * gColor.g;
  color.b += color.b * gColor.b;

  gl_FragColor = vec4(color.rgb * color.a, color.a);
}
