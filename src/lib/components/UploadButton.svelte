<script lang="ts">
  import { playlist } from '$lib/stores/playlist';
  import { theme } from '$lib/theme';
  import type { PlaylistTrack } from '$lib/audio/types';
  import { loadAudio, getAudioDuration } from '$lib/audio/index';
  
  let uploading = false;
  let fileInput: HTMLInputElement;
  
  // Trigger the hidden file input
  function openFileDialog() {
    fileInput.click();
  }
  
  // Handle file selection
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    uploading = true;
    
    try {
      const file = input.files[0];
      
      // Create a URL for the audio file
      const audioUrl = URL.createObjectURL(file);
      
      // Generate a unique ID
      const id = crypto.randomUUID();
      
      // First, create a temporary audio element to get duration
      const duration = await getAudioFileDuration(audioUrl);
      
      // Create track object
      const newTrack: PlaylistTrack = {
        id,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        path: audioUrl,
        duration
      };
      
      // Add track to playlist
      playlist.addTrack(newTrack);
      
      // Select the newly added track - this will load the audio
      playlist.setActiveTrack(id);
      
      // Load the audio file into the system
      await loadAudio(audioUrl);
    } catch (error) {
      console.error("Error processing audio file:", error);
    } finally {
      uploading = false;
      // Reset the file input
      input.value = '';
    }
  }
  
  // Helper function to get audio duration (renamed to avoid conflict)
  function getAudioFileDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', reject);
      audio.src = url;
    });
  }
</script>

<div class="upload-container" style="border-color: {theme.primary};">
  <button 
    on:click={openFileDialog}
    disabled={uploading}
    style="color: {theme.primary}; border-color: {theme.primary};"
  >
    {#if uploading}
      Loading...
    {:else}
      Upload Audio
    {/if}
  </button>
  
  <input 
    bind:this={fileInput}
    type="file" 
    accept="audio/*" 
    on:change={handleFileSelect}
    style="display: none;"
  />
</div>

<style>
  .upload-container {
    padding: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  button {
    width: 100%;
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