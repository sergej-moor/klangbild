<script lang="ts">
	import { theme } from '$lib/theme';
	import { createEventDispatcher } from 'svelte';

	// The current pitch adjustment in semitones
	export let semitones = 0;

	// Range of semitones (smaller range for finer control)
	const MIN_SEMITONES = -3;
	const MAX_SEMITONES = 3;

	// Create an array with all values from -3 to +3 in steps of 1
	const semitoneValues = [3, 2, 1, 0, -1, -2, -3];

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		change: number;
	}>();

	// Handle semitone button click
	function handleSemitoneChange(value: number) {
		semitones = value;
		dispatch('change', value);
	}

	// Format the display value
	function formatSemitone(value: number): string {
		if (value === 0) return '0';
		return value > 0 ? `+${value}` : `${value}`;
	}
</script>

<div class="pitch-controls">
	<div class="title">Pitch</div>

	<div class="buttons-container">
		{#each semitoneValues as value}
			<button
				class="semitone-button"
				class:active={value === semitones}
				on:click={() => handleSemitoneChange(value)}
				style="--btn-color: {theme.primary}; --text-color: {value === semitones
					? '#fff'
					: theme.primary};"
			>
				{formatSemitone(value)}
			</button>
		{/each}
	</div>

	<div class="value">{formatSemitone(semitones)}</div>
</div>

<style>
	.pitch-controls {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.3rem;
		overflow: hidden;
	}

	.title {
		font-size: 0.9rem;
		margin-bottom: 0.3rem;
		text-align: center;
	}

	.buttons-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		overflow-y: auto;
		max-height: 100%;
		width: 100%;
		flex: 1;
		padding: 0.15rem;
		scrollbar-width: thin;
	}

	.buttons-container::-webkit-scrollbar {
		width: 4px;
	}

	.buttons-container::-webkit-scrollbar-track {
		background: #33333320;
		border-radius: 2px;
	}

	.buttons-container::-webkit-scrollbar-thumb {
		background: #33333340;
		border-radius: 2px;
	}

	.semitone-button {
		width: 100%;
		padding: 2px 0;
		background: transparent;
		border: 1px solid var(--btn-color);
		color: var(--text-color);
		border-radius: 2px;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.semitone-button:hover {
		background: color-mix(in srgb, var(--btn-color) 20%, transparent);
	}

	.semitone-button.active {
		background: var(--btn-color);
		color: white;
		font-weight: bold;
	}

	.value {
		font-size: 0.8rem;
		text-align: center;
		margin-top: 0.3rem;
	}
</style>
