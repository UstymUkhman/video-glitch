import VideoGlitch from '@/VideoGlitch';

const glitch = new VideoGlitch('./assets/lake.mp4');
window.addEventListener('resize', glitch.resize.bind(glitch));
