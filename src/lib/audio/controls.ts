// Playback controls
import { get } from 'svelte/store';
import {
	isPlaying,
	audioBuffer,
	audioSource,
	gainNode,
	analyzerNode,
	startTime,
	pauseTime,
	playbackPosition,
	eqLowNode,
	eqMidNode,
	eqHighNode,
	eqSettings,
	volume
} from './stores';
import { getAudioContext, setupEqualizer } from './core';
import { setupAnalyzer } from './analyzer';
import { startVisualizerUpdates, resetVisualizerData } from './visualizer';
import { browser } from '$app/environment';

// Event to dispatch when track ends
export const TRACK_ENDED_EVENT = 'klangbild:track-ended';

// Flag to indicate when we're seeking (to prevent automatic track progression)
let isSeeking = false;

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
		} catch {
			// Ignore errors if already stopped
		}
		audioSource.set(null);
	}

	// Create new source node
	const source = context.createBufferSource();
	source.buffer = buffer;
	
	// Add ended event handler to automatically play next track
	source.onended = () => {
		// Only trigger next track if playback actually completed (not manually stopped)
		// and we're not in the middle of a seek operation
		if (get(isPlaying) && !isSeeking) {
			// Dispatch a custom event that the PlaybackControls component can listen for
			if (browser) {
				window.dispatchEvent(new CustomEvent(TRACK_ENDED_EVENT));
			}
		}
		
		// Reset the seeking flag
		isSeeking = false;
	};

	// Create gain node if needed
	let gain = get(gainNode);
	if (!gain) {
		gain = context.createGain();
		gainNode.set(gain);
	}

	// Create equalizer nodes if needed
	let lowEq = get(eqLowNode);
	let midEq = get(eqMidNode);
	let highEq = get(eqHighNode);

	if (!lowEq || !midEq || !highEq) {
		const eq = setupEqualizer(context);
		if (eq) {
			({ lowFilter: lowEq, midFilter: midEq, highFilter: highEq } = eq);
		}
	}

	// Create analyzer if needed
	let analyzer = get(analyzerNode);
	if (!analyzer) {
		analyzer = setupAnalyzer();
	}

	// Connect audio graph with equalizers
	source.connect(gain);

	// Connect through equalizer chain if available
	if (lowEq && midEq && highEq) {
		gain.connect(lowEq);
		lowEq.connect(midEq);
		midEq.connect(highEq);

		if (analyzer) {
			highEq.connect(analyzer);
			analyzer.connect(context.destination);
		} else {
			highEq.connect(context.destination);
		}
	} else {
		// Fallback if no equalizer
		if (analyzer) {
			gain.connect(analyzer);
			analyzer.connect(context.destination);
		} else {
			gain.connect(context.destination);
		}
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
	
	// Set isPlaying to false
	isPlaying.set(false);
	
	// Clear all visualizer data stores to force a fresh empty state
	resetVisualizerData();
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
		// Set the seeking flag to prevent track ended event
		isSeeking = true;
		
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

// Add equalizer adjustment function
export function adjustEqualizer(band: 'low' | 'mid' | 'high', value: number) {
	// Clamp the value to the allowed range
	const gain = Math.max(-12, Math.min(12, value));

	// Update the equalizer settings store
	eqSettings.update((settings) => ({
		...settings,
		[band]: gain
	}));

	// Get the appropriate filter node
	let filterNode;
	switch (band) {
		case 'low':
			filterNode = get(eqLowNode);
			break;
		case 'mid':
			filterNode = get(eqMidNode);
			break;
		case 'high':
			filterNode = get(eqHighNode);
			break;
	}

	// Apply the gain value to the filter
	if (filterNode) {
		filterNode.gain.value = gain;
	}
}

// Set volume level (0-135)
export function setVolume(level: number) {
	// Ensure level is within bounds (now allowing up to 135%)
	const normalizedLevel = Math.max(0, Math.min(135, level));

	// Update the volume store
	volume.set(normalizedLevel);

	// Get the gain node and apply the volume
	const gain = get(gainNode);
	if (gain) {
		// Convert percentage (0-135) to gain (0-1.35)
		const gainValue = normalizedLevel / 100;
		gain.gain.value = gainValue;
	}

	return normalizedLevel;
}

// Get current volume level
export function getVolume() {
	return get(volume);
}

// Mute audio (set volume to 0 but remember previous level)
let previousVolume = 75;
export function toggleMute() {
	const currentVolume = get(volume);

	if (currentVolume > 0) {
		// If not muted, store current volume and mute
		previousVolume = currentVolume;
		setVolume(0);
		return true; // now muted
	} else {
		// If muted, restore previous volume
		setVolume(previousVolume);
		return false; // now unmuted
	}
}
