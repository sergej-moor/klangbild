<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { isPlaying, playbackPosition, duration } from '$lib/audio/stores';
	import { togglePlayPause, getAudioDuration } from '$lib/audio/controls';
	import { formatTime } from '$lib/audio/utils';
	import { theme } from '$lib/theme';
	import { playlist } from '$lib/stores/playlist';
	import { loadAudio } from '$lib/audio/index';

	// Get active track title from playlist
	const activeTrackTitle = $derived($playlist.activeTrack?.title || 'Untitled');

	// Component state
	let currentTime = $state(0);
	let totalDuration = $state(0);

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

		// Calculate next index (with wraparound)
		const nextIndex = (currentIndex + 1) % $playlist.length;
		const nextTrack = $playlist[nextIndex];

		// Set the new active track and load it
		playlist.setActiveTrack(nextTrack.id);
		await loadAudio(nextTrack.path);
	}

	// Setup event listener for track completion
	function setupTrackEndListener() {
		// Find the audio element
		const audioElement = document.querySelector('audio');
		if (audioElement) {
			// Add ended event listener
			audioElement.addEventListener('ended', handleTrackEnd);
		}
	}

	// Handle when a track ends
	async function handleTrackEnd() {
		console.log('Track ended, playing next track');
		await goToNextTrack();
	}

	// Update duration periodically
	async function updateDuration() {
		try {
			// Get duration and handle Promise
			const duration = await getAudioDuration();

			// Update state if we got a valid duration
			if (duration && duration > 0) {
				totalDuration = duration;

				// Update current time based on position
				currentTime = totalDuration * $playbackPosition;
			}
		} catch (error) {
			console.error('Error getting audio duration:', error);
		}
	}

	// Watch for position near the end to handle tracks that might not fire 'ended' event
	$effect(() => {
		// If we're at or very near the end of the track (99.9%)
		if ($playbackPosition > 0.999 && $duration > 0 && $isPlaying) {
			console.log('Track nearing end, preparing to play next');
			// Small timeout to avoid interrupting any 'ended' event
			setTimeout(() => {
				// Double-check we're still at the end (in case user seeked back)
				if ($playbackPosition > 0.999) {
					goToNextTrack();
				}
			}, 500);
		}
	});

	// Update component when playback position changes
	$effect(() => {
		currentTime = totalDuration * $playbackPosition;
	});

	// Also track the duration from the store
	$effect(() => {
		if ($duration > 0) {
			totalDuration = $duration;
		}
	});

	onMount(() => {
		// Initial duration update
		updateDuration();

		// Setup an interval to force UI updates
		const interval = setInterval(() => {
			updateDuration();

			// Update time
			if (totalDuration > 0) {
				currentTime = totalDuration * $playbackPosition;
			}
		}, 250);

		// Set up the track end listener
		setupTrackEndListener();

		// Re-add the listener whenever audio sources might change
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'childList') {
					setupTrackEndListener();
				}
			}
		});

		// Watch for changes to the body that might include audio elements
		if (browser) {
			observer.observe(document.body, { childList: true, subtree: true });
		}

		// Clean up on component destruction
		return () => {
			clearInterval(interval);

			// Clean up the audio event listener
			if (browser) {
				const audioElement = document.querySelector('audio');
				if (audioElement) {
					audioElement.removeEventListener('ended', handleTrackEnd);
				}

				// Disconnect the observer
				observer.disconnect();
			}
		};
	});
</script>

<div class="song-controls flex h-full flex-col justify-center" style="color: {theme.primary};">
	<div class="song-name mb-3 truncate px-2 text-center">
		{activeTrackTitle}
	</div>

	<div class="time mb-4 text-center">
		{formatTime(currentTime)} / {formatTime(totalDuration)}
	</div>

	<div class="control-buttons flex items-center justify-center gap-4">
		<button
			class="nav-button"
			on:click={goToPreviousTrack}
			title="Previous track"
			style="border-color: {theme.primary};"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary} />
			</svg>
		</button>

		<button
			class="play-button"
			on:click={togglePlayPause}
			title={$isPlaying ? 'Pause' : 'Play'}
			style="border-color: {theme.primary};"
		>
			{#if $isPlaying}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect x="6" y="4" width="4" height="16" rx="1" fill={theme.primary} />
					<rect x="14" y="4" width="4" height="16" rx="1" fill={theme.primary} />
				</svg>
			{:else}
				<svg
					width="20"
					height="20"
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
			class="nav-button"
			on:click={goToNextTrack}
			title="Next track"
			style="border-color: {theme.primary};"
		>
			<svg
				width="14"
				height="14"
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
	</div>
</div>

<style>
	.song-name {
		font-size: 1rem;
		font-weight: 500;
	}

	.time {
		font-size: 0.85rem;
	}

	.control-buttons {
		margin: 0 auto;
	}

	.play-button {
		background: none;
		border: 1.5px solid;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		min-width: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: background 0.2s;
	}

	.nav-button {
		background: none;
		border: 1.5px solid;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		min-width: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: background 0.2s;
	}

	.play-button:hover,
	.nav-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.play-button:focus,
	.nav-button:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
	}
</style>
