// import { dat } from 'dat.gui';
import * as THREE from 'three';

import Detector from 'three/examples/js/Detector';
import Stats from 'three/examples/js/libs/stats.min';

const TrackballControls = require('three-trackballcontrols');

export default class VideoGlitch
{
  constructor() {
    this._name = 'VideoGlitch';

    this._canvas = null;
    this._stats = null;

    this._width = null;
    this._height = null;

    this.video = null;
    this.particles = null;

    this.autoTheta = 0;
    this.particleSize = 3;
    this.maxSideLength = 1000;
    this.maxZDisplacement = 230;

    this.pixelColor = new THREE.Color();

    this.colorDepths = [{
      depth: 0.78,
      color: 0xD4D0D0,
      name: 'Dominant',
      threeColor: new THREE.Color(0xFF0000)
    }]; // , {
    //   depth: 1,
    //   name: 'color2',
    //   color: 0x00FF00,
    //   threeColor: new THREE.Color(0x00FF00)
    // }, {
    //   depth: 1,
    //   name: 'color3',
    //   color: 0x0000FF,
    //   threeColor: new THREE.Color(0x0000FF)
    // }];
  }

  _createVideo() {
    this.video = document.createElement('video');
    this.video.src = 'assets/video.mp4';

    this.video.preload = true;
    this.video.loop = true;

    this.video.height = 360;
    this.video.width = 640;

    this.video.oncanplay = () => {
      this.video.play();
      this._createParticlesShader();
      this._createVideoParticles();
    };
  }

