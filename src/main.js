import VideoGlitch from '@/VideoGlitch';

const glitch = new VideoGlitch();

window.addEventListener('resize', glitch.resize.bind(glitch));
