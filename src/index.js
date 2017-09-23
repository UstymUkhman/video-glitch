require('three/examples/js/shaders/CopyShader');
require('three/examples/js/postprocessing/EffectComposer');

require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/MaskPass');
require('three/examples/js/postprocessing/ShaderPass');

import dat from 'three/examples/js/libs/dat.gui.min';
import Stats from 'three/examples/js/libs/stats.min';
import Detector from 'three/examples/js/Detector';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';
    this.gui = new dat.GUI();

    this.container = null;
    this.particles = null;
    this.canvas = null;
    this.stats = null;

    this.height = 360;
    this.width = 640;

    this.ratio = this.width / this.height;
    this.resolution = '640 x 360';

    this.SHOW_GLITCH = false;
    this.maximize = false;

    this.colorFilters = {
      red: 0.0,
      green: 0.0,
      blue: 0.0,
      showOnSlide: false
    };

    this.animations = {
      EFFECTS_DURATION: 2.5,
      SLIDE_DISTANCE: 50.0,
      SHOW_EFFECTS: false,

      SLIDE_ON_Y: false,
      SLIDE_ON_X: true,
      SLIDE_BACK: true,

      ON_SLIDE: false,
      SLIDE_X: false,
      SLIDE_Y: false,

      LINES: false,
      ALPHA: 0.5,
      NOISE: 0.0,
      ZOOM: 1.0,
      BLUR: 0.0
    };

    this.slide = {
      x: {
        backwards: false,
        forwards: false,
        offset: 0.0,
        speed: 15.0,
        to: 50.0,
        step: 1
      },

      y: {
        backwards: false,
        forwards: false,
        offset: 0.0,
        speed: 30.0,
        to: 10.0,
        step: 1
      }
    };
  }

  startExperiment(container) {
    this.createVideoStream('video', false);

    this.container = container;
    this.container.appendChild(this.video);
  }

  createVideoStream(file, update = true) {
    this.video = document.createElement('video');
    this.video.src = `assets/${file}.mp4`;

    this.video.preload = true;
    this.video.loop = true;

    this.video.height = this.height;
    this.video.width = this.width;

    this.video.oncanplay = () => {
      if (update) {
        this.gui.__controllers[3].max(this.video.duration);
        this.gui.__controllers[3].min(0);
      }

      if (this.canvas === null) {
        this.init();
      }
    };
  }

  init(reset = false) {
    if (!Detector.webgl) {
      document.body.appendChild(Detector.getWebGLErrorMessage());
      return;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.height = this.height;
    this.canvas.width = this.width;

    this.video.height = this.height;
    this.video.width = this.width;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, this.ratio, 1, 1000);
    this.camera.aspect = this.ratio;
    this.camera.updateProjectionMatrix();
    this.camera.position.z = Math.round(this.height / 0.82823);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.domElement.id = 'video-canvas';
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    if (!reset) {
      this.createEffectsGUI();
      this.createBlurShader();

      this.video.play();
      this.createStats();
    }

    this.createShaderMaterial();
    this.createVideoGeometry();
    this.render();
  }

  createEffectsGUI() {
    const settings = {
      Video: 'video',

      videos: [
        'video'
      ],

      Ratio: '640 x 360',
      maximizeToScreen: false,

      resolutions: [
        '640 x 360',
        '960 x 540',
        '1280 x 720',
        '1366 x 768',
        '1600 x 900',
        '1920 x 1080',
        '2560 x 1440'
      ],

      Lines: false,
      Blur: 0.0,
      Noise: 0.0,
      Zoom: 1.0,
      Opacity: 0.5,
      showOnSlide: false,

      effectsDuration: 2.5,
      fixedEffects: false,

      slideDistanceX: 50.0,
      slideDistanceY: 10.0,

      slideSpeedX: 15.0,
      slideSpeedY: 30.0,

      Slide: () => {
        this.slide.x.forwards = true;
        this.slide.y.forwards = true;

        this.SHOW_GLITCH = true;
      },

      Show: () => {
        if (this.animations.SHOW_EFFECTS) {
          return;
        }

        const timeout = this.animations.EFFECTS_DURATION * 1000;

        this.animations.SHOW_EFFECTS = true;
        this.SHOW_GLITCH = true;

        setTimeout(() => {
          this.shaderUniforms.filterColor.value = new THREE.Vector3(0.0, 0.0, 0.0);
          this.animations.SHOW_EFFECTS = false;
          this.resetUniformsValues();
        }, timeout);
      }
    };

    this.gui.add(settings, 'Video', settings.videos).onChange(this.createVideoStream.bind(this));

    this.gui.add(settings, 'Ratio', settings.resolutions).onChange((ratio) => {
      this.setVideoSize(ratio, settings.maximizeToScreen);
    });

    this.gui.add(settings, 'maximizeToScreen').onChange((maximize) => {
      this.setVideoSize(this.resolution, maximize);
    });

    const colors = this.gui.addFolder('Colors');
    const effects = this.gui.addFolder('Effects');
    const slide = this.gui.addFolder('Slide');

    colors.add(this.colorFilters, 'red', 0.0, 1.0).step(0.01);
    colors.add(this.colorFilters, 'green', 0.0, 1.0).step(0.01);
    colors.add(this.colorFilters, 'blue', 0.0, 1.0).step(0.01);

    colors.add(this.colorFilters, 'showOnSlide').onFinishChange((value) => {
      this.colorFilters.showOnSlide = value;
    });

    effects.add(settings, 'Lines').onFinishChange((value) => {
      this.animations.LINES = value;
    });

    effects.add(settings, 'Blur', 0.0, 1.0).step(0.01).onChange((value) => {
      this.animations.BLUR = value / 100.0;
    });

    effects.add(settings, 'Noise', 0.0, 20.0).step(0.1).onChange((value) => {
      this.animations.NOISE = value;
    });

    effects.add(settings, 'Zoom', 1.0, 2.0).step(0.125).onChange((value) => {
      this.animations.ZOOM = value;
    });

    effects.add(settings, 'Opacity', 0.0, 1.0).step(0.01).onChange((value) => {
      this.shaderUniforms.alpha.value = value;
      this.animations.ALPHA = value;
    });

    effects.add(settings, 'showOnSlide').onFinishChange((value) => {
      this.animations.ON_SLIDE = value;
    });

    slide.add(this.animations, 'SLIDE_ON_X').onChange(this.setSlideDistance.bind(this));

    slide.add(settings, 'slideDistanceX', -this.width, this.width).onChange((value) => {
      this.slide.x.step = value < 0 ? -1 : 1;
      this.slide.x.to = Math.abs(value);
      this.setSlideDistance();
    });

    slide.add(settings, 'slideSpeedX', 1, 100).onChange((value) => {
      this.slide.x.speed = value;
    });

    slide.add(this.animations, 'SLIDE_ON_Y').onChange(this.setSlideDistance.bind(this));

    slide.add(settings, 'slideDistanceY', -this.height, this.height).onChange((value) => {
      this.slide.y.step = value < 0 ? -1 : 1;
      this.slide.y.to = Math.abs(value);
      this.setSlideDistance();
    });

    slide.add(settings, 'slideSpeedY', 1, 100).onChange((value) => {
      this.slide.y.speed = value;
    });

    slide.add(this.animations, 'SLIDE_BACK');
    this.gui.add(settings, 'Slide');

    this.gui.add(settings, 'effectsDuration', 0, 5.0).step(0.1).onChange((value) => {
      this.animations.EFFECTS_DURATION = value;
    });

    this.gui.add(settings, 'fixedEffects').onChange((fixed) => {
      this.animations.SHOW_EFFECTS = fixed;
      this.SHOW_GLITCH = fixed;

      if (!fixed) {
        this.animations.SHOW_EFFECTS = false;
        this.resetUniformsValues();
      }
    });

    this.gui.add(settings, 'Show');
  }

  setVideoSize(resolution, maximize) {
    let height = +resolution.split(' x ')[1];
    let width = +resolution.split(' x ')[0];

    let updated = false;

    if (!this.maximize && maximize) {
      height = window.innerWidth / 16 * 9;
      width = window.innerWidth;
    }

    this.renderer.domElement.style.height = `${height}px`;
    this.renderer.domElement.style.width = `${width}px`;

    this.video.style.height = `${height}px`;
    this.video.style.width = `${width}px`;

    if (this.resolution !== resolution) {
      this.gui.__folders.Slide.__controllers[4].min(-height);
      this.gui.__folders.Slide.__controllers[4].max(height);

      this.gui.__folders.Slide.__controllers[1].min(-width);
      this.gui.__folders.Slide.__controllers[1].max(width);

      cancelAnimationFrame(this.frameId);
      this.renderer.domElement.remove();

      this.ratio = width / height;
      this.height = height;
      this.width = width;

      this.init(true);
      updated = true;
    }

    this.resolution = resolution;
    this.maximize = maximize;

    if (updated && maximize) {
      this.maximize = !maximize;
      this.setVideoSize(resolution, maximize);
    }
  }

  setSlideDistance() {
    let slideDistance = this.animations.SLIDE_ON_X ? this.slide.x.to : this.slide.y.to;

    if (this.animations.SLIDE_ON_X && this.animations.SLIDE_ON_Y) {
      slideDistance = this.slide.x.to > this.slide.y.to ? this.slide.x.to : this.slide.y.to;
    }

    this.animations.SLIDE_DISTANCE = slideDistance;
  }

  createBlurShader() {
    this.blurUniforms = {
      distortion: { type: 'f', value: 0.0 },
      tDiffuse: { type: 't', value: null }
    };

    this.horizontalBlurShader = new THREE.ShaderMaterial({
      fragmentShader: require('./shaders/blurHorizontal.frag'),
      vertexShader: require('./shaders/blur.vert'),
      uniforms: this.blurUniforms
    });

    this.verticalBlurShader = new THREE.ShaderMaterial({
      fragmentShader: require('./shaders/blurVertical.frag'),
      vertexShader: require('./shaders/blur.vert'),
      uniforms: this.blurUniforms
    });
  }

  createStats() {
    if (!this.stats) {
      this.stats = new Stats();
    }

    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
  }

  createShaderMaterial() {
    const horizontalBlur = new THREE.ShaderPass(this.horizontalBlurShader);
    const verticalBlur = new THREE.ShaderPass(this.verticalBlurShader);

    this.shaderUniforms = {
      filterColor: { type: 'c', value: new THREE.Vector3(0.0, 0.0, 0.0) },
      noiseIntensity: { type: 'f', value: 10.0 },
      alpha: { type: 'f', value: 0.5 },
      time: { type: 'f', value: 0.0 }
    };

    this.shaderMaterial = new THREE.ShaderMaterial({
      fragmentShader: require('./shaders/particles.frag'),
      vertexShader: require('./shaders/particles.vert'),
      uniforms: this.shaderUniforms
    });

    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));

    this.composer.addPass(horizontalBlur);
    this.composer.addPass(verticalBlur);

    verticalBlur.renderToScreen = true;
  }

  createVideoGeometry() {
    const context = this.canvas.getContext('2d');

    context.drawImage(this.video, 0, 0, this.width, this.height);

    this.imageData = context.getImageData(0, 0, this.width, this.height).data;
    this.geometry = new THREE.BufferGeometry();
    this.particles = this.width * this.height;

    const positions = new Float32Array(this.particles * 3);
    const colors = new Float32Array(this.particles * 3);
    const sizes = new Float32Array(this.particles);

    this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.scene.add(new THREE.Points(this.geometry, this.shaderMaterial));
  }

  render() {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      const context = this.canvas.getContext('2d');

      context.drawImage(this.video, 0, 0, this.width, this.height);

      this.imageData = context.getImageData(0, 0, this.width, this.height).data;
      this.updateVideoStream();
    }

    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  updateVideoStream() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = (this.height - 1.0) / 2.0;
    const WIDTH_2 = (this.width - 1.0) / 2.0;

    let onSlide = false;
    let row = 0.0;

    if (this.SHOW_GLITCH) {
      onSlide = this.createEffects();
    }

    for (let i = 0; i < this.particles;) {
      const f = row - parseInt(row, 0);
      const y = -(~~(i / this.width));
      const x = (~~(i % this.width));

      const i3 = i * 3;
      const i4 = i * 4;
      const i31 = i3 + 1;

      let offsetX = this.slide.x.offset;
      let offsetY = this.slide.y.offset;

      let r = this.imageData[i4] / 255;
      let g = this.imageData[i4 + 1] / 255;
      let b = this.imageData[i4 + 2] / 255;

      let showEffect = false;

      if (this.animations.ON_SLIDE || this.animations.SHOW_EFFECTS) {
        showEffect = !onSlide ? this.animations.SHOW_EFFECTS : true;
      }

      if (this.animations.LINES && showEffect && f < 0.3) {
        offsetX = 0.0;

        r = 0.0;
        g = 0.0;
        b = 0.0;
      }

      positions[i3] = x - WIDTH_2 + offsetX;
      positions[i31] = y + HEIGHT_2 + offsetY;

      colors[i3] = r;
      colors[i31] = g;
      colors[i3 + 2] = b;

      sizes[i] = showEffect ? this.animations.ZOOM : 1.0;
      i++;

      if (this.animations.LINES && showEffect && !(i % this.width)) {
        row = +(row + 0.2).toFixed(1);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.composer.render();
    this.stats.update();
  }

  createEffects() {
    let xSpeed = this.slide.x.forwards ? this.slide.x.speed : this.slide.x.speed * 2;
    let ySpeed = this.slide.y.forwards ? this.slide.y.speed : this.slide.y.speed * 2;

    xSpeed = this.animations.SLIDE_DISTANCE / xSpeed;
    ySpeed = this.animations.SLIDE_DISTANCE / ySpeed;

    if (this.animations.SLIDE_ON_X) {
      this.animations.SLIDE_X = !this.animateSlide(this.slide.x, xSpeed);
    }

    if (this.animations.SLIDE_ON_Y) {
      this.animations.SLIDE_Y = !this.animateSlide(this.slide.y, ySpeed);
    }

    const isSliding = this.animations.SLIDE_X || this.animations.SLIDE_Y;

    if (this.animations.SHOW_EFFECTS || (this.animations.ON_SLIDE && isSliding)) {
      this.shaderUniforms.time.value = Number(String(Date.now()).slice(-5)) / 10000;
      this.shaderUniforms.noiseIntensity.value = this.animations.NOISE;

      this.blurUniforms.distortion.value = this.animations.BLUR;
    }

    if (!isSliding) {
      this.shaderUniforms.alpha.value = this.animations.ALPHA;

      if (this.colorFilters.showOnSlide) {
        this.shaderUniforms.filterColor.value = new THREE.Vector3(0.0, 0.0, 0.0);
      }

      if (this.animations.ON_SLIDE && !this.animations.SHOW_EFFECTS) {
        this.resetUniformsValues();
      }
    }

    if (this.animations.SHOW_EFFECTS || (this.colorFilters.showOnSlide && isSliding)) {
      this.shaderUniforms.filterColor.value = new THREE.Vector3(
        this.colorFilters.red, this.colorFilters.green, this.colorFilters.blue
      );
    }

    return isSliding;
  }

  animateSlide(slide, speed) {
    speed *= slide.step;

    if (slide.forwards) {
      slide.offset += speed;
      slide.backwards = slide.offset * slide.step > slide.to;
    }

    if (slide.backwards) {
      slide.forwards = false;

      if (this.animations.SLIDE_BACK) {
        slide.offset -= speed;
        slide.backwards = slide.offset * slide.step > 0.0;

      } else {
        this.shaderUniforms.alpha.value -= this.animations.ALPHA / 20;
        slide.backwards = this.shaderUniforms.alpha.value > 0.0;
      }
    }

    if (!slide.forwards && !slide.backwards) {
      slide.offset = 0.0;
      return true;
    }
  }

  resetUniformsValues() {
    this.shaderUniforms.noiseIntensity.value = 0.0;
    this.blurUniforms.distortion.value = 0.0;
    this.SHOW_GLITCH = false;
  }
}
