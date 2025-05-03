<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { theme } from '$lib/theme';
	import { onMount } from 'svelte';
	import Knob from '$lib/components/utils/Knob.svelte';
	import { setVolume, getVolume } from '$lib/audio/index';

	// Local state for volume value (initialize to 100)
	let volume = 100;

	// Range limits
	const MIN_VALUE = 0;
	const MAX_VALUE = 135; // Extended to 135% for extra volume
	
	// Default value for snapping (100%)
	const DEFAULT_VALUE = 100;  // Will be passed as defaultValue to Knob
	
	// Custom snap settings for volume - stronger than defaults
	const SNAP_STRENGTH = 0.3;  // Stronger resistance (0-1)
	const SNAP_THRESHOLD = 3;   // Wider snap zone (in value units)

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		change: number;
	}>();

	// Handle knob value change
	function handleVolumeChange(value: number) {
		volume = value;
		// Map 0-135 range to 0-1.35 range for audio API
		setVolume(volume / 100); 
		dispatch('change', volume);
	}

	// Initialize when mounted
	onMount(() => {
		// Set initial volume to 100% before reading from audio system
		setVolume(1);

		// Try to get current volume from audio system
		try {
			const currentVol = getVolume();
			// Only update if we get a valid value (between 0-1.35)
			if (
				currentVol !== undefined &&
				currentVol !== null &&
				!isNaN(currentVol) &&
				currentVol >= 0 &&
				currentVol <= 1.35
			) {
				volume = Math.round(currentVol * 100); // Convert from 0-1.35 to 0-135 range
			} else {
				// Fallback to 100% if value is invalid
				volume = 100;
			}
		} catch (error) {
			// Fallback to 100% if there's an error
			volume = 100;
		}

		// Ensure volume is set correctly in the audio system
		setVolume(volume / 100);
	});
</script>

<div class="flex h-full w-full items-center justify-center">
	<Knob
		bind:value={volume}
		min={MIN_VALUE}
		max={MAX_VALUE}
		defaultValue={DEFAULT_VALUE}
		snapStrength={SNAP_STRENGTH}
		snapThreshold={SNAP_THRESHOLD}
		label="Volume"
		unit="%"
		showZeroIndicator={false}
		on:change={() => handleVolumeChange(volume)}
	/>
</div>
