// place files you want to import through the `$lib` alias in this folder.
export { default as Oscilloscope } from './components/Oscilloscope.svelte';
export { default as FrequencySpectrum } from './components/FrequencySpectrum.svelte';
export { default as PlayPauseControls } from './components/PlayPauseControls.svelte';
export { default as VisualizerCanvas } from './components/base/VisualizerCanvas.svelte';
export { visualizerTheme, sizes } from './theme';

// Template for creating new visualizers
export { default as VisualizerTemplate } from './components/base/VisualizerTemplate.svelte';
