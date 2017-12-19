// http://felixturner.github.io/bad-tv-shader/example/

require('three/examples/js/postprocessing/EffectComposer');
require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/ShaderPass');
require('three/examples/js/postprocessing/MaskPass');

require('three/examples/js/shaders/HorizontalBlurShader');
require('three/examples/js/shaders/VerticalBlurShader');
require('three/examples/js/shaders/RGBShiftShader');
require('three/examples/js/shaders/CopyShader');

import dat from 'three/examples/js/libs/dat.gui.min';
import Stats from 'three/examples/js/libs/stats.min';
import Detector from 'three/examples/js/Detector';

export default class VideoGlitch {
  constructor() {
    this.width = 1280;
    this.height = 720;

    this.stats = null;
    this.container = null;

    this.gui = new dat.GUI();
    this.ratio = this.width / this.height;
  }

  startExperiment(container) {
    this.createVideoStream('video');

    this.container = container;
    this.container.appendChild(this.video);
  }

  createVideoStream(file) {
    this.video = document.createElement('video');
    this.video.src = `assets/${file}.mp4`;

    this.video.loop = true;
    this.video.preload = true;

    this.video.width = this.width;
    this.video.height = this.height;

    this.video.oncanplay = this.init.bind(this);
  }

  init() {
    if (!Detector.webgl) {
      document.body.appendChild(Detector.getWebGLErrorMessage());
      return;
    }

    if (this.renderer) {
      return;
    }

    this.video.width = this.width;
    this.video.height = this.height;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.createWebGLEnvironment();
    this.createVideoGeometry();
    this.createGlitchParams();

    // this.createRGBShiftShader();
    // this.createOverlayShader();
    this.createGlitchShader();
    // this.createBadTvShader();
    // this.createBlurShader();
    this.createCopyShader();
    this.createControls();

    this.createStats();
    this.video.play();
    this.render();
  }

