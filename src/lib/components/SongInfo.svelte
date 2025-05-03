<script lang="ts">
  import { browser } from '$app/environment';
  import { playbackPosition, duration } from '$lib/audio/stores';
  import { getAudioDuration } from '$lib/audio/controls';
  import { formatTime } from '$lib/audio/utils';
  import { theme } from '$lib/theme';
  import { playlist } from '$lib/stores/playlist';
  import { onMount } from 'svelte';
  
  // Get active track title from playlist
  const activeTrackTitle = $derived($playlist.activeTrack?.title || "Untitled");
  
  // Component state
  let currentTime = $state(0);
  let totalDuration = $state(0);
  
  // Update duration periodically
  async function updateDuration() {
    try {
      // Get duration and handle Promise
      const duration = await getAudioDuration();
      
      // Update state if we got a valid duration
      if (duration && duration > 0) {
        totalDuration = duration;
        
        // Update current time based on position
        currentTime = totalDuration * $playbackPosition;
      }
    } catch (error) {
      console.error("Error getting audio duration:", error);
    }
  }
  
  // Update component when playback position changes
  $effect(() => {
    currentTime = totalDuration * $playbackPosition;
  });
  
  // Also track the duration from the store
  $effect(() => {
    if ($duration > 0) {
      totalDuration = $duration;
    }
  });
  
  onMount(() => {
    // Initial duration update
    updateDuration();
    
    // Setup an interval to force UI updates
    const interval = setInterval(() => {
      updateDuration();
      
      // Update time
      if (totalDuration > 0) {
        currentTime = totalDuration * $playbackPosition;
      }
    }, 250);
    
    // Clean up on component destruction
    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class="song-info h-full flex items-center" style="color: {theme.primary};">
  <div class="flex flex-col justify-center w-full items-center">
    <div class="song-name px-2 text-center">
      {activeTrackTitle}
    </div>
    
    <div class="time text-center">
      {formatTime(currentTime)} / {formatTime(totalDuration)}
    </div>
  </div>
</div>

<style>
  .song-info {
    width: 100%;
  }
  
  /* Base sizes for small/medium screens */
  .song-name {
    font-size: 0.8rem;
    font-weight: 500;
    max-width: 100%;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  
  .time {
    font-size: 0.7rem;
  }
  
  /* Smaller sizes for very small screens */
  @media (max-width: 960px) {
    .song-name {
      font-size: 0.7rem;
    }
    
    .time {
      font-size: 0.65rem;
    }
  }
  
  /* Larger sizes for big screens */
  @media (min-width: 1280px) {
    .song-name {
      font-size: 1.1rem;
      padding-bottom: 0.2rem;
    }
    
    .time {
      font-size: 0.9rem;
    }
  }
</style> 