  _createParticlesShader() {
    THREE.ParticleShader = {
      uniforms: THREE.UniformsUtils.merge([{
        'tMap': { type: 't', value: null },
        'color': { type: 'v3', value: new THREE.Vector3(0, 0, 0)}
      }]),

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
      `
    };
  }

  _createVideoParticles() {
    const uniforms = THREE.UniformsUtils.clone(THREE.ParticleShader.uniforms);
    // const gui = new dat.GUI();

    this.camera = new THREE.PerspectiveCamera(75, this._width / this._height, 0.1, 4000);
    this.camera.position.z = this.maxSideLength / 2.5;
    this.scene = new THREE.Scene();

    this.shaderMaterial = new THREE.ShaderMaterial({
      fragmentShader: THREE.ParticleShader.fragmentShader,
      vertexShader: THREE.ParticleShader.vertexShader,
      uniforms: uniforms
    });

    /* gui.add(this, 'particleSize', 0, 50).name('Point Size').onChange(this._updateGeometry);

    gui.add(this, 'maxSideLength', 10, 2000).name('Resolution').onChange = (value) => {
      if (value > 1000) {
        console.warn('Values greater than 1000 will likely result in low performance');
      }

      if (this.video) {
        this._updateTexture(this.video)
      } else {
        this._updateTexture(this.img)
      }
    };

    for (let color in this.colorDepths) {
      gui.addColor(color, 'color').name(color.name).onChange = (value) => {
        const hex = value.toString(16).split('#').join('');

        color.threeColor.setHex(`0x${hex}`);
        this._updateGeometry();
      };

      gui.add(color, 'depth', 0, 1).name(`${color.name} Mult`).onChange = () => {
        this._updateGeometry();
      };
    }

    gui.add(this, 'maxZDisplacement', -1000, 1000).name('Global Mult').onChange(this._updateGeometry.bind(this)); */

    if (this.img) {
      this._updateTexture(this.img);
    }

    if (this.video) {
      this._updateTexture(this.video);
    }

    this._updateTexture(this.video);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const container = document.getElementById('video-container');

    container.appendChild(this.renderer.domElement);
    this._controls = new TrackballControls(this.camera, this.renderer.domElement);

    this._animate();
  }

  _updateTexture(element) {
    if (this.particleSystem) {
      this.geometry.dispose();
      this.scene.remove(this.particleSystem);
    }

    this._calcSize(element);

    this._canvas.width = this._videoWidth;
    this._canvas.height = this._videoHeight;

    this._canvas.getContext('2d').drawImage(
      element,
      0, 0, element.width, element.height,
      0, 0, this._videoWidth, this._videoHeight
    );

    this.imageData = this._canvas.getContext('2d').getImageData(0, 0, this._videoWidth, this._videoHeight).data;
    this.particles = this._canvas.width * this._canvas.height;

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
    this._videoWidth = element.width;
    this._videoHeight = element.height;

    if (element.height >= element.width) {
      this._videoHeight = this.maxSideLength;
      this._videoWidth = (this.maxSideLength * element.width) / element.height;
    }

    if (element.width > element.height) {
      this._videoWidth = this.maxSideLength;
      this._videoHeight = (this.maxSideLength * element.height) / element.width;
    }

    this._videoHeight = Math.round(this._videoHeight);
    this._videoWidth = Math.round(this._videoWidth);
  }

  _updateGeometry() {
    let positions = this.geometry.attributes.position.array;
    let colors = this.geometry.attributes.customColor.array;
    let sizes = this.geometry.attributes.size.array;

    for (let i = 0; i < this.particles.length; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i31 = i3 + 1;
      const i32 = i3 + 2;

      const r = this.imageData[i4 + 0] / 255;
      const g = this.imageData[i4 + 1] / 255;
      const b = this.imageData[i4 + 2] / 255;
      // const a = this.imageData[i4 + 3] / 255;

      this.pixelColor.setRGB(r, g, b);

      const colorDistance = this._colorDistance(this.pixelColor, this.colorDepths[0].threeColor);
      const dist = (1 - colorDistance) * this.colorDepths[0].depth;

      const x1 = ~~(0.5 + (i % this._videoWidth));
      const y1 = ~~(0.5 + (i / this._videoWidth));

      const z = dist * this.maxZDisplacement;
      const y = -y1 + (this._videoHeight / 2);
      const x = x1 - (this._videoWidth / 2);

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
    let dist = (v1.r - v2.r) * (v1.r - v2.r);

    dist += (v1.g - v2.g) * (v1.g - v2.g);
    dist += (v1.b - v2.b) * (v1.b - v2.b);

    return Math.sqrt(dist);
  }

  _addEventListeners() {
    document.addEventListener('drop', this.onDrop);
    document.addEventListener('dragover', this.cancel);
    document.addEventListener('dragenter', this.cancel);
  }

  onDrop(event) {
    event.preventDefault();

    const fileReader = new FileReader();
    // const file = event.dataTransfer.items[0];

    fileReader.onload = (theFile) => {
      const dataURI = theFile.target.result;

      if (dataURI.indexOf('data:image') !== -1) {
        let image = new Image();

        if (this.video) {
          this.video.src = null;
          this.video = null;
        }

        image.src = dataURI;
        image.onload = () => {
          this.img = image;
          this.updateTexture(image);
        };
      }

      if (dataURI.indexOf('data:video') !== -1) {
        if (this.video) {
          this.video.src = null;
          this.video = null;
        }

        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.width = 1920;
        this.video.height = 1080;
        this.video.loop = true;
        this.video.src = dataURI;

        this.updateTexture(this.video);
      }
    };

    fileReader.readAsDataURL(event.dataTransfer.files[0]);
    return false;
  }

  cancel(event) {
    event.preventDefault();
  }

  _render() {
    if (this.video && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      if (this.video.videoHeight !== this.video.height || this.video.videoWidth !== this.video.width) {
        this.video.height = this.video.videoHeight;
        this.video.width = this.video.videoWidth;
        this.updateTexture(this.video);
      }

      this._canvas.getContext('2d').drawImage(
        this.video,
        0, 0, this.video.width, this.video.height,
        0, 0, this._videoWidth, this._videoHeight
      );

      this.imageData = this._canvas.getContext('2d').getImageData(0, 0, this._videoWidth, this._videoHeight).data;
      this._updateGeometry();
    }

    this.scene.rotation.y += 0.0002;
    this.scene.rotation.x += 0.0002;
    this.scene.rotation.z += 0.0002;

    this._controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _animate() {
    this._render();
    requestAnimationFrame(this._animate.bind(this));
  }

  init(canvas) {
    if (!Detector.webgl) {
      Detector.addGetWebGLMessage();
      return false;
    }

    this._canvas = canvas;
    return true;
  }

  startExperiment() {
    this._createVideo();
  }

  showStats() {
    if (!this._stats) {
      this._stats = new Stats();
    }

    document.body.appendChild(this._stats.dom);
  }

  hideStats() {
    this._stats.dom.parentNode.removeChild(this._stats.dom);
  }

  resize(width, height) {
    this._width = width;
    this._height = height;

    this._canvas.width = this._width;
    this._canvas.height = this._height;

    if (this.renderer && this.camera) {
      this.renderer.setSize(this._width, this._height);
      this.camera.aspect = this._width / this._height;
      this.camera.updateProjectionMatrix();
    }
  }
}
