// lib/audio/audioEngine.ts
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Initialize only in the browser
export const audioContext = browser ? new AudioContext() : undefined;
export const waveform = writable<Float32Array>(new Float32Array(2048));
export const spectrum = writable<Uint8Array>(new Uint8Array(1024));
export const isPlaying = writable(false);
export const fullWaveform = writable<Float32Array>(new Float32Array(0));
export const playbackPosition = writable(0); // 0 to 1 indicating position in track

let analyser: AnalyserNode;
let source: AudioBufferSourceNode;
let audioBuffer: AudioBuffer;
let startTime = 0;
let offset = 0;
let animationId: number;
let frameCounter = 0;

// Ensure audio is loaded once at startup
let isLoading = false;
let loadPromise: Promise<AudioBuffer | undefined> | null = null;

export async function loadAudio() {
  if (!browser) return;

  // Use a singleton promise to avoid multiple simultaneous loads
  if (loadPromise) {
    return loadPromise;
  }

  if (audioBuffer) {
    return audioBuffer;
  }

  if (isLoading) {
    console.log('Audio is already loading, waiting...');
    // Simple wait and retry
    await new Promise((resolve) => setTimeout(resolve, 100));
    return loadAudio();
  }

  isLoading = true;
  console.log('Starting audio load process');

  loadPromise = (async () => {
    try {
      console.log('Fetching audio file...');
      const response = await fetch('/demo.wav');
      console.log('Audio file fetched, decoding...');
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext!.decodeAudioData(arrayBuffer);

      // Set up analyser
      analyser = audioContext!.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(audioContext!.destination);

      // Generate and store full waveform data
      console.log('Generating full waveform data...');
      generateFullWaveform();

      console.log('Audio loaded successfully, buffer length:', audioBuffer.length);
      console.log('Full waveform data length:', get(fullWaveform).length);
      return audioBuffer;
    } catch (err) {
      console.error('Error loading audio:', err);
      return undefined;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

// Function to generate waveform data from the entire audio buffer
function generateFullWaveform() {
  if (!audioBuffer) return;

  // Get the audio data from the first channel
  const channelData = audioBuffer.getChannelData(0);

  // For very large files, we might want to downsample
  // For a decent visualization, ~2000-3000 points is usually enough
  const targetLength = 2000;
  const fullWaveformData = new Float32Array(targetLength);

  // Downsample the audio data to fit our target length
  const step = Math.ceil(channelData.length / targetLength);

  for (let i = 0; i < targetLength; i++) {
    // Find the max amplitude in this segment for better visualization
    const start = Math.floor(i * step);
    const end = Math.min(start + step, channelData.length);
    let max = 0;

    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }

    fullWaveformData[i] = max;
  }

  // Update the store with the new waveform data
  fullWaveform.set(fullWaveformData);
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

      // Update playback position on pause
      const progress = Math.min(1, Math.max(0, offset / audioBuffer.duration));
      playbackPosition.set(progress);

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

    // Update playback position
    if (audioBuffer) {
      // Use the get function instead of the get() method
      const playing = get(isPlaying);
      if (playing) {
        // Calculate progress (0-1)
        const elapsed = offset + (audioContext!.currentTime - startTime);
        const progress = Math.min(1, Math.max(0, elapsed / audioBuffer.duration));
        playbackPosition.set(progress);
      }
    }

    // Continue the loop
    animationId = requestAnimationFrame(updateVisualization);
  } catch (err) {
    console.error('Error in visualization update:', err);
  }
}

// Add this function to allow seeking to a specific position in the track
export function seekToPosition(position: number) {
  if (!browser || !audioBuffer) return;

  try {
    // Ensure position is between 0 and 1
    position = Math.min(1, Math.max(0, position));

    // Calculate the new offset in seconds
    offset = position * audioBuffer.duration;

    // Update the playback position
    playbackPosition.set(position);
    console.log(`Seeking to position: ${position.toFixed(2)}, time: ${offset.toFixed(2)}s`);

    // If currently playing, stop and restart from the new position
    if (get(isPlaying)) {
      // Stop current playback
      if (source) {
        source.stop();
      }

      // Start playing from new position
      source = audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);

      startTime = audioContext!.currentTime;
      source.start(0, offset);
    }
  } catch (err) {
    console.error('Error seeking to position:', err);
  }
}

// Add this function to get the audio duration
export async function getAudioDuration(): Promise<number> {
  if (!browser) return 0;

  // Make sure audio is loaded first
  await loadAudio();

  if (!audioBuffer) return 0;
  return audioBuffer.duration;
}
