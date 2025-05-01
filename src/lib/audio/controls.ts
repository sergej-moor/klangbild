// Playback controls
import { get } from 'svelte/store';
import {
  isPlaying,
  audioContext,
  audioBuffer,
  audioSource,
  gainNode,
  analyzerNode,
  startTime,
  pauseTime,
  playbackPosition,
} from './stores';
import { getAudioContext, createAudioSource } from './core';
import { setupAnalyzer } from './analyzer';
import { startVisualizerUpdates } from './visualizer';

// Play audio from current position
export function playAudio() {
  const context = getAudioContext();
  const buffer = get(audioBuffer);

  if (!context || !buffer) return;

  // Stop existing source if playing
  const currentSource = get(audioSource);
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore errors if already stopped
    }
    audioSource.set(null);
  }

  // Create new source node
  const source = context.createBufferSource();
  source.buffer = buffer;

  // Create gain node if needed
  let gain = get(gainNode);
  if (!gain) {
    gain = context.createGain();
    gainNode.set(gain);
  }

  // Create analyzer if needed
  let analyzer = get(analyzerNode);
  if (!analyzer) {
    analyzer = setupAnalyzer();
  }

  // Connect audio graph
  source.connect(gain);
  if (analyzer) {
    gain.connect(analyzer);
    analyzer.connect(context.destination);
  } else {
    gain.connect(context.destination);
  }

  // Calculate position
  const position = get(playbackPosition);
  const offset = position * buffer.duration;

  // Start playback
  source.start(0, offset);
  startTime.set(context.currentTime - offset);
  audioSource.set(source);
  isPlaying.set(true);

  // Start visualization updates
  startVisualizerUpdates();

  return source;
}

// Pause audio
export function pauseAudio() {
  const context = getAudioContext();
  const source = get(audioSource);
  const buffer = get(audioBuffer);

  if (!context || !source || !buffer || !get(isPlaying)) return;

  // Stop the current source
  source.stop();
  audioSource.set(null);

  // Calculate current position
  const elapsed = context.currentTime - get(startTime);
  const position = Math.min(elapsed / buffer.duration, 1);
  playbackPosition.set(position);
  pauseTime.set(context.currentTime);
  isPlaying.set(false);
}

// Toggle play/pause
export function togglePlayPause() {
  if (get(isPlaying)) {
    pauseAudio();
  } else {
    playAudio();
  }
}

// Seek to position (0-1)
export function seekToPosition(position: number) {
  const normalizedPos = Math.max(0, Math.min(1, position));
  playbackPosition.set(normalizedPos);

  // If playing, restart from new position
  if (get(isPlaying)) {
    // Stop current playback
    const source = get(audioSource);
    if (source) {
      source.stop();
      audioSource.set(null);
    }

    // Restart with the new position
    playAudio();
  }
}

// Get audio duration in seconds
export function getAudioDuration() {
  const buffer = get(audioBuffer);
  return buffer ? buffer.duration : 0;
}
