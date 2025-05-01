// lib/audio/audioEngine.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Initialize only in the browser
export const audioContext = browser ? new AudioContext() : undefined;
export const waveform = writable<Float32Array>(new Float32Array(2048));
export const spectrum = writable<Uint8Array>(new Uint8Array(1024));
export const isPlaying = writable(false);

let analyser: AnalyserNode;
let source: AudioBufferSourceNode;
let audioBuffer: AudioBuffer;
let startTime = 0;
let offset = 0;
let animationId: number;
let frameCounter = 0;

export async function loadAudio() {
  if (!browser) return;

  if (!audioBuffer) {
    try {
      const response = await fetch('/demo.wav');
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext!.decodeAudioData(arrayBuffer);

      // Set up analyser
      analyser = audioContext!.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(audioContext!.destination);

      console.log('Audio loaded successfully, buffer length:', audioBuffer.length);
    } catch (err) {
      console.error('Error loading audio:', err);
    }
  }
  return audioBuffer;
}

export async function play() {
  if (!browser) return;

  try {
    if (audioContext!.state === 'suspended') {
      await audioContext!.resume();
    }

    await loadAudio();

    // Create a new source node (can't reuse after stopping)
    source = audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);

    // Start playback from the offset
    startTime = audioContext!.currentTime;
    source.start(0, offset);
    isPlaying.set(true);

    // Start the visualization update loop
    updateVisualization();
    console.log('Playback started');
  } catch (err) {
    console.error('Error starting playback:', err);
  }
}

export function pause() {
  if (!browser) return;

  try {
    if (source) {
      source.stop();
      // Calculate the new offset for resuming later
      offset = (offset + audioContext!.currentTime - startTime) % audioBuffer.duration;
      isPlaying.set(false);

      // Stop the visualization update loop
      cancelAnimationFrame(animationId);
      console.log('Playback paused at offset:', offset);
    }
  } catch (err) {
    console.error('Error pausing playback:', err);
  }
}

export function togglePlayPause() {
  if (!browser) return;

  let playing = false;
  isPlaying.subscribe((v) => (playing = v))();

  if (playing) {
    pause();
  } else {
    play();
  }
}

function updateVisualization() {
  if (!browser || !analyser) return;

  try {
    const waveformArray = new Float32Array(analyser.fftSize);
    const spectrumArray = new Uint8Array(analyser.frequencyBinCount);

    // Get audio data
    analyser.getFloatTimeDomainData(waveformArray);
    analyser.getByteFrequencyData(spectrumArray);

    // Update the stores with new data
    waveform.set(waveformArray);
    spectrum.set(spectrumArray);

    // Log data occasionally to verify it's changing
    frameCounter++;
    if (frameCounter % 60 === 0) {
      // Log once every ~1 second
      console.log('Waveform peak:', Math.max(...waveformArray.map((v) => Math.abs(v))));
      console.log('Spectrum peak:', Math.max(...spectrumArray));
    }

    // Continue the loop
    animationId = requestAnimationFrame(updateVisualization);
  } catch (err) {
    console.error('Error in visualization update:', err);
  }
}
