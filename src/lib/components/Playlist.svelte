<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { playlist } from '$lib/stores/playlist';
  import { loadAudio } from '$lib/audio/index';
  import UploadButton from './UploadButton.svelte';
  import { playbackPosition, isPlaying } from '$lib/audio/stores';
  import type { PlaylistTrack } from '$lib/audio/types';
  
  const dispatch = createEventDispatcher<{
    select: { track: PlaylistTrack, index: number }
  }>();
  
  // Use the store values - updated to runes syntax
  const tracks = $derived($playlist);
  const activeTrackId = $derived($playlist.activeTrackId);
  const playing = $derived($isPlaying);
  
  // Log the current active ID for debugging
  $effect(() => {
    console.log("Playlist component - activeTrackId:", activeTrackId);
  });
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  async function handleTrackSelect(track: PlaylistTrack, index: number) {
    console.log(`Selecting track: ${track.id} - ${track.title}`);
    playlist.setActiveTrack(track.id);
    
    // Load the selected audio file using the audio system
    await loadAudio(track.path);
    
    // Dispatch select event
    dispatch('select', { track, index });
  }
  
  // Add function to handle track deletion
  function handleDeleteTrack(event: Event, trackId: string) {
    // Stop event from bubbling to parent (which would select the track)
    event.stopPropagation();
    
    // If this is the active track, select another one first
    if (activeTrackId === trackId) {
      // Find the index of the current track
      const currentIndex = tracks.findIndex(t => t.id === trackId);
      
      // Try to select the next track, or the previous if at the end
      if (tracks.length > 1) {
        const nextIndex = currentIndex < tracks.length - 1 ? currentIndex + 1 : currentIndex - 1;
        const nextTrack = tracks[nextIndex];
        
        // Set the new active track and load it
        playlist.setActiveTrack(nextTrack.id);
        loadAudio(nextTrack.path);
      }
    }
    
    // Remove the track from the playlist
    playlist.removeTrack(trackId);
  }
  
  // Handle actions for Upload Single/Multiple Files
  function handleFilesUpload() {
    const fileInput = document.getElementById('playlist-file-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }
  
  // Handle actions for Upload Folder
  function handleFolderUpload() {
    const folderInput = document.getElementById('playlist-folder-input') as HTMLInputElement;
    if (folderInput) folderInput.click();
  }
</script>

<div class="playlist">
  <div class="playlist-content">
    <ul>
      {#each tracks as track, index}
        <li 
          class:active={activeTrackId === track.id}
          class:playing={activeTrackId === track.id && playing}
          on:click={() => handleTrackSelect(track, index)}
          style="
            color: {activeTrackId === track.id ? theme.background : theme.primary}; 
            background-color: {activeTrackId === track.id ? theme.primary : 'transparent'};
            --indicator-color: {theme.primary};
          "
        >
          <div class="track-info">
            <span class="track-title" title={track.title}>{track.title}</span>
          </div>
          <div class="track-actions">
            <span class="track-duration">{formatTime(track.duration)}</span>
            <button 
              class="delete-button" 
              on:click={(e) => handleDeleteTrack(e, track.id)}
              title="Remove from playlist"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
  
  <div class="playlist-header" style="color: {theme.primary}; border-color: {theme.primary};">
    <div class="playlist-title">
      <h3>Playlist</h3>
      <span class="track-count">{tracks.length} tracks</span>
    </div>
    
    <div class="playlist-actions">
      <!-- File upload icon button with tooltip -->
      <button 
        class="icon-button" 
        on:click={handleFilesUpload}
        title="Upload Audio Files"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      </button>
      
      <!-- Folder upload icon button with tooltip -->
      <button 
        class="icon-button" 
        on:click={handleFolderUpload}
        title="Upload Folder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          <path d="M12 11v6"></path>
          <path d="M9 14h6"></path>
        </svg>
      </button>
    </div>
    
    <!-- We'll reuse the UploadButton component but hide its UI -->
    <div style="display: none;">
      <UploadButton />
    </div>
  </div>
</div>

<style>
  .playlist {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  
  .playlist-header {
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid;
  }
  
  .playlist-title {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  
  .track-count {
    font-size: 0.75rem;
    opacity: 0.6;
  }
  
  .playlist-actions {
    display: flex;
    gap: 0.25rem;
  }
  
  .icon-button {
    background: transparent;
    border: none;
    color: inherit;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  
  .icon-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .playlist-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  
  h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: normal;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.15rem 0.25rem;
    margin: 0.1rem 0;
    cursor: pointer;
    font-size: 0.8rem;
    min-width: 0;
    transition: all 0.15s ease;
    border-radius: 2px;
    position: relative;
  }
  
  li:hover {
    opacity: 0.9;
  }
  
  li.active {
    position: relative;
  }
  
  li.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 2px;
    background-color: var(--indicator-color);
  }
  
  li.playing.active::before {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  .track-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    margin-right: 0.25rem;
  }
  
  .track-title {
    word-break: break-word;
    overflow-wrap: break-word;
    flex: 1;
    min-width: 0;
    padding-right: 0.5rem;
  }
  
  .track-duration {
    opacity: 0.7;
    font-size: 0.75rem;
    flex-shrink: 0;
    min-width: 2.5rem;
    text-align: right;
  }
  
  .track-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .delete-button {
    opacity: 0.7;
    background: none;
    border: none;
    padding: 0.1rem;
    width: 16px;
    height: 16px;
    cursor: pointer;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s, background-color 0.15s;
    color: inherit;
  }
  
  li:hover .delete-button {
    opacity: 1;
  }
  
  .delete-button:hover {
    opacity: 1 !important;
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Large screen styles - increase padding */
  @media (min-width: 768px) {
    .playlist-header {
      padding: 0.5rem 0.75rem;
    }
    
    li {
      padding: 0.35rem 0.5rem;
      margin: 0.15rem 0;
    }
    
    h3 {
      font-size: 1rem;
    }
    
    .track-title {
      font-size: 0.9rem;
    }
    
    .track-duration {
      font-size: 0.8rem;
    }
    
    .delete-button {
      width: 18px;
      height: 18px;
    }
  }
</style> 