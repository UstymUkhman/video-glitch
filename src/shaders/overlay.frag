#include <common>

uniform sampler2D tDiffuse;

uniform float nIntensity;
uniform float sIntensity;
uniform float sCount;
uniform float time;

varying vec2 vUv;

void main (void) {
  vec4 cTextureScreen = texture2D(tDiffuse, vUv);
  // float dx = rand(vUv + time);

  // vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp(0.1 + dx, 0.0, 1.0);
  // vec2 sc = vec2(sin(vUv.y * sCount), cos(vUv.y * sCount));

  float line = sin(vUv.y * sCount) * 0.2;

  vec3 cResult = cTextureScreen.rgb * vec3(line) * sIntensity;
  // cResult += cTextureScreen.rgb * vec3(sc.x, sc.x, sc.x) * sIntensity;
  cResult = cTextureScreen.rgb + clamp(nIntensity, 0.0, 1.0) * (cResult - cTextureScreen.rgb);

  gl_FragColor = vec4(cResult, cTextureScreen.a);
}
