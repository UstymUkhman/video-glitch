// uniform sampler2D tMap;

varying vec3 vColor;

void main() {
  // vec4 target = texture2D(tMap, gl_PointCoord);
  // vec4 blend = vec4(vColor,1.0);

  // gl_FragColor = 1.0 - (1.0 - target) * (1.0 - blend);
  gl_FragColor = vec4(vColor,1.0);
}
