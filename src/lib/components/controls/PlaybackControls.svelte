<script lang="ts">
	import { isPlaying } from '$lib/audio/stores';
	import { togglePlayPause, TRACK_ENDED_EVENT } from '$lib/audio/controls';
	import { theme } from '$lib/theme';
	import { playlist } from '$lib/stores/playlist';
	import { loadAudio } from '$lib/audio/index';
	import { onMount, onDestroy } from 'svelte';

	// Track navigation functions
	async function goToPreviousTrack() {
		if (!$playlist.activeTrackId || $playlist.length <= 1) return;

		// Find current track index
		const currentIndex = $playlist.findIndex((track) => track.id === $playlist.activeTrackId);
		if (currentIndex === -1) return;

		// Calculate previous index (with wraparound)
		const prevIndex = currentIndex > 0 ? currentIndex - 1 : $playlist.length - 1;
		const prevTrack = $playlist[prevIndex];

		// Set the new active track and load it
		playlist.setActiveTrack(prevTrack.id);
		await loadAudio(prevTrack.path);
	}

	async function goToNextTrack() {
		if (!$playlist.activeTrackId || $playlist.length <= 1) return;

		// Find current track index
		const currentIndex = $playlist.findIndex((track) => track.id === $playlist.activeTrackId);
		if (currentIndex === -1) return;

		// If shuffle mode is enabled, choose a random track (excluding current)
		if ($playlist.isShuffleMode) {
			let nextIndex;
			if ($playlist.length > 2) {
				// If we have more than 2 tracks, ensure we don't pick the current one
				do {
					nextIndex = Math.floor(Math.random() * $playlist.length);
				} while (nextIndex === currentIndex);
			} else {
				// With only 2 tracks, just pick the other one
				nextIndex = (currentIndex + 1) % $playlist.length;
			}
			const nextTrack = $playlist[nextIndex];
			playlist.setActiveTrack(nextTrack.id);
			await loadAudio(nextTrack.path);
			return;
		}

		// Normal sequential mode
		const nextIndex = (currentIndex + 1) % $playlist.length;
		const nextTrack = $playlist[nextIndex];

		// Set the new active track and load it
		playlist.setActiveTrack(nextTrack.id);
		await loadAudio(nextTrack.path);
	}
	
	// Toggle repeat mode
	function toggleRepeatMode() {
		playlist.toggleRepeatMode();
	}
	
	// Toggle shuffle mode
	function toggleShuffleMode() {
		playlist.toggleShuffleMode();
	}
	
	// Handle automatic track progression
	const handleTrackEnded = () => {
		console.log('Track ended, handling based on modes');
		
		// If repeat mode is enabled, reload the current track
		if ($playlist.isRepeatMode) {
			if ($playlist.activeTrack) {
				loadAudio($playlist.activeTrack.path);
			}
			return;
		}
		
		// Otherwise go to next track (with shuffle if enabled)
		goToNextTrack();
	};
	
	onMount(() => {
		// Add event listener for track ended
		window.addEventListener(TRACK_ENDED_EVENT, handleTrackEnded);
	});
	
	onDestroy(() => {
		// Clean up event listener
		window.removeEventListener(TRACK_ENDED_EVENT, handleTrackEnded);
	});
</script>

<div class="flex h-full w-full items-center justify-center" style="color: {theme.primary};">
	<div class="mx-auto flex items-center justify-center gap-2 md:gap-4 lg:gap-5">
		<!-- Repeat mode button -->
		<button
			class="flex h-[24px] w-[24px] min-w-[24px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-solid bg-transparent p-0 transition-colors duration-200 hover:bg-white/10 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)] focus:outline-none md:h-[28px] md:w-[28px] md:min-w-[28px] lg:h-[38px] lg:w-[38px] lg:min-w-[38px] lg:border-[1.8px]"
			on:click={toggleRepeatMode}
			title="Repeat track"
			style="border-color: {theme.primary}; background-color: {$playlist.isRepeatMode ? theme.primary + '33' : 'transparent'};"
		>
			<svg
				class="md:scale-100 lg:scale-125"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path 
					d="M17 17H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2zm2-6H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" 
					fill={theme.primary} 
				/>
			</svg>
		</button>

		<button
			class="flex h-[24px] w-[24px] min-w-[24px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-solid bg-transparent p-0 transition-colors duration-200 hover:bg-white/10 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)] focus:outline-none md:h-[28px] md:w-[28px] md:min-w-[28px] lg:h-[38px] lg:w-[38px] lg:min-w-[38px] lg:border-[1.8px]"
			on:click={goToPreviousTrack}
			title="Previous track"
			style="border-color: {theme.primary};"
		>
			<svg
				class="md:scale-100 lg:scale-125"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary} />
			</svg>
		</button>

		<button
			class="flex h-[30px] w-[30px] min-w-[30px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-solid bg-transparent p-0 transition-colors duration-200 hover:bg-white/10 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)] focus:outline-none md:h-[34px] md:w-[34px] md:min-w-[34px] lg:h-[46px] lg:w-[46px] lg:min-w-[46px] lg:border-[2px]"
			on:click={togglePlayPause}
			title={$isPlaying ? 'Pause' : 'Play'}
			style="border-color: {theme.primary};"
		>
			{#if $isPlaying}
				<svg
					class="md:scale-100 lg:scale-125"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect x="6" y="4" width="4" height="16" rx="1" fill={theme.primary} />
					<rect x="14" y="4" width="4" height="16" rx="1" fill={theme.primary} />
				</svg>
			{:else}
				<svg
					class="md:scale-100 lg:scale-125"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z"
						fill={theme.primary}
					/>
				</svg>
			{/if}
		</button>

		<button
			class="flex h-[24px] w-[24px] min-w-[24px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-solid bg-transparent p-0 transition-colors duration-200 hover:bg-white/10 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)] focus:outline-none md:h-[28px] md:w-[28px] md:min-w-[28px] lg:h-[38px] lg:w-[38px] lg:min-w-[38px] lg:border-[1.8px]"
			on:click={goToNextTrack}
			title="Next track"
			style="border-color: {theme.primary};"
		>
			<svg
				class="md:scale-100 lg:scale-125"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"
					fill={theme.primary}
					transform="scale(-1,1) translate(-24,0)"
				/>
			</svg>
		</button>

		<!-- Shuffle mode button -->
		<button
			class="flex h-[24px] w-[24px] min-w-[24px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-solid bg-transparent p-0 transition-colors duration-200 hover:bg-white/10 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)] focus:outline-none md:h-[28px] md:w-[28px] md:min-w-[28px] lg:h-[38px] lg:w-[38px] lg:min-w-[38px] lg:border-[1.8px]"
			on:click={toggleShuffleMode}
			title="Shuffle playlist"
			style="border-color: {theme.primary}; background-color: {$playlist.isShuffleMode ? theme.primary + '33' : 'transparent'};"
		>
			<svg
				class="md:scale-100 lg:scale-125"
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path 
					d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" 
					fill={theme.primary} 
				/>
			</svg>
		</button>
	</div>
</div>
