<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAudio } from '$lib/audio/index';
	import { isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import { debugMode } from '$lib/stores/debug';
	import Oscilloscope from "$lib/components/visualizer/Oscilloscope.svelte";
	import FrequencySpectrum from "$lib/components/visualizer/FrequencySpectrum.svelte";
	import Spectrogram from "$lib/components/visualizer/Spectrogram.svelte";
	import Waveform from "$lib/components/visualizer/Waveform.svelte";

	import Playlist from '$lib/components/controls/Playlist.svelte';
	import SongInfo from '$lib/components/controls/SongInfo.svelte';
	import PlaybackControls from '$lib/components/controls/PlaybackControls.svelte';
	
	import RmsMeter from '$lib/components/visualizer/RMSMeter.svelte';
	import { playlist } from '$lib/stores/playlist';
	import Equalizer from '$lib/components/controls/Equalizer.svelte';

	import VolumeKnob from "$lib/components/controls/VolumeKnob.svelte";
	import { setVolume } from '$lib/audio/index';

	import Logo from "$lib/components/Logo.svelte";
	

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
<div class="fixed inset-0 text-white z-10 overflow-auto" style="background-color: {theme.background}; color: {theme.primary};">
  <!-- Main container - changes to column on small screens, row on medium & large -->
  <div class="flex flex-col md:flex-row h-full p-2 gap-2">
    
    <!-- Controls Grid - takes full width on small screens, 1/3 on medium & large -->
    <div class="w-full md:w-1/3 h-[45vh] md:h-full grid grid-cols-4 grid-rows-8 gap-1">
      <div class="col-span-3 row-span-2 md:row-span-1 border border-current overflow-hidden">
        <Equalizer on:change={handleEqChange} />
      </div>
      
      <div class="col-span-1 row-span-2 md:row-span-1 border border-current overflow-hidden">
        <VolumeKnob on:change={handleVolumeChange} />
      </div>
      
      <div class="col-span-3 row-span-1 row-start-3 md:row-start-2 border border-current overflow-hidden">
        <SongInfo />
      </div>
      
      <div class="col-span-3 row-span-1 row-start-4 md:row-span-1 md:row-start-3 border border-current overflow-hidden">
        <PlaybackControls />
      </div>
      
      <div class="col-span-3 row-span-4 md:row-span-5 col-start-1 row-start-5 md:row-start-4 border border-current overflow-auto">
        <Playlist />
      </div>
      
      <div class="row-span-6 md:row-span-7 col-start-4 row-start-3 md:row-start-2 border border-current overflow-hidden">
        <RmsMeter />
      </div>
    </div>
    
    <!-- Visuals Grid - takes full width on small screens, 2/3 on medium & large -->
    <div class="w-full md:w-2/3 h-[45vh] md:h-full grid grid-cols-8 grid-rows-9 md:grid-rows-8 gap-1">
      <!-- Oscilloscope -->
      <div class="col-span-3 md:col-span-2 row-span-3 md:row-span-5 col-start-1 row-start-1 border border-current overflow-hidden">
        <Oscilloscope orientation="vertical" />
      </div>
      
      <!-- Spectrogram -->
      <div class="col-span-5 row-span-3 col-start-4 md:col-start-3 row-start-1 border border-current overflow-hidden">
        <Spectrogram />
      </div>
      
      <!-- Logo - desktop/tablet only (hidden on small screens) -->
      <div class="hidden md:block col-span-1 row-span-3 col-start-8 row-start-1  overflow-hidden">
        <Logo vertical={true} />
      </div>
      
      <!-- Waveform -->
      <div class="col-span-8 md:col-span-6 row-span-2 col-start-1 md:col-start-3 row-start-4 border border-current overflow-hidden">
        <Waveform />
      </div>
      
      <!-- Frequency Spectrum -->
      <div class="col-span-8 row-span-3 col-start-1 row-start-6 border border-current overflow-hidden">
        <FrequencySpectrum />
      </div>
      
      <!-- Mobile Logo - only shown on small screens, below everything else -->
      <div class="md:hidden col-span-8 row-span-1 col-start-1 row-start-9 overflow-hidden">
        <Logo vertical={false} />
      </div>
    </div>
  </div>
</div>

<!-- Debug Indicator - always shows regardless of layout -->
{#if $debugMode}
    <div class="fixed bottom-2 right-2 bg-black/70 text-red-500 px-2 py-1 text-xs z-50">
        Debug Mode ON (Press 'O' to toggle)
    </div>
{/if}
