<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getFrequencyData } from '$lib/audio/analyzer';
	import { isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';

	// Minimal configuration
	const { 
		refreshRate = 200,     // Much slower refresh rate to minimize performance impact
		sampleCount = 20       // How many samples to display
	} = $props();

	// Array of values for display
	let dataValues = $state<string[]>([]);
	let interval: ReturnType<typeof setInterval>;
	let containerElement: HTMLDivElement;
	let maxRows = $state(10); // Default number of rows to display
	
	// Track screen width for responsive layout
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1200);
	
	// Check if we're on a small screen - changed to 820px
	let isSmallScreen = $derived(windowWidth < 820);

	// Calculate how many rows can fit in the container
	function updateMaxRows() {
		if (!containerElement) return;
		
		// Get container height and approximate row height
		// Row height is typically around 1.5x the font size (which is 0.75rem or 0.875rem)
		// We use a conservative estimate and add a bit of margin
		const containerHeight = containerElement.clientHeight;
		const approximateRowHeight = isSmallScreen ? 18 : 10; // Pixels
		
		// Calculate max rows that can fit (minus a small buffer)
		let calculatedRows = Math.max(1, Math.floor(containerHeight / approximateRowHeight) - 1);
		
		// Add additional rows at specific breakpoints
		if (windowWidth >= 1100) {
			calculatedRows += 2; // Add two more rows at 1100px+
		} else if (windowWidth >= 820 && windowWidth < 1100) {
			calculatedRows += 1; // Add one more row at 820px-1099px
		}
		
		maxRows = calculatedRows;
		
		// Update the data to fit the new max rows
		if (dataValues.length > 0) {
			updateData();
		}
	}

	// Update window width when resized
	onMount(() => {
		const handleResize = () => {
			windowWidth = window.innerWidth;
			updateMaxRows();
		};
		window.addEventListener('resize', handleResize);
		
		// Initial update of max rows
		setTimeout(updateMaxRows, 100);
		
		return () => window.removeEventListener('resize', handleResize);
	});

	// Simplified update function for frequency data only
	function updateData() {
		try {
			// Get frequency data
			const data = getFrequencyData();
			
			if (!data || data.length === 0) return;
			
			// Sample just a few points at scattered positions
			const values = [];
			
			// For frequency data, use only the first 85% of the data
			// since higher frequencies often have little to no energy
			const usableDataLength = Math.floor(data.length * 0.85);
			const skip = Math.max(1, Math.floor(usableDataLength / sampleCount));
			
			for (let i = 0; i < usableDataLength && values.length < sampleCount; i += skip) {
				values.push(Math.floor(data[i]).toString());
			}
			
			// Fill any remaining slots with the last real value if needed
			const lastValue = values[values.length - 1] || "0";
			while (values.length < sampleCount) {
				values.push(lastValue);
			}
			
			dataValues = values;
		} catch (err) {
			console.error('Error updating data display:', err);
		}
	}

	// Simplified interval management
	$effect(() => {
		clearInterval(interval);
		
		if ($isPlaying) {
			updateData();
			interval = setInterval(updateData, refreshRate);
		}
		// No else clause - we keep showing the last data when paused
	});

	// Clean up
	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<div class="flex h-full w-full flex-col overflow-hidden p-2 font-mono" bind:this={containerElement}>
	<div class="flex-1 overflow-hidden" style="color: {theme.primary};">
		<!-- Single column for small screens (limit to maxRows) -->
		{#if isSmallScreen}
			{#each dataValues.slice(0, maxRows) as value}
				<div>{value}</div>
			{/each}
		<!-- Two column layout for larger screens -->
		{:else}
			{#each Array(Math.min(Math.ceil(dataValues.length / 2), Math.floor(maxRows / 2))) as _, i}
				<div class="flex">
					<div class="w-1/2">{dataValues[i*2] || ''}</div>
					<div class="w-1/2">{dataValues[i*2+1] || ''}</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	/* Custom breakpoints for font size */
	.flex-1 {
		font-size: 0.75rem; /* xs by default */
	}
	
	/* Center align text for screens around 760px */
	@media (min-width: 700px) and (max-width: 820px) {
		.flex-1 div {
			text-align: center;
		}
	}
	
	@media (min-width: 1001px) and (max-width: 1200px) {
		.flex-1 {
			font-size: 0.75rem; /* xs */
		}
	}
	
	@media (min-width: 1201px) and (max-width: 1599px) {
		.flex-1 {
			font-size: 0.875rem; /* sm for large screens */
		}
	}
	
	@media (min-width: 1600px) {
		.flex-1 {
			font-size: 1rem; /* base size for extra large screens */
		}
	}
</style> 