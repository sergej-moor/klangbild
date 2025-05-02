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
</script>

<div class="playlist" style="border-color: {theme.primary};">
  <div class="playlist-header">
    <h3>Playlist</h3>
    <UploadButton />
  </div>
  
  <div class="playlist-content">
    <ul>
      {#each tracks as track, index}
        <li 
          class:active={activeTrackId === track.id}
          class:playing={activeTrackId === track.id && playing}
          style="border-left-color: {theme.primary};"
          on:click={() => handleTrackSelect(track, index)}
        >
          <div class="track-info">
            <span class="track-number">{index + 1}</span>
            <span class="track-title" title={track.title}>{track.title}</span>
          </div>
          <div class="track-actions">
            <span class="track-duration">{formatTime(track.duration)}</span>
            <button 
              class="delete-button" 
              on:click={(e) => handleDeleteTrack(e, track.id)}
              title="Remove from playlist"
              style="color: {theme.primary};"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </li>
      {/each}
    </ul>
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
    flex-shrink: 0; /* Prevent header from shrinking */
    padding: 0.5rem;
  }
  
  .playlist-content {
    flex: 1; /* Take remaining space */
    overflow-y: auto; /* Enable vertical scrolling */
    min-height: 0; /* Allow flexbox to constrain height */
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
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
    padding: 0.25rem;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 0; /* Allow flex items to shrink below content size */
  }
  
  li:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  li.active {
    background-color: rgba(255, 255, 255, 0.1);
    border-left: 3px solid; /* Color set by inline style */
    padding-left: calc(0.25rem - 3px); /* Adjust for the default padding */
  }
  
  li.playing {
    background-color: rgba(255, 255, 255, 0.15);
  }
  
  li.active .track-title {
    font-weight: bold;
  }
  
  .track-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0; /* Allow to shrink */
    margin-right: 0.5rem; /* Ensure space between title and duration */
  }
  
  .track-number {
    opacity: 0.5;
    width: 1.5rem;
    text-align: right;
    flex-shrink: 0; /* Prevent number from shrinking */
  }
  
  .track-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0; /* Allow text to be truncated */
  }
  
  .track-duration {
    opacity: 0.5;
    font-size: 0.9rem;
    flex-shrink: 0; /* Prevent duration from shrinking */
    min-width: 3rem; /* Ensure minimum width for time display */
    text-align: right;
  }
  
  .track-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .delete-button {
    opacity: 0;
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 50%;
    height: 20px;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s, background-color 0.2s;
  }
  
  li:hover .delete-button {
    opacity: 0.6;
  }
  
  .delete-button:hover {
    opacity: 1 !important;
    background-color: rgba(255, 255, 255, 0.1);
  }
</style> 