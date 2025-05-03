// place files you want to import through the `$lib` alias in this folder.
export { default as Oscilloscope } from './components/visualizer/Oscilloscope.svelte';
export { default as FrequencySpectrum } from './components/visualizer/FrequencySpectrum.svelte';
export { default as PlayPauseControls } from './components/legacy/PlayPauseControls.svelte';
export { default as VisualizerCanvas } from './components/visualizer/VisualizerCanvas.svelte';
export { sizes } from './theme';

// Template for creating new visualizers
export { default as VisualizerTemplate } from './components/legacy/VisualizerTemplate.svelte';
