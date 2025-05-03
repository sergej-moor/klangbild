<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { theme } from '$lib/theme';
  import { playlist } from '$lib/stores/playlist';
  import { loadAudio } from '$lib/audio/index';
  import UploadButton from '$lib/components/controls/UploadButton.svelte';
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

<div class="h-full flex flex-col p-0">
  <div class="flex-1 overflow-y-auto min-h-0">
    <ul class="list-none p-0 m-0">
      {#each tracks as track, index}
        <li 
          class="flex justify-between items-center py-[0.15rem] px-[0.25rem] my-[0.1rem] mx-0 cursor-pointer text-[0.8rem] min-w-0 transition-all duration-150 rounded-[2px] relative hover:opacity-90 md:py-[0.35rem] md:px-[0.5rem] md:my-[0.15rem]"
          class:active={activeTrackId === track.id}
          class:playing={activeTrackId === track.id && playing}
          on:click={() => handleTrackSelect(track, index)}
          style="
            color: {activeTrackId === track.id ? theme.background : theme.primary}; 
            background-color: {activeTrackId === track.id ? theme.primary : 'transparent'};
            --indicator-color: {theme.primary};
          "
        >
          <div class="flex items-center flex-1 min-w-0 mr-1">
            <span class="break-words overflow-wrap-anywhere flex-1 min-w-0 pr-2 md:text-[0.9rem]" title={track.title}>{track.title}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="opacity-70 text-[0.75rem] flex-shrink-0 min-w-[2.5rem] text-right md:text-[0.8rem]">{formatTime(track.duration)}</span>
            <button 
              class="opacity-70 bg-transparent border-none p-[0.1rem] w-4 h-4 md:w-[18px] md:h-[18px] cursor-pointer rounded-[2px] flex items-center justify-center transition-all duration-150 hover:opacity-100 hover:bg-white/10"
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
  
  <div class="flex-shrink-0 py-1 px-2 md:py-2 md:px-3 flex justify-between items-center border-t border-solid" style="color: {theme.primary}; border-color: {theme.primary};">
    <div class="flex items-baseline gap-2">
      <h3 class="m-0 text-[0.9rem] font-normal md:text-base">Playlist</h3>
      <span class="text-[0.75rem] opacity-60">{tracks.length} tracks</span>
    </div>
    
    <div class="flex gap-1">
      <!-- File upload icon button with tooltip -->
      <button 
        class="bg-transparent border-none text-inherit p-1 cursor-pointer rounded transition-colors duration-200 flex items-center justify-center hover:bg-white/10" 
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
        class="bg-transparent border-none text-inherit p-1 cursor-pointer rounded transition-colors duration-200 flex items-center justify-center hover:bg-white/10"
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
    <div class="hidden">
      <UploadButton />
    </div>
  </div>
</div>

<style>

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
</style> 