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
</script>

<div class="playlist" style="border-color: {theme.primary};">
  <h3>Playlist</h3>
  
  <UploadButton />
  
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
        <span class="track-duration">{formatTime(track.duration)}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .playlist {
    height: 100%; /* Fill container */
    overflow: auto; /* Enable scrolling */
    padding: 0.5rem;
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
    margin-top: 0.5rem;
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
</style> 