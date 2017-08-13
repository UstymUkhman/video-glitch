import * as THREE from 'three';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';

    this.container = null;
    this.particles = null;

    this.maxWidth = 1280;
    this.maxHeight = 720;
  }

  startExperiment(container) {
    this.video = document.createElement('video');
    this.video.src = 'assets/video.mp4';

    this.video.preload = true;
    this.video.loop = true;

    this.video.height = 360;
    this.video.width = 640;

    this.video.oncanplay = this._init.bind(this);

    this.container = container;
    this.container.appendChild(this.video);
  }

  _init() {
    this.canvas = document.createElement('canvas');
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, this.RATIO, 1, 1000);
    this.camera.position.z = 869;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.onResize();
    this.video.play();

    this._setShaderMaterial();
    this._setVideoSize();
    this._setVideoParams();
    this._render();
  }

  onResize() {
    let height = window.innerHeight;
    let width = window.innerWidth;

    if (width > this.maxWidth) {
      width = this.maxWidth;
      height = width / 16 * 9;
    }

    if (window.innerHeight < this.maxHeight) {
      width = window.innerHeight / 9 * 16;
      height = window.innerHeight;
    }

    this.WIDTH = width;
    this.HEIGHT = height;
    this.RATIO = width / height;

    this.video.width = this.WIDTH;
    this.video.height = this.HEIGHT;

    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;

    this.camera.aspect = this.RATIO;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  _setShaderMaterial() {
    this.shaderMaterial = new THREE.ShaderMaterial({
      fragmentShader: require('./shaders/particles.frag'),
      vertexShader: require('./shaders/particles.vert'),

      uniforms: Object.assign([{
        color: {type: 'v3', value: new THREE.Vector3(0, 0, 0)},
        tMap: {type: 't', value: null}
      }])
    });
  }

  _setVideoSize() {
    const HEIGHT = this.video.videoHeight;
    const WIDTH = this.video.videoWidth;

    this.video.height = HEIGHT;
    this.video.width = WIDTH;

    if (HEIGHT >= WIDTH) {
      this.WIDTH = Math.round(this.maxWidth * WIDTH / HEIGHT);
      this.HEIGHT = this.maxWidth;

    } else {
      this.HEIGHT = Math.round(this.maxWidth * HEIGHT / WIDTH);
      this.WIDTH = this.maxWidth;
    }
  }

  _setVideoParams() {
    const context = this.canvas.getContext('2d');

    context.drawImage(this.video, 0, 0, this.WIDTH, this.HEIGHT);

    this.imageData = context.getImageData(0, 0, this.WIDTH, this.HEIGHT).data;
    this.geometry = new THREE.BufferGeometry();
    this.particles = this.WIDTH * this.HEIGHT;

    const positions = new Float32Array(this.particles * 3);
    const colors = new Float32Array(this.particles * 3);
    const sizes = new Float32Array(this.particles);

    this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleSystem = new THREE.Points(this.geometry, this.shaderMaterial);
    this.scene.add(this.particleSystem);
  }

  _render() {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      const context = this.canvas.getContext('2d');

      context.drawImage(this.video, 0, 0, this.WIDTH, this.HEIGHT);

      this.imageData = context.getImageData(0, 0, this.WIDTH, this.HEIGHT).data;
      this._updateGeometry();
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._render.bind(this));
  }

  _updateGeometry() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = this.HEIGHT / 2.0;
    const WIDTH_2 = this.WIDTH / 2.0;

    for (let i = 0; i < this.particles; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i31 = i3 + 1;
      const i32 = i3 + 2;

      const r = this.imageData[i4] / 255;
      const g = this.imageData[i4 + 1] / 255;
      const b = this.imageData[i4 + 2] / 255;

      positions[i3] = (~~(i % this.WIDTH)) - WIDTH_2;
      positions[i31] = -(~~(i / this.WIDTH)) + HEIGHT_2;

      colors[i3] = r;
      colors[i31] = g;
      colors[i32] = b;

      sizes[i] = 1.0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
