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
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
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
      console.error("Error processing audio files:", error);
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

<div class="upload-container" style="border-color: {theme.primary};">
  <div class="upload-buttons">
    <button 
      on:click={openFileDialog}
      disabled={uploading}
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
      style="color: {theme.primary}; border-color: {theme.primary};"
    >
      {#if uploading}
        Loading...
      {:else}
        Select Folder
      {/if}
    </button>
  </div>
  
  <!-- Hidden input for file selection -->
  <input 
    bind:this={fileInput}
    type="file" 
    accept="audio/*" 
    multiple
    on:change={handleFilesSelect}
    style="display: none;"
  />
  
  <!-- Hidden input for folder selection -->
  <input 
    bind:this={folderInput}
    type="file" 
    webkitdirectory
    directory
    on:change={handleFilesSelect}
    style="display: none;"
  />
</div>

<style>
  .upload-container {
    padding: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .upload-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    flex: 1;
    padding: 0.5rem;
    background-color: transparent;
    border: 1px solid;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  
  button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style> 