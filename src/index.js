// http://felixturner.github.io/bad-tv-shader/example/

require('three/examples/js/shaders/CopyShader');
require('three/examples/js/postprocessing/EffectComposer');

require('three/examples/js/postprocessing/RenderPass');
require('three/examples/js/postprocessing/MaskPass');
require('three/examples/js/postprocessing/ShaderPass');

// import dat from 'three/examples/js/libs/dat.gui.min';
import Stats from 'three/examples/js/libs/stats.min';
import Detector from 'three/examples/js/Detector';

export default class VideoGlitch {
  constructor() {
    this.width = 640;
    this.height = 360;

    this.time = 0.0;
    this.stats = null;
    this.container = null;

    // this.gui = new dat.GUI();
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
    this.createGlitchShader();
    this.createBlurShader();
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

  createGlitchShader() {
    this.glitchUniforms = {
      tDiffuse: { type: 't', value: null },
      amount: { type: 'f', value: 0.15 },
      time: { type: 'f', value: 0.0 },
      size: { type: 'f', value: 1.0 }
    };

    const glitchPass = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/glitch.frag'),
        vertexShader: require('./shaders/glitch.vert'),
        uniforms: this.glitchUniforms
      })
    );

    this.composer.addPass(glitchPass);
  }

  createBlurShader() {
    this.blurUniforms = {
      distortion: { type: 'f', value: 0.0 },
      tDiffuse: { type: 't', value: null }
    };

    const horizontalPass = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/blurHorizontal.frag'),
        vertexShader: require('./shaders/blur.vert'),
        uniforms: this.blurUniforms
      })
    );

    const verticalPass = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        fragmentShader: require('./shaders/blurVertical.frag'),
        vertexShader: require('./shaders/blur.vert'),
        uniforms: this.blurUniforms
      })
    );

    this.composer.addPass(horizontalPass);
    this.composer.addPass(verticalPass);
    verticalPass.renderToScreen = true;
  }

  createStats() {
    if (!this.stats) {
      this.stats = new Stats();
    }

    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
  }

  render() {
    this.time += 0.1;
    this.glitchUniforms.time.value = this.time;

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.videoTexture.needsUpdate = true;
      this.composer.render();
      this.stats.update();
    }

    this.frameId = requestAnimationFrame(this.render.bind(this));
  }
}
