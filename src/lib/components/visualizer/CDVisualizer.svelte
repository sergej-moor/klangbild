<script lang="ts">
	import { theme } from '$lib/theme';
	import { isPlaying } from '$lib/audio/stores';
	import { onMount } from 'svelte';
	
	// State for responsive stroke width
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1000);
	let strokeWidth = $derived(windowWidth <= 900 ? 0.5 : 0.3);
	let containerPadding = $derived(windowWidth <= 1200 ? '0.1rem' : '0.5rem');
	
	// Update window width when resized
	onMount(() => {
		const handleResize = () => {
			windowWidth = window.innerWidth;
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<div 
	class="cd-container flex h-full w-full items-center justify-center"
	style="padding: {containerPadding};"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		class="rotating h-full w-full"
		style="animation-play-state: {$isPlaying ? 'running' : 'paused'}"
	>
		<g
			fill="none"
			stroke={theme.primary}
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width={strokeWidth}
		>
			<path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" />
			<path
				d="M6.5 15.99a6.9 6.9 0 0 0 1.43 1.51m8.096-11c.569.44 1.067.972 1.474 1.573M14.5 12a2.5 2.5 0 1 0-5 0a2.5 2.5 0 0 0 5 0"
			/>
		</g>
	</svg>
</div>

<style>
	.cd-container {
		/* Padding is now handled with inline style for responsiveness */
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.rotating {
		animation: rotate 3s linear infinite;
		transform-origin: center;
	}
</style>
