// Core audio context and initialization
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { isInitialized, audioContext, audioBuffer, audioSource, sampleRate } from './stores';

// Initialize audio context (safely handles browser compatibility)
export function initAudioContext() {
  if (!browser || get(isInitialized)) return null;

  try {
    // @ts-ignore - Handle webkit prefix for Safari
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    audioContext.set(context);
    sampleRate.set(context.sampleRate);
    isInitialized.set(true);
    return context;
  } catch (error) {
    console.error('Failed to initialize AudioContext:', error);
    return null;
  }
}

// Load audio file and decode into buffer
export async function loadAudioFile(url: string) {
  const context = get(audioContext) || initAudioContext();
  if (!context) return null;

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const decodedData = await context.decodeAudioData(arrayBuffer);
    audioBuffer.set(decodedData);
    return decodedData;
  } catch (error) {
    console.error('Error loading audio file:', error);
    return null;
  }
}

// Create and connect audio source
export function createAudioSource(buffer: AudioBuffer) {
  const context = get(audioContext);
  if (!context || !buffer) return null;

  const source = context.createBufferSource();
  source.buffer = buffer;
  audioSource.set(source);
  return source;
}

// Get current audio context
export function getAudioContext() {
  return get(audioContext) || initAudioContext();
}
