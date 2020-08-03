import { WebGLRenderer } from '@three/renderers/WebGLRenderer';

// import vertGlitch from '@/glsl/glitch.vert';
// import fragGlitch from '@/glsl/glitch.frag';

import { Color } from '@three/math/Color';
import * as dat from 'dat.gui';

export default class VideoGlitch {
  constructor (video) {
    this.gui = new dat.GUI();

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.overlay = new Color(0, 0, 0);
    this.ratio = this.width / this.height;

    this.createVideoStream(video);
    this.setFullscreenMethods();
  }

  setFullscreenMethods () {
    document.exitFullscreen =
      document.exitFullscreen ??
      document.msExitFullscreen ??
      document.mozCancelFullScreen ??
      document.webkitCancelFullScreen;

    document.body.requestFullscreen =
      document.body.requestFullscreen ??
      document.body.msRequestFullscreen ??
      document.body.mozRequestFullScreen ??
      document.body.webkitRequestFullscreen;
  }

  createVideoStream (video) {
    this.video = document.createElement('video');
    this.video.oncanplay = this.init.bind(this);

    this.video.height = this.height;
    this.video.width = this.width;

    this.video.preload = 'auto';
    this.video.autoload = true;

    this.video.muted = true;
    this.video.loop = true;
    this.video.src = video;
  }

  init () {
    if (this.renderer) return;

    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.createWebGLEnvironment();
    this.createVideoGeometry();
    this.createGlitchParams();

    this.createGlitchShader();
    this.createControls();
    this.video.play();
    this.render();
  }

  toggleFullscreen () {
    const isFullscreen = this.isFullscreen();

    isFullscreen ? document.exitFullscreen() : document.body.requestFullscreen();
    this.fullscreen.__li.innerText = `${isFullscreen ? 'Enter' : 'Exit'} Fullscreen`;
  }

  isFullscreen () {
    return !!document.fullscreenElement ??
           !!document.msFullscreenElement ??
           !!document.mozFullScreenElement ??
           !!document.webkitFullscreenElement;
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
