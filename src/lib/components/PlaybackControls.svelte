<script lang="ts">
  import { isPlaying } from '$lib/audio/stores';
  import { togglePlayPause } from '$lib/audio/controls';
  import { theme } from '$lib/theme';
  import { playlist } from '$lib/stores/playlist';
  import { loadAudio } from '$lib/audio/index';
  
  // Track navigation functions
  async function goToPreviousTrack() {
    if (!$playlist.activeTrackId || $playlist.length <= 1) return;
    
    // Find current track index
    const currentIndex = $playlist.findIndex(track => track.id === $playlist.activeTrackId);
    if (currentIndex === -1) return;
    
    // Calculate previous index (with wraparound)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : $playlist.length - 1;
    const prevTrack = $playlist[prevIndex];
    
    // Set the new active track and load it
    playlist.setActiveTrack(prevTrack.id);
    await loadAudio(prevTrack.path);
  }
  
  async function goToNextTrack() {
    if (!$playlist.activeTrackId || $playlist.length <= 1) return;
    
    // Find current track index
    const currentIndex = $playlist.findIndex(track => track.id === $playlist.activeTrackId);
    if (currentIndex === -1) return;
    
    // Calculate next index (with wraparound)
    const nextIndex = (currentIndex + 1) % $playlist.length;
    const nextTrack = $playlist[nextIndex];
    
    // Set the new active track and load it
    playlist.setActiveTrack(nextTrack.id);
    await loadAudio(nextTrack.path);
  }
</script>

<div class="playback-controls h-full flex justify-center items-center" style="color: {theme.primary};">
  <div class="control-buttons flex justify-center items-center gap-2 md:gap-4 lg:gap-5">
    <button 
      class="nav-button" 
      on:click={goToPreviousTrack}
      title="Previous track"
      style="border-color: {theme.primary};"
    >
      <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary}/>
      </svg>
    </button>
    
    <button 
      class="play-button" 
      on:click={togglePlayPause}
      title={$isPlaying ? "Pause" : "Play"}
      style="border-color: {theme.primary};"
    >
      {#if $isPlaying}
        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
        </svg>
      {:else}
        <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z" fill={theme.primary}/>
        </svg>
      {/if}
    </button>
    
    <button 
      class="nav-button" 
      on:click={goToNextTrack}
      title="Next track"
      style="border-color: {theme.primary};"
    >
      <svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary} transform="scale(-1,1) translate(-24,0)"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .playback-controls {
    width: 100%;
  }
  
  .control-buttons {
    margin: 0 auto;
  }
  
  /* Base button sizes for medium screens */
  .play-button {
    background: none;
    border: 1.5px solid;
    border-radius: 50%;
    width: 34px;
    height: 34px;
    min-width: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  
  .nav-button {
    background: none;
    border: 1.5px solid;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    min-width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  
  .play-button:hover, .nav-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .play-button:focus, .nav-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
  }
  
  /* Smaller buttons for small screens */
  @media (max-width: 796px) {
    .play-button {
      width: 30px;
      height: 30px;
      min-width: 30px;
    }
    
    .nav-button {
      width: 24px;
      height: 24px;
      min-width: 24px;
    }
  }
  
  /* Larger buttons for large screens */
  @media (min-width: 1280px) {
    .play-button {
      width: 46px;
      height: 46px;
      min-width: 46px;
      border-width: 2px;
    }
    
    .nav-button {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-width: 1.8px;
    }
    
    .icon {
      transform: scale(1.3);
    }
  }
</style> 