import * as THREE from 'three';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';
    this.particles = null;

    this.maxWidth = 1280;
    this.maxHeight = 720;
  }

  startExperiment() {
    this.video = document.createElement('video');
    this.video.src = 'assets/video.mp4';

    this.video.preload = true;
    this.video.loop = true;

    this.video.height = 360;
    this.video.width = 640;

    this.video.oncanplay = () => {
      this.video.play();
      this._init();
      this.onResize();
    };
  }

  _init() {
    this.canvas = document.createElement('canvas');
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, this.RATIO, 0.1, 4000);
    this.camera.position.z = this.maxWidth / 2.5;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);

    document.getElementById('container').appendChild(this.renderer.domElement);

    this._createShaderMaterial();
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

  _createShaderMaterial() {
    this.shaderMaterial = new THREE.ShaderMaterial({
      fragmentShader: require('./shaders/particles.frag'),
      vertexShader: require('./shaders/particles.vert'),

      uniforms: Object.assign([{
        color: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
        tMap: { type: 't', value: null }
      }])
    });
  }

  _render() {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      if (this.video.videoHeight !== this.video.height || this.video.videoWidth !== this.video.width) {

        this.video.height = this.video.videoHeight;
        this.video.width = this.video.videoWidth;

        this._calcVideoSize();
        this._updateTexture();
      }

      this.canvas.getContext('2d').drawImage(this.video,
        0, 0, this.video.width, this.video.height,
        0, 0, this.WIDTH, this.HEIGHT
      );

      this.imageData = this.canvas.getContext('2d').getImageData(0, 0, this.WIDTH, this.HEIGHT).data;
      this._updateGeometry();
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._render.bind(this));
  }

  _calcVideoSize() {
    const HEIGHT = this.video.height;
    const WIDTH = this.video.width;

    if (HEIGHT >= WIDTH) {
      this.WIDTH = Math.round(this.maxWidth * WIDTH / HEIGHT);
      this.HEIGHT = this.maxWidth;
    } else {
      this.HEIGHT = Math.round(this.maxWidth * HEIGHT / WIDTH);
      this.WIDTH = this.maxWidth;
    }
  }

  _updateTexture() {
    this.canvas.height = this.HEIGHT;
    this.canvas.width = this.WIDTH;

    this.canvas.getContext('2d').drawImage(this.video,
      0, 0, this.video.width, this.video.height,
      0, 0, this.WIDTH, this.HEIGHT
    );

    this.imageData = this.canvas.getContext('2d').getImageData(0, 0, this.WIDTH, this.HEIGHT).data;
    this.particles = this.canvas.width * this.canvas.height;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.particles * 3);
    const colors = new Float32Array(this.particles * 3);
    const sizes = new Float32Array(this.particles);

    this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleSystem = new THREE.Points(this.geometry, this.shaderMaterial);
    this.scene.add(this.particleSystem);
  }

  _updateGeometry() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = this.HEIGHT / 2;
    const WIDTH_2 = this.WIDTH / 2;

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
