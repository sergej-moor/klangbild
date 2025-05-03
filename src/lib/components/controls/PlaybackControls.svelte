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

<div class="w-full h-full flex justify-center items-center" style="color: {theme.primary};">
  <div class="flex justify-center items-center gap-2 md:gap-4 lg:gap-5 mx-auto">
    <button 
      class="bg-transparent border-[1.5px] border-solid rounded-full w-[24px] h-[24px] min-w-[24px] md:w-[28px] md:h-[28px] md:min-w-[28px] lg:w-[38px] lg:h-[38px] lg:min-w-[38px] lg:border-[1.8px] flex items-center justify-center cursor-pointer p-0 transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)]" 
      on:click={goToPreviousTrack}
      title="Previous track"
      style="border-color: {theme.primary};"
    >
      <svg class="md:scale-100 lg:scale-125" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary}/>
      </svg>
    </button>
    
    <button 
      class="bg-transparent border-[1.5px] border-solid rounded-full w-[30px] h-[30px] min-w-[30px] md:w-[34px] md:h-[34px] md:min-w-[34px] lg:w-[46px] lg:h-[46px] lg:min-w-[46px] lg:border-[2px] flex items-center justify-center cursor-pointer p-0 transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)]" 
      on:click={togglePlayPause}
      title={$isPlaying ? "Pause" : "Play"}
      style="border-color: {theme.primary};"
    >
      {#if $isPlaying}
        <svg class="md:scale-100 lg:scale-125" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
        </svg>
      {:else}
        <svg class="md:scale-100 lg:scale-125" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z" fill={theme.primary}/>
        </svg>
      {/if}
    </button>
    
    <button 
      class="bg-transparent border-[1.5px] border-solid rounded-full w-[24px] h-[24px] min-w-[24px] md:w-[28px] md:h-[28px] md:min-w-[28px] lg:w-[38px] lg:h-[38px] lg:min-w-[38px] lg:border-[1.8px] flex items-center justify-center cursor-pointer p-0 transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,255,255,0.3)]" 
      on:click={goToNextTrack}
      title="Next track"
      style="border-color: {theme.primary};"
    >
      <svg class="md:scale-100 lg:scale-125" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary} transform="scale(-1,1) translate(-24,0)"/>
      </svg>
    </button>
  </div>
</div> 