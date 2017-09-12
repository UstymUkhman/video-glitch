require('three/examples/js/shaders/CopyShader');
require('three/examples/js/postprocessing/EffectComposer');

require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/MaskPass');
require('three/examples/js/postprocessing/ShaderPass');

// import Detector from 'three/examples/js/Detector';
// import Stats from 'three/examples/js/libs/stats.min';
import dat from 'three/examples/js/libs/dat.gui.min';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';
    this._gui = new dat.GUI();

    this.container = null;
    this.particles = null;
    this.canvas = null;

    this.height = 360;
    this.width = 640;

    this.ratio = this.width / this.height;

    this._colorFilters = {
      red: 0.0,
      green: 0.0,
      blue: 0.0,
      showOnSlide: false
    };

    this.animations = {
      ON_SLIDE: false,
      SLIDE_X: false,
      SLIDE_Y: false,

      LINES: false,
      NOISE: 0.0,
      ZOOM: false,
      SIZE: 1.0,
      BLUR: 0.0
    };

    this.slide = {
      x: {
        backwards: false,
        forwards: false,
        offset: 0.0,
        step: 0,
        to: 0.0
      },

      y: {
        backwards: false,
        forwards: false,
        offset: 0.0,
        step: 0,
        to: 0.0
      }
    };
  }

  startExperiment(container) {
    this.video = document.createElement('video');
    this.video.src = 'assets/video.mp4';

    this.video.preload = true;
    this.video.loop = true;

    this.video.height = 360;
    this.video.width = 640;

    this.video.oncanplay = () => {
      if (this.canvas === null) {
        this._init();
      }
    };

    this.container = container;
    this.container.appendChild(this.video);
  }

  _init() {
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

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.createEffectsGUI();
    this.createBlurShader();
    this.createShaderMaterial();
    this.createVideoStream();
    this.handleUserEvents();

    this.video.play();
    this.render();
  }

  createEffectsGUI() {
    const colors = this._gui.addFolder('Colors');
    const settings = {
      Lines: false,
      Blur: 0.0,
      Noise: 0.0,
      Size: 1.0,
      showOnSlide: false
    };

    colors.add(this._colorFilters, 'red', 0.0, 1.0).step(0.01);
    colors.add(this._colorFilters, 'green', 0.0, 1.0).step(0.01);
    colors.add(this._colorFilters, 'blue', 0.0, 1.0).step(0.01);

    colors.add(this._colorFilters, 'showOnSlide').onFinishChange((value) => {
      this._colorFilters.showOnSlide = value;

      if (this._colorFilters.showOnSlide) {
        this.shaderUniforms.filterColor.value = new THREE.Vector3(0.0, 0.0, 0.0);
      }
    });

    this._gui.add(settings, 'Lines').onFinishChange((value) => {
      this.animations.LINES = value;
    });

    this._gui.add(settings, 'Blur', 0.0, 1.0).step(0.01).onChange((value) => {
      this.animations.BLUR = value / 100.0;
    });

    this._gui.add(settings, 'Noise', 0.0, 20.0).step(0.1).onChange((value) => {
      this.animations.NOISE = value;
    });

    this._gui.add(settings, 'Size', 1.0, 2.0).step(0.125).onChange((value) => {
      this.animations.SIZE = value;
    });

    this._gui.add(settings, 'showOnSlide').onFinishChange((value) => {
      this.animations.ON_SLIDE = value;

      if (this.animations.ON_SLIDE) {
        this.shaderUniforms.noiseIntensity.value = 0.0;
        this.blurUniforms.distortion.value = 0.0;
      }
    });
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

  createShaderMaterial() {
    const horizontalBlur = new THREE.ShaderPass(this.horizontalBlurShader);
    const verticalBlur = new THREE.ShaderPass(this.verticalBlurShader);

    this.shaderUniforms = {
      filterColor: { type: 'c', value: new THREE.Vector3(0.0, 0.0, 0.0) },
      noiseIntensity: { type: 'f', value: 10.0 },
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

  createVideoStream() {
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

  handleUserEvents() {
    // const videoData = this.video.getBoundingClientRect();
    // const videoLeft = Math.floor(videoData.left);
    // const videoTop = Math.floor(videoData.top);

    // this.video.addEventListener('mousemove', (event) => {
    //   if (this.showGlitch) return;
    //   this.xCoord = event.x - videoLeft;
    // });

    document.addEventListener('keydown', (event) => {
      this.animations.SLIDE_X = true;
      // this.animations.SLIDE_Y = true;

      this.slide.x.forwards = true;
      this.slide.y.forwards = true;

      this.slide.x.to = 50.0; // setted offsets
      this.slide.y.to = 10.0; // setted offsets

      this.slide.y.step = 1; // 1 --> top   | -1 --> bottom
      this.slide.x.step = 1; // 1 --> right | -1 --> left
    });
  }

  render() {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      const context = this.canvas.getContext('2d');

      context.drawImage(this.video, 0, 0, this.width, this.height);

      this.imageData = context.getImageData(0, 0, this.width, this.height).data;
      this.updateVideoStream();
    }

    requestAnimationFrame(this.render.bind(this));
  }

  animateSlide(slide, speed) {
    speed *= slide.step;

    if (slide.forwards) {
      slide.offset += speed;
      slide.backwards = slide.offset * slide.step > slide.to;
    }

    if (slide.backwards) {
      slide.offset -= speed;
      slide.forwards = false;
      slide.backwards = slide.offset * slide.step > 0.0;
    }

    if (!slide.forwards && !slide.backwards) {
      slide.offset = 0.0;
      return true;
    }
  }

  createEffects() {
    const fast = this.slide.x.to / 15;
    const slow = this.slide.x.to / 30;

    if (this.animations.SLIDE_X) {
      this.animations.SLIDE_X = !this.animateSlide(this.slide.x, this.slide.x.forwards ? fast : slow);
    }

    if (this.animations.SLIDE_Y) {
      this.animations.SLIDE_Y = !this.animateSlide(this.slide.y, slow);
    }

    const isSliding = this.animations.SLIDE_X || this.animations.SLIDE_Y;

    if (!this.animations.ON_SLIDE || (this.animations.ON_SLIDE && isSliding)) {
      this.shaderUniforms.time.value = Number(String(Date.now()).slice(-5)) / 10000;
      this.shaderUniforms.noiseIntensity.value = this.animations.NOISE;

      this.blurUniforms.distortion.value = this.animations.BLUR;
    }

    if (!this._colorFilters.showOnSlide || isSliding) {
      this.shaderUniforms.filterColor.value = new THREE.Vector3(
        this._colorFilters.red, this._colorFilters.green, this._colorFilters.blue
      );
    }

    return isSliding;
  }

  updateVideoStream() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = (this.height - 1.0) / 2.0;
    const WIDTH_2 = (this.width - 1.0) / 2.0;

    const onSlide = this.createEffects();
    let row = 0.0;

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

      const showEffect = this.animations.ON_SLIDE ? onSlide : true;

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

      sizes[i] = showEffect ? this.animations.SIZE : 1.0;
      i++;

      if (this.animations.LINES && showEffect && !((i + 1) % this.width)) {
        row = +(row + 0.2).toFixed(1);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.composer.render();
  }

  /* clearVideoStream() {
    const positions = new Float32Array(this.particles * 3);
    const colors = new Float32Array(this.particles * 3);
    const sizes = new Float32Array(this.particles);

    this.geometry.attributes.position = new THREE.BufferAttribute(positions, 3);
    this.geometry.attributes.color = new THREE.BufferAttribute(colors, 3);
    this.geometry.attributes.size = new THREE.BufferAttribute(sizes, 1);

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  } */
}
