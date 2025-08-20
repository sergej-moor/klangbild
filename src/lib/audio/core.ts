// Core audio context and initialization
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import {
	isInitialized,
	audioContext,
	audioBuffer,
	audioSource,
	sampleRate,
	eqLowNode,
	eqMidNode,
	eqHighNode
} from './stores';

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
		return null;
	}
}

// Load audio file and decode into buffer
export async function loadAudioFile(url: string) {
	const context = get(audioContext) || initAudioContext();
	if (!context) {
		throw new Error('Failed to initialize AudioContext');
	}

	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const arrayBuffer = await response.arrayBuffer();
		
		if (arrayBuffer.byteLength === 0) {
			throw new Error('Empty audio file');
		}
		
		const decodedData = await context.decodeAudioData(arrayBuffer);
		audioBuffer.set(decodedData);
		return decodedData;
	} catch (error) {
		throw error;
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

// Create and configure equalizer nodes
export function setupEqualizer(context: AudioContext) {
	if (!context) return null;

	// Create three filters for a basic 3-band equalizer

	// Low frequency band (shelf filter)
	const lowFilter = context.createBiquadFilter();
	lowFilter.type = 'lowshelf';
	lowFilter.frequency.value = 200; // Typical crossover between low and mid
	lowFilter.gain.value = 0; // Default to no gain adjustment

	// Mid frequency band (peaking filter)
	const midFilter = context.createBiquadFilter();
	midFilter.type = 'peaking';
	midFilter.frequency.value = 1000; // Center frequency of mid band
	midFilter.Q.value = 1; // Quality factor for peaking filter
	midFilter.gain.value = 0; // Default to no gain adjustment

	// High frequency band (shelf filter)
	const highFilter = context.createBiquadFilter();
	highFilter.type = 'highshelf';
	highFilter.frequency.value = 3200; // Typical crossover between mid and high
	highFilter.gain.value = 0; // Default to no gain adjustment

	// Store the filter nodes
	eqLowNode.set(lowFilter);
	eqMidNode.set(midFilter);
	eqHighNode.set(highFilter);

	return { lowFilter, midFilter, highFilter };
}
