<script lang="ts">
	import { playlist } from '$lib/stores/playlist';
	import { theme } from '$lib/theme';
	import type { PlaylistTrack } from '$lib/audio/types';
	import { loadAudio } from '$lib/audio/index';

	let uploading = false;
	let uploadingCount = 0;
	let totalFiles = 0;
	let fileInput: HTMLInputElement;
	let folderInput: HTMLInputElement;

	// Trigger the hidden file input for single/multiple files
	function openFileDialog() {
		fileInput.click();
	}

	// Trigger the hidden folder input
	function openFolderDialog() {
		folderInput.click();
	}

	// Process a single file and add it to the playlist
	async function processFile(file: File): Promise<string | null> {
		try {
			// Skip non-audio files
			if (!file.type.startsWith('audio/')) {
				console.log(`Skipping non-audio file: ${file.name}`);
				return null;
			}

			// Create a URL for the audio file
			const audioUrl = URL.createObjectURL(file);

			// Get audio duration
			const duration = await getAudioFileDuration(audioUrl);

			// Generate a unique ID
			const id = crypto.randomUUID();

			// Create track object
			const newTrack: PlaylistTrack = {
				id,
				title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
				path: audioUrl,
				duration
			};

			// Add track to playlist
			playlist.addTrack(newTrack);

			return id;
		} catch (error) {
			console.error(`Error processing file ${file.name}:`, error);
			return null;
		}
	}

	// Handle multiple file selection
	async function handleFilesSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		uploading = true;
		totalFiles = input.files.length;
		uploadingCount = 0;

		try {
			const files = Array.from(input.files);
			let firstTrackId: string | null = null;

			// Process all files
			for (const file of files) {
				uploadingCount++;
				const trackId = await processFile(file);

				// Remember the first successfully loaded track ID
				if (!firstTrackId && trackId) {
					firstTrackId = trackId;
				}
			}

			// Select the first track if any were loaded
			if (firstTrackId) {
				playlist.setActiveTrack(firstTrackId);
				// Load the first track into the audio system
				const activeTrack = $playlist.activeTrack;
				if (activeTrack) {
					await loadAudio(activeTrack.path);
				}
			}
		} catch (error) {
			console.error('Error processing audio files:', error);
		} finally {
			uploading = false;
			uploadingCount = 0;
			// Reset the file input
			input.value = '';
		}
	}

	// Helper function to get audio duration
	function getAudioFileDuration(url: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const audio = new Audio();
			audio.addEventListener('loadedmetadata', () => {
				resolve(audio.duration);
			});
			audio.addEventListener('error', () => {
				// If we can't get duration, use a default value
				resolve(180); // Default 3 minutes
			});
			audio.src = url;
		});
	}
</script>

<!-- Hidden UI elements that can be triggered from the parent component -->
<div class="w-full" style="border-color: {theme.primary};">
	<!-- Only show buttons when not being used by the Playlist component -->
	<slot name="buttons">
		<div class="flex gap-2">
			<button
				on:click={openFileDialog}
				disabled={uploading}
				class="flex-1 cursor-pointer rounded border border-current bg-transparent p-2 text-sm transition-colors duration-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
				style="color: {theme.primary}; border-color: {theme.primary};"
			>
				{#if uploading}
					Loading {uploadingCount}/{totalFiles}...
				{:else}
					Select Files
				{/if}
			</button>

			<button
				on:click={openFolderDialog}
				disabled={uploading}
				class="flex-1 cursor-pointer rounded border border-current bg-transparent p-2 text-sm transition-colors duration-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
				style="color: {theme.primary}; border-color: {theme.primary};"
			>
				{#if uploading}
					Loading...
				{:else}
					Select Folder
				{/if}
			</button>
		</div>
	</slot>

	<!-- Hidden input for file selection - with ID for external access -->
	<input
		bind:this={fileInput}
		id="playlist-file-input"
		type="file"
		accept="audio/*"
		multiple
		on:change={handleFilesSelect}
		style="display: none;"
	/>

	<!-- Hidden input for folder selection - with ID for external access -->
	<input
		bind:this={folderInput}
		id="playlist-folder-input"
		type="file"
		webkitdirectory
		on:change={handleFilesSelect}
		style="display: none;"
	/>
</div>
