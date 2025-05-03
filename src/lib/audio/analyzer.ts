// Analysis of audio data
import { get } from 'svelte/store';
import { audioContext, analyzerNode, fftSize } from './stores';
import { getAudioContext } from './core';

// Setup analyzer node with specified settings
export function setupAnalyzer(size = 8192) {
	const context = getAudioContext();
	if (!context) return null;

	const analyzer = context.createAnalyser();
	analyzer.fftSize = size;
	analyzer.smoothingTimeConstant = 0.8;
	analyzerNode.set(analyzer);
	fftSize.set(size);

	return analyzer;
}

// Get frequency data from analyzer
export function getFrequencyData() {
	const analyzer = get(analyzerNode);
	if (!analyzer) return new Uint8Array();

	const dataArray = new Uint8Array(analyzer.frequencyBinCount);
	analyzer.getByteFrequencyData(dataArray);
	return dataArray;
}

// Get waveform data from analyzer
export function getWaveformData() {
	const analyzer = get(analyzerNode);
	if (!analyzer) return new Float32Array();

	const dataArray = new Float32Array(analyzer.fftSize);
	analyzer.getFloatTimeDomainData(dataArray);
	return dataArray;
}

// Calculate RMS levels from time domain data
export function calculateRMSLevels() {
	const data = getWaveformData();
	if (!data || data.length === 0) return { left: 0, right: 0 };

	// Calculate left and right channels or mono
	let sumLeft = 0,
		sumRight = 0;

	for (let i = 0; i < data.length; i++) {
		const value = data[i];
		if (i % 2 === 0) {
			sumLeft += value * value;
		} else {
			sumRight += value * value;
		}
	}

	const rmsLeft = Math.sqrt(sumLeft / (data.length / 2));
	const rmsRight = Math.sqrt(sumRight / (data.length / 2));

	// Return object with left/right properties
	return { left: rmsLeft, right: rmsRight };
}
