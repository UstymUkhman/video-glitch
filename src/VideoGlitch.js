import { MeshBasicMaterial } from '@three/materials/MeshBasicMaterial';
import { PerspectiveCamera } from '@three/cameras/PerspectiveCamera';
import { WebGL1Renderer } from '@three/renderers/WebGL1Renderer';
import { ShaderMaterial } from '@three/materials/ShaderMaterial';
import { EffectComposer } from '@postprocessing/EffectComposer';
import { PlaneGeometry } from '@three/geometries/PlaneGeometry';

import { VideoTexture } from '@three/textures/VideoTexture';
import { ShaderPass } from '@postprocessing/ShaderPass';
import { RenderPass } from '@postprocessing/RenderPass';
import { LinearFilter } from '@three/constants.js';
import { CopyShader } from '@shaders/CopyShader';

import vertGlitch from '@/glsl/glitch.vert';
import fragGlitch from '@/glsl/glitch.frag';

import { Scene } from '@three/scenes/Scene';
import { Mesh } from '@three/objects/Mesh';
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

    this.createWebGLEnvironment();
    this.createVideoGeometry();
    this.createGlitchParams();

    this.createGlitchShader();
    this.createControls();
    this.video.play();
    this.render();
  }

  createWebGLEnvironment () {
    this.scene = new Scene();

    this.renderer = new WebGL1Renderer({ antialias: true, alpha: true });

    this.camera = new PerspectiveCamera(45, this.width / this.height, 1, 1500);
    this.camera.position.z = Math.round(this.height / 0.8275862);
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    document.body.appendChild(this.renderer.domElement);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1.0);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
  }

  createVideoGeometry () {
    this.videoTexture = new VideoTexture(this.video);

    this.videoTexture.minFilter = LinearFilter;
    this.videoTexture.magFilter = LinearFilter;

    this.scene.add(new Mesh(
      new PlaneGeometry(this.width, this.height, 1, 1),
      new MeshBasicMaterial({ map: this.videoTexture })
    ));
  }

  createGlitchParams () {
    this.effects = {
      distortion: { amount: 0.0, speed: 0.0 },
      rgbShift: { amount: 0.0, angle: 0.0 },
      offset: { x: 0.0, y: 0.0 },

      overlay: new Color(0.0),
      color: '#000000',
      lines: false,
      video: true,

      noise: 0.0,
      alpha: 1.0,
      blur: 0.0,
      time: 0.0,
      size: 1.0
    };
  }

  createGlitchShader () {
    const copyPass = new ShaderPass(CopyShader);

    this.glitchUniforms = {
      distortion: { type: 'f', value: this.effects.distortion.amount },
      speed: { type: 'f', value: this.effects.distortion.speed },

      shift: { type: 'f', value: this.effects.rgbShift.amount },
      angle: { type: 'f', value: this.effects.rgbShift.angle },

      offsetX: { type: 'f', value: this.effects.offset.x },
      offsetY: { type: 'f', value: this.effects.offset.y },

      blur: { type: 'f', value: this.effects.blur / 512.0 },
      overlay: { type: 'c', value: this.effects.overlay },
      noise: { type: 'f', value: this.effects.noise },

      lines: { type: 'i', value: ~~this.effects.lines },
      size: { type: 'f', value: this.effects.size },

      time: { type: 'f', value: this.effects.time },
      tDiffuse: { type: 't', value: null }
    };

    this.glitch = new ShaderPass(
      new ShaderMaterial({
        uniforms: this.glitchUniforms,
        fragmentShader: fragGlitch,
        vertexShader: vertGlitch
      })
    );

    this.composer.addPass(copyPass);
    this.composer.addPass(this.glitch);
  }

  createControls () { }

  render (delta) {
    this.frame = requestAnimationFrame(this.render.bind(this));
    this.glitchUniforms.time.value = delta;
    this.composer.render();
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
