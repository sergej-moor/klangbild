<script lang="ts">
	import { browser } from '$app/environment';
	import { playbackPosition, duration, isLoading, loadingError } from '$lib/audio/stores';
	import { getAudioDuration } from '$lib/audio/controls';
	import { formatTime } from '$lib/audio/utils';
	import { theme } from '$lib/theme';
	import { playlist } from '$lib/stores/playlist';
	import { onMount } from 'svelte';

	// Get active track title from playlist or show loading state
	const activeTrackTitle = $derived(
		$isLoading 
			? 'Loading...' 
			: $playlist.activeTrack?.title || ($loadingError ? 'Error loading audio' : 'No audio loaded')
	);
	
	// Format title with repeats for continuous scrolling - 10 copies with space between
	const repeatedTitle = $derived(Array(10).fill(activeTrackTitle).join(' '));

	// Component state
	let currentTime = $state(0);
	let totalDuration = $state(0);
	let tickerSpeed = $state(25); // Animation duration in seconds
	let tickerContainer: HTMLDivElement;
	let tickerText: HTMLDivElement;
	let firstClone: HTMLDivElement;

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
			// Silent error handling
		}
	}

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

		// Clean up on component destruction
		return () => {
			clearInterval(interval);
		};
	});
</script>

<div class="flex h-full w-full flex-col">
	<!-- Top half for song title with theme.primary background -->
	<div class="flex h-1/2 w-full items-center justify-center" style="background-color: {theme.primary};">
		<!-- Title container with overflow hidden -->
		<div class="w-full overflow-hidden" style="color: {theme.background};">
			<!-- Using a double-ticker technique for seamless scrolling -->
			<div class="marquee">
				<div class="marquee-content">
					<!-- Original text -->
					<div class="font-medium text-[0.85rem] md:text-[1rem] lg:text-[1.1rem] xl:text-[1.25rem]">
						{repeatedTitle}
					</div>
					<!-- Duplicate for seamless loop -->
					<div class="font-medium text-[0.85rem] md:text-[1rem] lg:text-[1.1rem] xl:text-[1.25rem]">
						{repeatedTitle}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Bottom half for time - keeps original color -->
	<div class="flex h-1/2 w-full items-center justify-center" style="color: {theme.primary};">
		<div class="text-center text-[0.75rem] md:text-[0.85rem] lg:text-[0.95rem] xl:text-[1.1rem]">
			{#if $isLoading}
				Loading audio...
			{:else if totalDuration > 0}
				{formatTime(currentTime)} / {formatTime(totalDuration)}
			{:else if $loadingError}
				{$loadingError}
			{:else}
				0:00 / 0:00
			{/if}
		</div>
	</div>
</div>

<style>
	.marquee {
		width: 100%;
		overflow: hidden;
		position: relative;
	}

	.marquee-content {
		display: flex;
		white-space: nowrap;
		animation: marquee 25s linear infinite;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
