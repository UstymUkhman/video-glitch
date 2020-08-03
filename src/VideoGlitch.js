import vertGlitch from '@/glsl/glitch.vert';
import fragGlitch from '@/glsl/glitch.frag';

export default class VideoGlitch {
  constructor () {
    console.log(vertGlitch, fragGlitch);
  }

  resize () {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.video.width = this.width;
    this.video.height = this.height;

    this.ratio = this.width / this.height;

    if (this.renderer) {
      this.renderer.setSize(this.width, this.height);
    }

    if (this.camera) {
      this.camera.aspect = this.ratio;
      this.camera.updateProjectionMatrix();
    }
  }
}
