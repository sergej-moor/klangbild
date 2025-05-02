// Main entry point that re-exports everything
export * from './core';
export * from './analyzer';
export * from './controls';
export * from './stores';
export * from './visualizer';
export * from './utils';

// Simplified API functions
import { loadAudioFile } from './core';
import {
  togglePlayPause,
  seekToPosition,
  adjustEqualizer,
  setVolume,
  getVolume,
  toggleMute,
} from './controls';
import { startVisualizerUpdates } from './visualizer';
import { isPlaying, audioBuffer, playbackPosition, eqSettings, volume } from './stores';
import { get } from 'svelte/store';

/**
 * Loads an audio file and prepares it for playback
 */
export async function loadAudio(audioSrc: string): Promise<void> {
  try {
    console.log(`Loading audio from: ${audioSrc}`);

    // Check if we have a valid URL
    if (!audioSrc) {
      console.error('Invalid audio source provided');
      return;
    }

    // Check if we need to pause current playback
    const wasPlaying = get(isPlaying);
    if (wasPlaying) {
      togglePlayPause(); // Pause current playback
    }

    // Reset position
    playbackPosition.set(0);

    // Load the audio file using the core function
    const buffer = await loadAudioFile(audioSrc);

    if (!buffer) {
      console.error('Failed to load audio buffer');
      return;
    }

    // Start visualizer updates if not already running
    startVisualizerUpdates();

    // Auto-play if previous track was playing
    if (wasPlaying) {
      togglePlayPause(); // Resume playback with new track
    }

    console.log('Audio loaded successfully');
  } catch (error) {
    console.error('Error loading audio:', error);
  }
}

// Re-export commonly used functions directly
export { togglePlayPause, seekToPosition };

// Export function to get audio duration that uses the store
export function getAudioDuration(): number {
  const buffer = get(audioBuffer);
  return buffer ? buffer.duration : 0;
}

// Re-export the equalizer function
export { eqSettings };

// Simplified EQ adjustment function for all bands at once
export function setEqualizerValues(values: { low: number; mid: number; high: number }) {
  // Update all bands
  adjustEqualizer('low', values.low);
  adjustEqualizer('mid', values.mid);
  adjustEqualizer('high', values.high);
}

// Re-export volume-related functions and stores
export { setVolume, getVolume, toggleMute, volume };
