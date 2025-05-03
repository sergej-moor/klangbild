// Svelte stores for audio state
import { writable, derived } from 'svelte/store';

// Core audio objects
export const audioContext = writable<AudioContext | null>(null);
export const audioBuffer = writable<AudioBuffer | null>(null);
export const audioSource = writable<AudioBufferSourceNode | null>(null);
export const gainNode = writable<GainNode | null>(null);
export const analyzerNode = writable<AnalyserNode | null>(null);

// State
export const isInitialized = writable(false);
export const isPlaying = writable(false);
export const fftSize = writable(2048);
export const sampleRate = writable(44100);

// Timing
export const startTime = writable(0);
export const pauseTime = writable(0);
export const playbackPosition = writable(0);
export const duration = derived(audioBuffer, ($buffer) => ($buffer ? $buffer.duration : 0));

// Analysis data
export const spectrum = writable(new Uint8Array());
export const waveform = writable(new Float32Array());

export interface RmsLevels {
	left: number;
	right: number;
}
export const rmsLevels = writable<RmsLevels>({ left: 0, right: 0 });

// Equalizer nodes
export const eqLowNode = writable<BiquadFilterNode | null>(null);
export const eqMidNode = writable<BiquadFilterNode | null>(null);
export const eqHighNode = writable<BiquadFilterNode | null>(null);

// Equalizer settings
export const eqSettings = writable({
	low: 0, // dB, range: -12 to 12
	mid: 0, // dB, range: -12 to 12
	high: 0 // dB, range: -12 to 12
});

// Volume (0-100)
export const volume = writable(75);
