// Main entry point that re-exports everything
export * from './core';
export * from './analyzer';
export * from './controls';
export * from './stores';
export * from './visualizer';
export * from './utils';

// Simplified API functions
import { loadAudioFile } from './core';
import { togglePlayPause, seekToPosition, getAudioDuration } from './controls';
import { startVisualizerUpdates } from './visualizer';

// Load audio and start visualizer
export async function loadAudio(url: string) {
  const buffer = await loadAudioFile(url);

  // Always start the visualizer updates, even before playing
  // This ensures UI updates happen continuously
  const cleanup = startVisualizerUpdates();

  // Return any cleanup function if needed
  return {
    buffer,
    cleanup,
  };
}

// Re-export commonly used functions directly
export { togglePlayPause, seekToPosition, getAudioDuration };
