// Inspired by Max Payne 3 glitch effects and Bad TV Shader:
// http://felixturner.github.io/bad-tv-shader/example/

import dat from 'three/examples/js/libs/dat.gui.min';

require('three/examples/js/postprocessing/EffectComposer');
require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/ShaderPass');
require('three/examples/js/shaders/CopyShader');

export default class VideoGlitch {
  constructor() {
    this.width = 1920;
    this.height = 1080;

    this.container = null;
    this.gui = new dat.GUI();
    this.setFullscreenMethods();

    this.ratio = this.width / this.height;
    this.overlay = new THREE.Color(0, 0, 0);
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
    this.video.height = this.height;
    this.video.width = this.width;

    if (this.renderer) return;

    this.renderer = new THREE.WebGLRenderer({
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
      overlay: new THREE.Color(0.0),
      color: '#000000',
      lines: false,

      noise: 0.0,
      alpha: 1.0,
      blur: 0.0,
      time: 0.0,
      size: 1.0,

      distortion: {
        amount: 0.0,
        speed: 0.0
      },

      rgbShift: {
        amount: 0.0,
        angle: 0.0
      } // ,

      // slide: {
      //   fade: 1.0,
      //   xSlide: 0.0,
      //   ySlide: 0.0,
      //   duration: 5.0,
      //   fadeDelay: 0.0,
      //   slideBack: false
      // }
    };
  }

  createGlitchShader() {
    const copyPass = new THREE.ShaderPass(THREE.CopyShader);

    this.glitchUniforms = {
      distortion: { type: 'f', value: this.effects.distortion.amount },
      speed: { type: 'f', value: this.effects.distortion.speed },

      shift: { type: 'f', value: this.effects.rgbShift.amount },
      angle: { type: 'f', value: this.effects.rgbShift.angle },

      // Slide Effects:
      // xSlide: { type: 'f', value: this.effects.slide.xSlide },
      // ySlide: { type: 'f', value: this.effects.slide.ySlide },

      overlay: { type: 'c', value: this.effects.overlay },
      noise: { type: 'f', value: this.effects.noise },
      blur: { type: 'f', value: this.effects.blur / 512.0 },

      lines: { type: 'i', value: ~~this.effects.lines },
      size: { type: 'f', value: this.effects.size },

      time: { type: 'f', value: this.effects.time },
      tDiffuse: { type: 't', value: null }
    };

    this.glitch = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/glitch.frag'),
        vertexShader: require('./shaders/glitch.vert'),
        uniforms: this.glitchUniforms
      })
    );

    this.composer.addPass(copyPass);
    this.glitch.renderToScreen = true;
    this.composer.addPass(this.glitch);
  }

  createControls() {
    const distortion = this.gui.addFolder('Distortion');
    const rgbShift = this.gui.addFolder('RGB Shift');

    // distortion.open();
    // rgbShift.open();

    distortion.add(this.effects.distortion, 'amount', 0.0, 1.0).step(0.01).name('Amount').onChange(amount => {
      this.glitchUniforms.distortion.value = amount;
    });

    distortion.add(this.effects.distortion, 'speed', 0.0, 1.0).step(0.01).name('Speed').onChange(speed => {
      this.glitchUniforms.speed.value = speed / 4.0;
    });

    rgbShift.add(this.effects.rgbShift, 'amount', 0.0, 1.0).step(0.01).name('Amount').onChange(amount => {
      this.glitch.material.uniforms.shift.value = amount;
    });

    rgbShift.add(this.effects.rgbShift, 'angle', 0.0, 2.0).step(0.01).name('Angle').onChange(angle => {
      this.glitch.material.uniforms.angle.value = angle * Math.PI;
    });

    this.gui.addColor(this.effects, 'color').name('Overlay').onChange(color => {
      this.glitch.material.uniforms.overlay.value = this.overlay.set(color);
    });

    this.gui.add(this.effects, 'noise', 0.0, 1.0).step(0.01).name('Noise').onChange(noise => {
      this.glitchUniforms.noise.value = noise;
    });

    this.gui.add(this.effects, 'blur', 0.0, 1.0).step(0.01).name('Blur').onChange(blur => {
      this.glitchUniforms.blur.value = blur;
    });

    this.gui.add(this.effects, 'size', 1.0, 2.0).step(0.01).name('Size').onChange(size => {
      this.glitchUniforms.size.value = size;
    });

    this.gui.add(this.effects, 'lines').name('Lines').onChange(lines => {
      this.glitchUniforms.lines.value = lines ? 1 : 0;
    });

    this.gui.add(this.effects, 'alpha', 0.0, 1.0).step(0.01).name('Alpha').onChange(alpha => {
      this.renderer.domElement.style.opacity = alpha;
    });

    this.fullscreen = this.gui.add(this, 'toggleFullscreen').name('Enter Fullscreen');
  }

  render(delta) {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.videoTexture.needsUpdate = true;
      this.composer.render();
    }

    this.frame = requestAnimationFrame(this.render.bind(this));
    this.glitchUniforms.time.value = delta;
  }

  toggleFullscreen() {
    const isFullscreen = this.isFullscreen();
    const action = isFullscreen ? 'Enter' : 'Exit';

    if (!isFullscreen) {
      document.body.requestFullscreen();
    } else {
      document.exitFullscreen();
    }

    this.fullscreen.__li.innerText = `${action} Fullscreen`;
  }

  setFullscreenMethods() {
    document.exitFullscreen =
      document.exitFullscreen ||
      document.msExitFullscreen ||
      document.mozCancelFullScreen ||
      document.webkitCancelFullScreen;

    document.body.requestFullscreen =
      document.body.requestFullscreen ||
      document.body.msRequestFullscreen ||
      document.body.mozRequestFullScreen ||
      document.body.webkitRequestFullscreen;
  }

  isFullscreen() {
    return !!document.webkitFullscreenElement ||
      !!document.mozFullScreenElement ||
      !!document.msFullscreenElement ||
      !!document.fullscreenElement;
  }
}
