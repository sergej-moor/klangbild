<script context="module" lang="ts">
	// Define interface for equalizer values
	export interface EqualizerValues {
		low: number;
		mid: number;
		high: number;
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { theme } from '$lib/theme';
	import { adjustEqualizer, eqSettings } from '$lib/audio/index';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Knob from '$lib/components/utils/Knob.svelte';

	// Local state for EQ values
	let low = $eqSettings.low;
	let mid = $eqSettings.mid;
	let high = $eqSettings.high;

	// Range limits
	const MIN_VALUE = -12;
	const MAX_VALUE = 12;
	
	// Get theme colors directly
	const titleBgColor = theme.primary;
	const titleTextColor = theme.background;

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		change: EqualizerValues;
	}>();

	// Handle knob value changes
	function handleLowChange(value: number) {
		low = value;
		adjustEqualizer('low', low);
		dispatch('change', { low, mid, high });
	}

	function handleMidChange(value: number) {
		mid = value;
		adjustEqualizer('mid', mid);
		dispatch('change', { low, mid, high });
	}

	function handleHighChange(value: number) {
		high = value;
		adjustEqualizer('high', high);
		dispatch('change', { low, mid, high });
	}

	// Initialize when mounted (browser-only)
	onMount(() => {
		// Initial sync with the store
		low = $eqSettings.low;
		mid = $eqSettings.mid;
		high = $eqSettings.high;
	});

	// Sync with store when it changes (but not when actively changing a knob)
	$: if (browser && $eqSettings) {
		// Only update if we're not actively interacting with knobs
		if (
			document.activeElement?.tagName !== 'DIV' ||
			!document.activeElement?.classList.contains('knob')
		) {
			low = $eqSettings.low;
			mid = $eqSettings.mid;
			high = $eqSettings.high;
		}
	}
</script>

<!-- Container that changes from column to row on xl screens -->
<div class="flex h-full w-full flex-col xl:flex-row">
	<!-- Equalizer controls (appears first in DOM but visually changes order on xl screens) -->
	<div class="flex flex-1 flex-col items-center justify-center order-first xl:order-last">
		<div class="knobs flex w-full justify-evenly px-2">
			<Knob
				bind:value={low}
				min={MIN_VALUE}
				max={MAX_VALUE}
				label="Low"
				on:change={() => handleLowChange(low)}
			/>

			<Knob
				bind:value={mid}
				min={MIN_VALUE}
				max={MAX_VALUE}
				label="Mid"
				on:change={() => handleMidChange(mid)}
			/>

			<Knob
				bind:value={high}
				min={MIN_VALUE}
				max={MAX_VALUE}
				label="High"
				on:change={() => handleHighChange(high)}
			/>
		</div>
	</div>
	
	<!-- Title - at bottom on small screens, left side on xl screens -->
	<div 
		class="equalizer-title w-full xl:w-auto xl:h-full md:flex items-center justify-center py-0.5  xl:px-1 xl:py-0
               text-center  order-last xl:order-first hidden "
		style="background-color: {titleBgColor}; color: {titleTextColor};"
	>
		<span class="xl:rotate-180 text-xs">EQ</span>
	</div>
</div>

<style>
	/* Responsive writing mode */
	@media (min-width: 1280px) {
		.equalizer-title {
			writing-mode: vertical-lr;
		}
		
		.equalizer-title span {
			transform: rotate(180deg);
		}
	}
	
	@media (max-width: 1279px) {
		.equalizer-title {
			writing-mode: horizontal-tb;
		}
	}
</style>
