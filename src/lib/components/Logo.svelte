<script lang="ts">
	import { browser } from '$app/environment';
	import { theme } from '$lib/theme';
	import { onMount } from 'svelte';

	// Props
	export let vertical = false; // Set to true for vertical orientation (90deg rotation)
</script>

{#if vertical}
	<!-- Vertical layout (for desktop sidebar) -->
	<div
		class="logo-container relative flex h-full w-full items-center justify-center overflow-hidden"
	>
		<h1 class="logo-text vertical" style="color: {theme.primary};">klangbild</h1>

		<a href="https://www.sergej-moor.com/" target="_blank" class="copyright copyright-vertical w-full" style="color: {theme.primary};">
			©2025 sergej
		</a>
	</div>
{:else}
	<!-- Horizontal layout with justify-between -->
	<div class="logo-container flex h-full w-full items-center justify-between overflow-hidden">
		<h1 class="logo-text" style="color: {theme.primary};">klangbild</h1>

		<a href="https://www.sergej-moor.com/" target="_blank" class="copyright-horizontal" style="color: {theme.primary};">©2025 sergej</a>
	</div>
{/if}

<style>
	.logo-text {
		font-weight: 900; /* Maximum boldness */
		font-size: 2rem;
		letter-spacing: -0.05em;

		transition: transform 0.3s ease;
	}

	.vertical {
		transform: rotate(90deg);
		white-space: nowrap;
		font-size: 3rem;
	}

	.copyright {
		font-size: 0.8rem;
		font-weight: 500;
		position: absolute;
	}

	.copyright-vertical {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.copyright-horizontal {
		font-size: 1rem;
		font-weight: 500;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.logo-text {
			font-size: 2rem;
		}

		.copyright,
		.copyright-horizontal {
			font-size: 0.75rem;
		}
	}
</style>
