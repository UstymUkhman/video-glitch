// http://felixturner.github.io/bad-tv-shader/example/

require('three/examples/js/postprocessing/EffectComposer');
require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/ShaderPass');
require('three/examples/js/postprocessing/MaskPass');

require('three/examples/js/shaders/VerticalBlurShader');
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

    this.slideEnd = null;
    this.slideStart = null;

    this.slideFade = 0.0;
    this.isFading = false;
    this.isSliding = false;
    this.slideDuration = 0.0;

    this.slideStepX = 0.0;
    this.slideStepY = 0.0;

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

  init(event) {
    const fullscreen = typeof event !== 'object';

    if (!Detector.webgl) {
      document.body.appendChild(Detector.getWebGLErrorMessage());
      return;
    }

    if (this.renderer && !fullscreen) {
      return;
    }

    this.video.width = this.width;
    this.video.height = this.height;

    if (!fullscreen) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
    }

    this.createWebGLEnvironment();
    this.createVideoGeometry();

    if (!fullscreen) {
      this.createGlitchParams();
    }

    this.createBlurShader();
    this.createCopyShader();
    this.createGlitchShader();

    this.createControls();
    this.createStats();
    this.video.play();
    this.render();
  }

  createWebGLEnvironment() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, this.ratio, 1, 10000);
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
      onSlide: false,
      fixed: true,

      lines: 0.0,
      alpha: 1.0,
      blur: 0.0,
      time: 0.0,
      size: 1.0,

      distortion: {
        amount: 0.0,
        speed: 0.0
      },

      /* badTv: {
        distortion2: 1.5,
        distortion: 1.5,
        rollSpeed: 0.0,
        speed: 0.1
      }, */

      glitch: {
        filterColor: new THREE.Color(0.0),
        amount: 0.0,
        snow: 0.0
      },

      rgbShift: {
        amount: 0.0,
        angle: 0.0
      },

      slide: {
        fade: 1.0,
        xSlide: 0.0,
        ySlide: 0.0,
        duration: 5.0,
        fadeDelay: 0.0,
        slideBack: false
      }
    };
  }

  createGlitchShader() {
    this.glitchUniforms = {
      // General Effects:
      filterColor: { type: 'c', value: this.effects.glitch.filterColor },
      amount: { type: 'f', value: this.effects.glitch.amount },
      snow: { type: 'f', value: this.effects.glitch.snow },
      size: { type: 'f', value: this.effects.size },

      // Distortion Effects:
      distortion: { type: 'f', value: this.effects.distortion.amount },
      speed: { type: 'f', value: this.effects.distortion.speed },

      // RGB Shift Effects:
      shift: { type: 'f', value: this.effects.rgbShift.amount },
      angle: { type: 'f', value: this.effects.rgbShift.angle },

      // Blur & Lines Overlay Effects:
      blur: { type: 'f', value: this.effects.blur / 512.0 },
      lines: { type: 'i', value: this.effects.lines },

      // Slide Effects:
      xSlide: { type: 'f', value: this.effects.slide.xSlide },
      ySlide: { type: 'f', value: this.effects.slide.ySlide },

      // Sync & Controls:
      time: { type: 'f', value: this.effects.time },
      tDiffuse: { type: 't', value: null },
      show: { type: 'i', value: 1 }
    };

    this.glitch = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/glitch.frag'),
        vertexShader: require('./shaders/glitch.vert'),
        uniforms: this.glitchUniforms
      })
    );

    this.composer.addPass(this.glitch);
    this.glitch.renderToScreen = true;
  }

  /* createBadTvShader() {
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
  } */

  createBlurShader() {
    THREE.VerticalBlurShader.uniforms.v.value = this.effects.blur / 512.0;
    this.verticalBlur = new THREE.ShaderPass(THREE.VerticalBlurShader);
    this.composer.addPass(this.verticalBlur);
  }

  createCopyShader() {
    this.copy = new THREE.ShaderPass(THREE.CopyShader);
    this.composer.addPass(this.copy);
    this.copy.renderToScreen = true;
  }

  createControls() {
    const distortion = this.gui.addFolder('Distortion');
    const rgbShift = this.gui.addFolder('RGB Shift');
    const overlay = this.gui.addFolder('Overlay');
    const noise = this.gui.addFolder('Noise');
    const slide = this.gui.addFolder('Slide');

    const settings = {
      color: '#000000',
      lines: false,
      angle: 0.0,

      slide: () => {
        this.slideStart = Date.now();
        this.slideDuration = this.effects.slide.duration * 1000.0;
        this.slideEnd = this.slideStart + this.slideDuration;

        this.fadeDelay = this.slideStart + this.effects.slide.fadeDelay * 1000.0;
        this.fadeDuration = this.effects.slide.fade * 1000.0;
        this.fadeEnd = this.fadeDelay + this.fadeDuration;

        this.opacity = this.renderer.domElement.style.opacity;
        this.isSliding = true;
      },

      fullscreen: () => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.ratio = this.width / this.height;

        this.gui.domElement.remove();
        this.gui = new dat.GUI();

        document.body.webkitRequestFullscreen();
        cancelAnimationFrame(this.frame);
        this.init(true);
      }
    };

    distortion.add(this.effects.distortion, 'amount', 0.0, 10.0).step(0.1).name('Amount');
    distortion.add(this.effects.distortion, 'speed', 0.0, 1.0).step(0.01).name('Speed');

    rgbShift.add(this.effects.rgbShift, 'amount', 0.0, 1.0).step(0.001).name('Amount');
    rgbShift.add(settings, 'angle', 0.0, 2.0).step(0.01).name('Angle').onChange((angle) => {
      this.effects.rgbShift.angle = angle * Math.PI;
    });

    overlay.add(settings, 'lines').name('Lines Overlay').onChange((lines) => {
      this.glitchUniforms.lines.value = lines ? 1 : 0;
    });

    overlay.addColor(settings, 'color').name('Filter Color').onChange((value) => {
      const color = parseInt(`0x${value.slice(1, 7)}`, 16);

      this.effects.glitch.filterColor = new THREE.Color(color);
    });

    noise.add(this.effects.glitch, 'snow', 0.0, 1.0).step(0.01).name('Snow');
    noise.add(this.effects.glitch, 'amount', 0.0, 1.0).step(0.01).name('Amount');

    slide.add(this.effects.slide, 'xSlide', -1.0, 1.0).step(0.01).name('Horizzontal Slide');
    slide.add(this.effects.slide, 'ySlide', -1.0, 1.0).step(0.01).name('Vertical Slide');

    slide.add(this.effects.slide, 'duration', 0.0, 10.0).step(0.01).name('Duration');
    slide.add(this.effects.slide, 'fade', 0.0, 10.0).step(0.1).name('Fade Out In');
    slide.add(this.effects.slide, 'fadeDelay', 0.0, 10.0).step(0.1).name('Fade Out After');
    slide.add(this.effects.slide, 'slideBack').name('Slide Back');

    this.gui.add(this.effects, 'blur', 0.0, 3.0).step(0.01).name('Blur');
    this.gui.add(this.effects, 'alpha', 0.0, 1.0).step(0.01).name('Alpha').onChange((opacity) => {
      this.renderer.domElement.style.opacity = opacity;
      this.opacity = opacity;
    });

    this.gui.add(this.effects, 'size', 1.0, 2.0).step(0.01).name('Size').onChange((size) => {
      this.glitchUniforms.size.value = size;
    });

    this.gui.add(this.effects, 'onSlide').name('Show On Slide').listen().onChange((onSlide) => {
      if (this.effects.fixed) {
        this.glitchUniforms.show.value = 0;
        this.effects.fixed = false;
      }
    });

    this.gui.add(this.effects, 'fixed').name('Fixed Effects').listen().onChange((fixed) => {
      this.glitchUniforms.show.value = fixed ? 1 : 0;

      if (this.effects.onSlide) {
        this.effects.onSlide = false;
      }
    });

    // this.gui.add(settings, 'fullscreen').name('Go FullScreen');
    this.gui.add(settings, 'slide').name('Slide');
    this.renderer.domElement.style.opacity = 1;
    this.opacity = 1;
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

    this.updateSlideValues();

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.videoTexture.needsUpdate = true;
      this.composer.render();
      this.stats.update();
    }

    this.frame = requestAnimationFrame(this.render.bind(this));
  }

  updateSlideValues() {
    if (this.effects.fixed || this.effects.onSlide) {
      this.glitch.material.uniforms.filterColor.value = this.effects.glitch.filterColor;
      this.glitch.material.uniforms.shift.value = this.effects.rgbShift.amount;
      this.glitch.material.uniforms.angle.value = this.effects.rgbShift.angle;

      this.verticalBlur.material.uniforms.v.value = this.effects.blur / 512.0;
      this.glitch.material.uniforms.blur.value = this.effects.blur / 512.0;

      this.glitchUniforms.distortion.value = this.effects.distortion.amount;
      this.glitchUniforms.speed.value = this.effects.distortion.speed;

      this.glitchUniforms.amount.value = this.effects.glitch.amount;
      this.glitchUniforms.snow.value = this.effects.glitch.snow;
    }

    if (this.effects.fixed && !this.isSliding) {
      this.glitchUniforms.xSlide.value = this.effects.slide.xSlide;
      this.glitchUniforms.ySlide.value = this.effects.slide.ySlide;
    }

    const now = Date.now();

    if (this.isSliding) {
      const delta = this.slideEnd - now;
      const prog = 1 - delta / this.slideDuration;

      if (prog < 1) {
        this.glitchUniforms.xSlide.value = this.effects.slide.xSlide * prog;
        this.glitchUniforms.ySlide.value = this.effects.slide.ySlide * prog;
      } else {
        this.isSliding = false;
      }
    }

    if ((now >= this.fadeDelay) && (now < this.fadeEnd)) {
      const alpha = (this.fadeEnd - now) / this.fadeDuration * this.opacity;

      this.renderer.domElement.style.opacity = alpha.toFixed(2);
    } else if (!this.isSliding) {
      this.renderer.domElement.style.opacity = this.opacity;
    }
  }
}
