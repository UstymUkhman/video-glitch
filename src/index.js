import * as THREE from 'three';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';
    this.mouseCoords = [[], []];

    this.container = null;
    this.particles = null;

    this.maxWidth = 960; // 1280
    this.maxHeight = 540; // 720

    this.OFFSET = 200.0;

    this.x1 = null;
    this.x2 = null;

    this.y1 = null;
    this.y2 = null;
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
    this.camera.position.z = Math.round(this.maxHeight / 0.82823);

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
      vertexShader: require('./shaders/particles.vert')
    });
  }

  _setVideoSize() {
    const HEIGHT = 540; // this.video.videoHeight;
    const WIDTH = 960; // this.video.videoWidth;

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
    const videoLeft = Math.floor(videoData.left);
    const videoTop = Math.floor(videoData.top);

    this.video.addEventListener('mousemove', (event) => {
      if (this.showGlitch) return;
      clearTimeout(this.timeout);

      this.mouseCoords[0].push(event.x - videoLeft);
      this.mouseCoords[1].push(event.y - videoTop);

      this.timeout = setTimeout(() => {
        if (this.mouseCoords.length) {
          this.x1 = Math.abs(Math.min(...this.mouseCoords[0]));
          this.x2 = Math.abs(Math.max(...this.mouseCoords[0]));

          // this.y1 = -Math.abs(Math.min(...this.mouseCoords[1]));
          // this.y2 = -Math.abs(Math.max(...this.mouseCoords[1]));

          this.y1 = 0;
          this.y2 = -this.maxHeight;

          this.mouseCoords = [[], []];
          this.showGlitch = true;
          this.timeout = null;

          setTimeout(() => {
            this.showGlitch = false;
            this._clearGeometry();
          }, 2500);
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
      }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._render.bind(this));
  }

  _updateGeometry() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = (this.HEIGHT + 1.0) / 2.0;
    const WIDTH_2 = (this.WIDTH + 1.0) / 2.0;

    let row = 0.0;

    this.stepY = this.y1;
    this.stepX = this.x1;
    this.xSteps = [];

    for (let i = 0; i < this.particles; i++) {
      const x = (~~(i % this.WIDTH));
      const y = -(~~(i / this.WIDTH));

      if (this._getPixelSize(x, y)) {
        const i3 = i * 3;
        const i4 = i * 4;
        const i31 = i3 + 1;

        let r = this.imageData[i4] / 255;
        let g = this.imageData[i4 + 1] / 255;
        let b = this.imageData[i4 + 2] / 255;

        if (Number.isInteger(row)) {
          r = 0.0;
          g = 0.0;
          b = 0.0;
        }

        positions[i3] = x - WIDTH_2 + this.OFFSET;
        positions[i31] = y + HEIGHT_2;

        colors[i3] = r;
        colors[i31] = g;
        colors[i3 + 2] = b;

        sizes[i] = 1.0;
      }

      if (i % this.WIDTH === 0) {
        row = +(row + 0.2).toFixed(1);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  _getPixelSize(x, y) {
    const borderX = Math.max(this.x1, this.stepX);
    const borderY = Math.min(this.y1, this.stepY);

    const vertDist = Math.abs(this.y2 - this.y1);
    const horzDist = Math.abs(this.x2 - this.x1);

    const hypot = Math.hypot(vertDist, horzDist);
    const hypoStepY = hypot / vertDist;
    const hypoStepX = hypot / horzDist;

    const maxX = x > this.x2;
    const minY = y < this.y2;

    if ((x > this.x1 && y >= this.y1) || (maxX && minY)) {
      return false;
    }

    if (!maxX && !minY && y < borderY && x > borderX) {
      this.stepY -= hypoStepX;
      this.stepX += hypoStepY;

      this.xSteps.push(x);
      return false;
    }

    if (x > this.stepX && !this.xSteps.includes(x)) {
      return true;
    }

    return false;
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
