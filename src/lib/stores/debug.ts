import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create a debug mode store with false as the default state
export const debugMode = writable(false);

// Set up a global keyboard listener to toggle debug mode
if (browser) {
	window.addEventListener('keydown', (event) => {
		// Toggle debug mode when 'o' key is pressed
		if (event.key.toLowerCase() === 'o') {
			debugMode.update((value) => !value);
			console.log('Debug mode toggled:', !debugMode);
		}
	});
}
