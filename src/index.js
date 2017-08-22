import * as THREE from 'three';

export default class VideoGlitch {
  constructor() {
    this._name = 'VideoGlitch';

    this.container = null;
    this.particles = null;

    this.height = 360;
    this.width = 640;

    this.slideX = null;
    this.slideY = null;

    this.offsetX = 0.0;
    this.offsetY = 0.0;

    this.ratio = this.width / this.height;
    this.reverseSlide = false;

    this.animations = {
      BACK_AFTER_SLIDE: false,
      VISIBLE_LINES: true,
      COLOR_FILTER: true,

      SLIDE_X: false,
      SLIDE_Y: false,

      ZOOM: false,
      BLUR: false
    };
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

    this.createShaderMaterial();
    this.createVideoStream();
    this.handleUserEvents();

    this.video.play();
    this._render();
  }

  createShaderMaterial() {
    this.shaderMaterial = new THREE.ShaderMaterial({
      fragmentShader: require('./shaders/particles.frag'),
      vertexShader: require('./shaders/particles.vert'),

      uniforms: {
        gColor: {type: 'c', value: new THREE.Vector3(0.0, 0.0, 0.0)}
      }
    });
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
      let r = 0.0, g = 0.0, b = 0.0;

      switch (event.keyCode) {
        case 82: r = 1.0; break; // increment %
        case 71: g = 1.0; break; // increment %
        case 66: b = 1.0; break; // increment %
      }

      if (this.animations.COLOR_FILTER) {
        this.shaderMaterial.uniforms.gColor.value = new THREE.Vector3(r, g, b);
      }

      this.animations.SLIDE_X = true;
      this.animations.SLIDE_Y = true;

      this.reverseSlide = false;
      this.slideX = 50.0; // setted offsets
      this.slideY = 10.0; // setted offsets
    });
  }

  _render() {
    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      const context = this.canvas.getContext('2d');

      context.drawImage(this.video, 0, 0, this.width, this.height);

      this.imageData = context.getImageData(0, 0, this.width, this.height).data;
      this.updateVideoStream();
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._render.bind(this));
  }

  horizontalSlide(fast, slow) {
    if (!this.reverseSlide && this.offsetX < this.slideX) {
      this.offsetX += (this.offsetX < this.slideX / 2) ? fast : slow;

    } else if (this.offsetX > 0.0) {
      this.reverseSlide = true;
      this.offsetX -= slow;

    } else if (this.offsetX <= 0.0 && this.reverseSlide) {
      this.animations.SLIDE_X = false;
      this.offsetX = 0.0;
    }
  }

  verticalSlide(slow) {
    if (this.slideY > 0.0 && this.offsetY < this.slideY) {
      this.offsetY += slow;
    } else if (this.slideY > 0.0) {
      this.slideY = -10.0;
    }

    if (this.slideY < 0.0 && this.offsetY > this.slideY) {
      this.offsetY -= slow;
    } else if (this.slideY < 0.0) {
      this.slideY = 0.0;
    }

    if (this.slideY === 0.0 && this.offsetY < 0.0) {
      this.offsetY += slow;
    } else if (this.slideY === 0.0 && this.offsetY >= 0.0) {
      this.animations.SLIDE_Y = false;
    }
  }

  updateVideoStream() {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const sizes = this.geometry.attributes.size.array;

    const HEIGHT_2 = (this.height - 1.0) / 2.0;
    const WIDTH_2 = (this.width - 1.0) / 2.0;

    const FAST = this.slideX / 15;
    const SLOW = this.slideX / 30;

    const showLines = (this.animations.SLIDE_X || this.animations.SLIDE_Y) && this.animations.VISIBLE_LINES;
    let row = 0.0;

    if (this.animations.SLIDE_X) this.horizontalSlide(FAST, SLOW);
    if (this.animations.SLIDE_Y) this.verticalSlide(SLOW);

    if (!this.animations.SLIDE_X && !this.animations.SLIDE_Y) {
      this.shaderMaterial.uniforms.gColor.value = new THREE.Vector3(0.0, 0.0, 0.0);
    }

    for (let i = 0; i < this.particles;) {
      const x = (~~(i % this.width));
      const y = -(~~(i / this.width));

      const i3 = i * 3;
      const i4 = i * 4;
      const i31 = i3 + 1;

      let r = this.imageData[i4] / 255;
      let g = this.imageData[i4 + 1] / 255;
      let b = this.imageData[i4 + 2] / 255;

      const rowInt = parseInt(row, 0);
      let offsetX = this.offsetX;
      let offsetY = this.offsetY;

      if (showLines && (row - rowInt) < 0.3) {
        r = 0.0;
        g = 0.0;
        b = 0.0;

        offsetX = 0.0;
      }

      positions[i3] = x - WIDTH_2 + offsetX;
      positions[i31] = y + HEIGHT_2 + offsetY;

      colors[i3] = r;
      colors[i31] = g;
      colors[i3 + 2] = b;

      sizes[i] = 1.0;
      i++;

      if (showLines && !((i + 1) % this.width)) {
        row = +(row + 0.2).toFixed(1);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  clearVideoStream() {
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
