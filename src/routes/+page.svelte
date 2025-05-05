<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAudio } from '$lib/audio/index';
	import { isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import { debugMode } from '$lib/stores/debug';
	import Oscilloscope from '$lib/components/visualizer/Oscilloscope.svelte';
	import FrequencySpectrum from '$lib/components/visualizer/FrequencySpectrum.svelte';
	import Spectrogram from '$lib/components/visualizer/Spectrogram.svelte';
	import Waveform from '$lib/components/visualizer/Waveform.svelte';

	import Playlist from '$lib/components/controls/Playlist.svelte';
	import SongInfo from '$lib/components/controls/SongInfo.svelte';
	import PlaybackControls from '$lib/components/controls/PlaybackControls.svelte';

	import RmsMeter from '$lib/components/visualizer/RMSMeter.svelte';
	import { playlist } from '$lib/stores/playlist';
	import Equalizer from '$lib/components/controls/Equalizer.svelte';

	import VolumeKnob from '$lib/components/controls/VolumeKnob.svelte';
	import { setVolume } from '$lib/audio/index';

	import Logo from '$lib/components/Logo.svelte';
	import RawDataDisplay from '$lib/components/visualizer/RawDataDisplay.svelte';
	import CdVisualizer from '$lib/components/visualizer/CDVisualizer.svelte';
	// Preload audio when the page loads
	onMount(async () => {
		console.log('Main page mounted, preloading audio...');

		// If we have tracks in the playlist, load the active one or first one
		if ($playlist.length > 0) {
			if (!$playlist.activeTrackId) {
				// If no active track yet, set the first one
				playlist.setActiveTrack($playlist[0].id);
			}

			// Get the active track and load it
			const activeTrack = $playlist.activeTrack;
			if (activeTrack) {
				await loadAudio(activeTrack.path);
			} else {
				// Fallback to demo file
				await loadAudio('/demo.wav');
			}
		} else {
			// Fallback to demo file if playlist is empty
			await loadAudio('/demo.wav');
		}

		console.log('Audio preloaded in main page');
	});

	// Set CSS variables for scrollbars when the component mounts
	onMount(() => {
		// Add data-interactive attribute to all interactive elements
		// This will help our custom cursor identify interactive elements
		const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, .slider, [role="button"]');
		interactiveElements.forEach((element) => {
			element.setAttribute('data-interactive', 'true');
		});

		// Set primary color for scrollbars (with 40% opacity for translucent version)
		document.documentElement.style.setProperty('--theme-primary', theme.primary);
		document.documentElement.style.setProperty('--theme-primary-translucent', theme.primary + '66'); // 66 is hex for 40% opacity
	});

	// Add debug mode indicator
	$effect(() => {
		if ($debugMode) {
			console.log('Debug mode: ON - Press O to toggle');
		} else {
			console.log('Debug mode: OFF - Press O to toggle');
		}
	});

	// Handle equalizer changes
	function handleEqChange(event: CustomEvent<{ low: number; mid: number; high: number }>) {
		const { low, mid, high } = event.detail;
		console.log('Equalizer settings changed:', { low, mid, high });
		// Here you would apply the EQ settings to your audio processing
	}

	// Handle volume change
	function handleVolumeChange(event: CustomEvent<number>) {
		const volume = event.detail;
		console.log('Volume changed:', volume);
		// Now actually apply the volume change
		setVolume(volume);
	}
</script>

<!-- Grid-Based Responsive Layout -->
<div
	class="fixed inset-0 z-10 overflow-auto text-white"
	style="background-color: {theme.background}; color: {theme.primary};"
>
	<!-- Main container - changes to column on small screens, row on medium & large -->
	<div class="flex h-full flex-col gap-2 p-2 md:flex-row">
		<!-- Controls Grid - takes full width on small screens, 1/3 on medium & large -->
		<div class="grid h-[45vh] w-full grid-cols-4 grid-rows-8 gap-1 md:h-full md:w-1/3">
			<div class="col-span-3 row-span-2 overflow-hidden border border-current md:row-span-1 hover:scale-[0.98] transition-transform duration-200">
				<Equalizer on:change={handleEqChange} />
			</div>

			<div class="col-span-1 row-span-2 overflow-hidden border border-current md:row-span-1 hover:scale-[0.98] transition-transform duration-200">
				<VolumeKnob on:change={handleVolumeChange} />
			</div>

			<div
				class="col-span-3 row-span-1 row-start-3 overflow-hidden border border-current md:row-start-2 hover:scale-[0.98] transition-transform duration-200"
			>
				<SongInfo />
			</div>

			<div
				class="col-span-3 row-span-1 row-start-4 overflow-hidden border border-current md:row-span-1 md:row-start-3 hover:scale-[0.98] transition-transform duration-200"
			>
				<PlaybackControls />
			</div>

			<div
				class="col-span-3 col-start-1 row-span-4 row-start-5 overflow-auto border border-current md:row-span-5 md:row-start-4 hover:scale-[0.98] transition-transform duration-200"
			>
				<Playlist />
			</div>

			<div
				class="col-start-4 row-span-6 row-start-3 overflow-hidden border border-current md:row-span-7 md:row-start-2 hover:scale-[0.98] transition-transform duration-200"
			>
				<RmsMeter />
			</div>
		</div>

		<!-- Visuals Grid - takes full width on small screens, 2/3 on medium & large -->
		<div
			class="grid h-[45vh] w-full grid-cols-8 grid-rows-9 gap-1 md:h-full md:w-2/3 md:grid-rows-8"
		>
			<!-- Oscilloscope -->
			<div
				class="col-span-3 col-start-1 row-span-3 row-start-1 overflow-hidden border border-current md:col-span-2 md:row-span-5 hover:scale-[0.98] transition-transform duration-200"
			>
				<Oscilloscope orientation="vertical" />
			</div>

			<!-- Spectrogram -->
			<div
				class="col-span-5 col-start-4 row-span-3 row-start-1 overflow-hidden border border-current md:col-start-3 hover:scale-[0.98] transition-transform duration-200"
			>
				<Spectrogram />
			</div>

			<!-- Logo - desktop/tablet only (hidden on small screens) -->
			<div class="col-span-1 col-start-8 row-span-3 row-start-1 hidden overflow-hidden md:block hover:scale-[0.98] transition-transform duration-200">
				<Logo vertical={true} />
			</div>

			<!-- Waveform -->
			<div
				class="col-span-8 col-start-1 row-span-2 row-start-4 overflow-hidden border border-current md:col-span-6 md:col-start-3 hover:scale-[0.98] transition-transform duration-200"
			>
				<Waveform />
			</div>

			<!-- Frequency Spectrum -->
			<div
				class="col-span-7 col-start-1 row-span-3 row-start-6 overflow-hidden border border-current hover:scale-[0.98] transition-transform duration-200"
			>
				<FrequencySpectrum />
			</div>

			<!-- Data Display -->
			<div
				class="col-span-1 col-start-8 row-span-2 row-start-6 overflow-hidden border border-current hover:scale-[0.98] transition-transform duration-200"
			>
				<RawDataDisplay  refreshRate={100} />
			</div>
      <div
      class="col-span-1 col-start-8 row-span-1 row-start-8 overflow-hidden hover:scale-[0.98] transition-transform duration-200"
    >
      <CdVisualizer />
    </div>

			<!-- Mobile Logo - only shown on small screens, below everything else -->
			<div class="col-span-8 col-start-1 row-span-1 row-start-9 overflow-hidden md:hidden hover:scale-[0.98] transition-transform duration-200">
				<Logo vertical={false} />
			</div>
		</div>
	</div>
</div>

<!-- Debug Indicator - always shows regardless of layout -->
{#if $debugMode}
	<div class="fixed right-2 bottom-2 z-50 bg-black/70 px-2 py-1 text-xs text-red-500">
		Debug Mode ON (Press 'O' to toggle)
	</div>
{/if}
