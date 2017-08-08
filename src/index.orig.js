import * as THREE from 'three';
// import Detector from 'three/examples/js/Detector';
// import Stats from 'three/examples/js/libs/stats.min';


export default class VideoGlitch
{
  constructor() {
    this._name = 'VideoGlitch';

    this.particles = null;
    this.particleSize = 3;

    this.maxZDisplacement = 230;
    this.maxSideLength = 1000;
    this.autoTheta = 0;

    this.pixelColor = new THREE.Color();

    this.colorDepths = [{
      threeColor: new THREE.Color(0xFF0000),
      name: 'Dominant',
      color: 0xd4d0d0,
      depth: 0.78
    }];
  }

  startExperiment() {
    this.video = document.createElement('video');
    this.video.src = 'assets/video.mp4';

    this.video.height = 360;
    this.video.width = 640;

    this.video.preload = true;
    this.video.loop = true;

    this.video.oncanplay = () => {
      this.video.play();
      this._init();
      this.onResize();
    };
  }

  onResize() {
    const width = window.innerWidth, height = window.innerHeight;

    this.RATIO = width / height;
    this.camera.aspect = this.RATIO;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  _init() {
    const particlesShader = this._createParticlesShader();

    this.canvas = document.createElement('canvas');
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, this.RATIO, 0.1, 4000);
    this.camera.position.z = this.maxSideLength / 2.5;

    this.shaderMaterial = new THREE.ShaderMaterial({
      fragmentShader: particlesShader.fragmentShader,
      vertexShader: particlesShader.vertexShader,
      uniforms: particlesShader.uniforms
    });

    if (this.img) {
      this._updateTexture(this.img);
    }

    if (this.video) {
      this._updateTexture(this.video);
    }

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const container = document.getElementById('container');

    container.appendChild(this.renderer.domElement);
    this._render();
  }

  _createParticlesShader() {
    return {
      vertexShader: `
        varying vec3 vColor;
        attribute float size;
        attribute vec3 customColor;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          gl_PointSize = size * (300.0 / length(mvPosition.xyz));
          gl_Position = projectionMatrix * mvPosition;
          vColor = customColor;
        }
      `,

      fragmentShader: `
        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor,1.0);
        }
      `,

      uniforms: Object.assign([{
        color: { type: 'v3', value: new THREE.Vector3(0, 0, 0)},
        tMap: { type: 't', value: null }
      }])
    };
  }

  _render() {
    if ((this.video != null) && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      if (this.video.videoHeight !== this.video.height || this.video.videoWidth !== this.video.width) {
        this.video.width = this.video.videoWidth;
        this.video.height = this.video.videoHeight;
        this._updateTexture(this.video);
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

  _updateTexture(element) {
    if (this.particleSystem) {
      this.geometry.dispose();
      this.scene.remove(this.particleSystem);
    }

    this._calcSize(element);
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;

    this.canvas.getContext('2d').drawImage(element, 0, 0, element.width, element.height, 0, 0, this.WIDTH, this.HEIGHT);
    this.imageData = this.canvas.getContext('2d').getImageData(0, 0, this.WIDTH, this.HEIGHT).data;
    this.particles = this.canvas.width * this.canvas.height;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.particles * 3);
    const colors = new Float32Array(this.particles * 3);
    const sizes = new Float32Array(this.particles);

    this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this._updateGeometry();

    this.particleSystem = new THREE.Points(this.geometry, this.shaderMaterial);
    this.scene.add(this.particleSystem);
  }

  _calcSize(element) {
    this.WIDTH = element.width;
    this.HEIGHT = element.height;

    if (element.height >= element.width) {
      this.HEIGHT = this.maxSideLength;
      this.WIDTH = (this.maxSideLength * element.width) / element.height;
    }

    if (element.width > element.height) {
      this.WIDTH = this.maxSideLength;
      this.HEIGHT = (this.maxSideLength * element.height) / element.width;
    }

    this.HEIGHT = Math.round(this.HEIGHT);
    this.WIDTH = Math.round(this.WIDTH);
  }

  _updateGeometry() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.customColor.array;
    const sizes = this.geometry.attributes.size.array;

    for (let i = 0; i < this.particles; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i31 = i3 + 1;
      const i32 = i3 + 2;

      const r = this.imageData[i4 + 0] / 255;
      const g = this.imageData[i4 + 1] / 255;
      const b = this.imageData[i4 + 2] / 255;
      // const a = this.imageData[i4 + 3] / 255;

      this.pixelColor.setRGB(r, g, b);

      const colorDist = this._colorDistance(this.pixelColor, this.colorDepths[0].threeColor);
      const dist = (1 - colorDist) * this.colorDepths[0].depth;

      let x1 = i % this.WIDTH;
      let y1 = i / this.WIDTH;

      x1 = ~~(0.5 + x1);
      y1 = ~~(0.5 + y1);

      const x = x1 - (this.WIDTH / 2);
      const y = -y1 + (this.HEIGHT / 2);
      const z = dist * this.maxZDisplacement;

      positions[i3] = x;
      positions[i31] = y;
      positions[i32] = z;

      colors[i3] = r;
      colors[i31] = g;
      colors[i32] = b;

      sizes[i] = this.particleSize * (1 - (z / this.maxZDisplacement));
    }

    this.geometry.attributes.customColor.needsUpdate = true;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  _colorDistance(v1, v2) {
    let d = 0;

    d += (v1.r - v2.r) * (v1.r - v2.r);
    d += (v1.g - v2.g) * (v1.g - v2.g);
    d += (v1.b - v2.b) * (v1.b - v2.b);

    return Math.sqrt(d);
  }
}