  createWebGLEnvironment() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, this.ratio, 1, 1000);
    this.camera.position.z = Math.round(this.height / 0.8275862);
    this.camera.updateProjectionMatrix();

    this.renderer.domElement.id = 'video-canvas';
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
  }

  createVideoGeometry() {
    this.videoTexture = new THREE.Texture(this.video);

    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;

    this.scene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height, 1, 1),
      new THREE.MeshBasicMaterial({ map: this.videoTexture })
    ));
  }

  createGlitchParams() {
    this.effects = {
      fixed: false,

      xSlide: 0.0,
      ySlide: 0.0,

      alpha: 1.0,
      blur: 0.0, // (0.0 ~ 2.048) / 512.0
      time: 0.0,
      size: 1.0,

      badTv: {
        distortion2: 1.5,
        distortion: 1.5,
        rollSpeed: 0.0,
        speed: 0.1
      },

      overlay: {
        sIntensity: 2.0,
        nIntensity: 0.5,
        sCount: 320
      },

      glitch: {
        filterColor: new THREE.Color(0.0),
        amount: 0.15,
        snow: 1.0
      },

      rgbShift: {
        amount: 0.0, // 0.0 ~ 0.1
        angle: 0.0 // (0.0 ~ 2.0) * Math.PI
      }
    };
  }

  createRGBShiftShader() {
    THREE.RGBShiftShader.uniforms.amount.value = this.effects.rgbShift.amount;
    THREE.RGBShiftShader.uniforms.angle.value = this.effects.rgbShift.angle;

    this.rgbShift = new THREE.ShaderPass(THREE.RGBShiftShader);
    this.composer.addPass(this.rgbShift);
  }

  createOverlayShader() {
    this.overlayUniforms = {
      sIntensity: { type: 'f', value: this.effects.overlay.sIntensity },
      nIntensity: { type: 'f', value: this.effects.overlay.nIntensity },
      sCount: { type: 'f', value: this.effects.overlay.sCount },
      time: { type: 'f', value: this.effects.time },
      tDiffuse: { type: 't', value: null }
    };

    const overlay = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/overlay.frag'),
        vertexShader: require('./shaders/overlay.vert'),
        uniforms: this.overlayUniforms
      })
    );

    this.composer.addPass(overlay);
  }

  createGlitchShader() {
    this.glitchUniforms = {
      filterColor: { type: 'c', value: this.effects.glitch.filterColor },
      amount: { type: 'f', value: this.effects.glitch.amount },
      snow: { type: 'f', value: this.effects.glitch.snow },
      alpha: { type: 'f', value: this.effects.alpha },
      size: { type: 'f', value: this.effects.size },

      sIntensity: { type: 'f', value: this.effects.overlay.sIntensity },
      nIntensity: { type: 'f', value: this.effects.overlay.nIntensity },
      sCount: { type: 'f', value: this.effects.overlay.sCount },

      xSlide: { type: 'f', value: this.effects.xSlide },
      ySlide: { type: 'f', value: this.effects.ySlide },

      time: { type: 'f', value: this.effects.time },
      tDiffuse: { type: 't', value: null },
      show: { type: 'i', value: 0 }
    };

    this.glitch = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/glitch.frag'),
        vertexShader: require('./shaders/glitch.vert'),
        uniforms: this.glitchUniforms
      })
    );

    this.composer.addPass(this.glitch);
  }

  createBadTvShader() {
    this.badTvUniforms = {
      distortion2: { type: 'f', value: this.effects.badTv.distortion2 },
      distortion: { type: 'f', value: this.effects.badTv.distortion },
      rollSpeed: { type: 'f', value: this.effects.badTv.rollSpeed },
      speed: { type: 'f', value: this.effects.badTv.speed },
      time: { type: 'f', value: this.effects.time },
      tDiffuse: { type: 't', value: null }
    };

    const badTvPass = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/bad-tv.frag'),
        vertexShader: require('./shaders/bad-tv.vert'),
        uniforms: this.badTvUniforms
      })
    );

    this.composer.addPass(badTvPass);
  }

  createBlurShader() {
    THREE.HorizontalBlurShader.uniforms.h.value = this.effects.blur;
    THREE.VerticalBlurShader.uniforms.v.value = this.effects.blur;

    this.horizontalBlur = new THREE.ShaderPass(THREE.HorizontalBlurShader);
    this.verticalBlur = new THREE.ShaderPass(THREE.VerticalBlurShader);

    this.composer.addPass(this.horizontalBlur);
    this.composer.addPass(this.verticalBlur);

    this.verticalBlur.renderToScreen = true;
  }

  createCopyShader() {
    THREE.CopyShader.uniforms.opacity.value = this.effects.alpha;
    this.copy = new THREE.ShaderPass(THREE.CopyShader);

    this.composer.addPass(this.copy);
    this.copy.renderToScreen = true;
  }

  createControls() {
    const slide = this.gui.addFolder('Slide');
    const settings = {
      slide: () => {
        console.log('Slide');
      }
    };

    slide.add(this.effects, 'xSlide', -1.0, 1.0).step(0.01).name('Horizzontal Slide');
    slide.add(this.effects, 'ySlide', -1.0, 1.0).step(0.01).name('Vertical Slide');

    this.gui.add(this.effects, 'fixed').name('Fixed Effects').onChange((fixed) => {
      this.glitchUniforms.show.value = fixed ? 1 : 0;
    });

    this.gui.add(settings, 'slide').name('Slide');

    // this.gui.add(settings, 'fixedEffects').name('Fixed Effects').onChange((fixed) => {

    //   if (!fixed) {
    //   }
    // });
  }

  createStats() {
    if (!this.stats) {
      this.stats = new Stats();
    }

    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
  }

  render() {
    this.effects.time += 0.1;
    // this.badTvUniforms.time.value = this.effects.time;
    this.glitchUniforms.time.value = this.effects.time;
    // this.overlayUniforms.time.value = this.effects.time;

    if (this.effects.fixed) {
      this.glitchUniforms.xSlide.value = this.effects.xSlide;
      this.glitchUniforms.ySlide.value = this.effects.ySlide;
    } else if (this.effects.show && !this.effects.fixed) {
      this.updateSlideValues();
    }

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      // this.horizontalBlur.material.uniforms.h.value = this.effects.blur;
      // this.verticalBlur.material.uniforms.v.value = this.effects.blur;

      // this.rgbShift.material.uniforms.amount.value = this.effects.rgbShift.amount;
      // this.rgbShift.material.uniforms.angle.value = this.effects.rgbShift.angle;

      // this.copy.material.uniforms.opacity.value = this.effects.alpha;

      // this.glitch.material.uniforms.filterColor.value.r = 0.0;
      // this.glitch.material.uniforms.filterColor.value.g = 0.0;
      // this.glitch.material.uniforms.filterColor.value.b = 0.0;

      this.videoTexture.needsUpdate = true;
      this.composer.render();
      this.stats.update();
    }

    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  updateSlideValues() {
    if (this.glitchUniforms.xSlide.value < this.effects.xSlide) {
      this.glitchUniforms.xSlide.value += 0.01;
    }

    if (this.glitchUniforms.ySlide.value < this.effects.ySlide) {
      this.glitchUniforms.ySlide.value += 0.01;
    }
  }
}
