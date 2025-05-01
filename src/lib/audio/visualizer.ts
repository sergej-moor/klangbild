// Visualizer-specific processing
import { get } from 'svelte/store';
import {
  spectrum,
  waveform,
  rmsLevels,
  analyzerNode,
  isPlaying,
  audioBuffer,
  audioContext,
  startTime,
  playbackPosition,
} from './stores';
import { getFrequencyData, getWaveformData, calculateRMSLevels } from './analyzer';

// Update all visualizer data
export function updateVisualizerData() {
  if (!get(analyzerNode)) return;

  // Update spectrum data
  const freqData = getFrequencyData();
  spectrum.set(freqData);

  // Update waveform data
  const waveData = getWaveformData();
  waveform.set(waveData);

  // Update RMS levels
  const levels = calculateRMSLevels();
  rmsLevels.set(levels);

  // Update playback position (critical for UI updates)
  updatePlaybackPosition();
}

// Update the playback position during playback
function updatePlaybackPosition() {
  const context = get(audioContext);
  const buffer = get(audioBuffer);
  const playing = get(isPlaying);

  if (context && buffer && playing) {
    // Calculate current playback position based on elapsed time
    const startTimeValue = get(startTime);
    const elapsed = context.currentTime - startTimeValue;
    const progress = Math.min(1, Math.max(0, elapsed / buffer.duration));

    // Update the store
    playbackPosition.set(progress);
  }
}

// Start visualization update loop
export function startVisualizerUpdates() {
  let animationId: number;

  function update() {
    updateVisualizerData();
    animationId = requestAnimationFrame(update);
  }

  update();

  // Return cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

// Calculate levels for visualizers
export function calculateLevels() {
  if (!get(isPlaying)) return;
  updateVisualizerData();
}
