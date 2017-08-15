import * as THREE from 'three';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';
    this.mouseCoords = [];

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

    this._setUserEvents();
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

    this.scene.add(new THREE.Points(this.geometry, this.shaderMaterial));
  }

  _setUserEvents() {
    const videoData = this.video.getBoundingClientRect();
    const videoTop = Math.floor(videoData.top);

    this.video.addEventListener('mousemove', (event) => {
      if (this.showGlitch) return;
      clearTimeout(this.timeout);

      this.mouseCoords.push(event.y - videoTop);

      this.timeout = setTimeout(() => {
        if (this.mouseCoords.length) {
          this.mouseCoords = [
            -Math.min(...this.mouseCoords),
            -Math.max(...this.mouseCoords)
          ];

          this.showGlitch = true;
          this.timeout = null;
        }
      }, 500);
    });
  }

  _render() {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      const context = this.canvas.getContext('2d');

      context.drawImage(this.video, 0, 0, this.WIDTH, this.HEIGHT);

      this.imageData = context.getImageData(0, 0, this.WIDTH, this.HEIGHT).data;

      if (this.showGlitch) {
        this._updateGeometry();

        setTimeout(() => {
          this.showGlitch = false;
          this.mouseCoords = [];

          this._clearGeometry();
        }, 1000);
      }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._render.bind(this));
  }

  _updateGeometry() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = (this.HEIGHT - 1.0) / 2.0;
    const WIDTH_2 = (this.WIDTH - 1.0) / 2.0;

    this.stepY = this.mouseCoords[0];
    this.stepX = 300.0;
    this.xSteps = [];

    for (let i = 0, c = 0; i < this.particles; i++, c++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i31 = i3 + 1;
      const i32 = i3 + 2;

      const r = this.imageData[i4] / 255;
      const g = this.imageData[i4 + 1] / 255;
      const b = this.imageData[i4 + 2] / 255;

      const x = (~~(i % this.WIDTH));
      const y = -(~~(i / this.WIDTH));

      positions[i3] = x - WIDTH_2 + 300;
      positions[i31] = y + HEIGHT_2;

      colors[i3] = r;
      colors[i31] = g;
      colors[i32] = b;

      sizes[i] = this._getPixelSize(x, y);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  _getPixelSize(x, y) {
    const coordsLength = this.mouseCoords.length - 1;

    for (let i = 0; i < coordsLength; i++) {
      const y1 = this.mouseCoords[i];
      const y2 = this.mouseCoords[i + 1];

      const vertDist = Math.abs(y2 - y1);
      const horzDist = Math.abs(400 - 300);

      const hypot = Math.hypot(vertDist, horzDist);
      const hypoStepY = Math.floor(hypot / vertDist);
      const hypoStepX = Math.floor(hypot / horzDist);

      if ((x > 300 && y >= y1) || (x > 400 && y < y2)) {
        return 1.0;
      }

      if (x >= 300 && x <= 400 && y <= y1 && y >= y2) {
        if (y < this.stepY && x > this.stepX) {
          this.stepY -= hypoStepX;
          this.stepX += hypoStepY;

          this.xSteps.push(x);
          return 1.0;
        }
      }

      if (x > this.stepX && !this.xSteps.includes(x)) {
        return 1.0;
      }
    }

    return 0.0;
  }

  _clearGeometry() {
    const positions = new Float32Array(this.particles * 3);
    const colors = new Float32Array(this.particles * 3);
    const sizes = new Float32Array(this.particles);

    this.geometry.attributes.position = new THREE.BufferAttribute(positions, 3);
    this.geometry.attributes.color = new THREE.BufferAttribute(colors, 3);
    this.geometry.attributes.size = new THREE.BufferAttribute(sizes, 1);

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
