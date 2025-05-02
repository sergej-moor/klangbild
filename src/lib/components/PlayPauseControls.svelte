<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { isPlaying, playbackPosition, duration } from '$lib/audio/stores';
  import { togglePlayPause, seekToPosition, getAudioDuration } from '$lib/audio/controls';
  import { formatTime } from '$lib/audio/utils';
  import { theme } from '$lib/theme';
  import { playlist } from '$lib/stores/playlist';
  import { loadAudio } from '$lib/audio/index';
  
  // Props
  const { 
    songName = "Untitled"
  } = $props();
  
  // Get active track title from playlist with debugging
  $effect(() => {
    console.log("PlayPauseControls - Active Track:", $playlist.activeTrack);
  });
  
  const activeTrackTitle = $derived($playlist.activeTrack?.title || songName);
  
  // Additional reactive code for improved debugging
  $effect(() => {
    const activeTrack = $playlist.activeTrack;
    const activeId = $playlist.activeTrackId;
    
    console.log("PlayPauseControls - Song Info:", { 
      activeTrackId: activeId, 
      activeTrack: activeTrack,
      displayTitle: activeTrack?.title || songName 
    });
  });
  
  // Component state
  let sliderValue = $state(0);
  let currentTime = $state(0);
  let totalDuration = $state(0);
  let isDragging = $state(false);
  let audioElement: HTMLAudioElement | null = null;
  
  // Handle slider input
  function handleSeek(event: Event) {
    const newPosition = parseFloat((event.target as HTMLInputElement).value);
    sliderValue = newPosition;
    if (isDragging) {
      currentTime = newPosition * totalDuration;
    }
  }
  
  // Handle when slider is released
  function handleSeekComplete() {
    isDragging = false;
    
    // Always seek to the selected position
    seekToPosition(sliderValue);
  }
  
  // Handle when slider is pressed
  function handleSeekStart() {
    isDragging = true;
  }
  
  // Create a derived value for progress width to ensure reactivity
  const progressWidth = $derived(`${sliderValue * 100}%`);
  
  // Update component when playback position changes
  $effect(() => {
    if (!isDragging) {
      sliderValue = $playbackPosition;
      currentTime = totalDuration * $playbackPosition;
    }
  });
  
  // Update duration periodically
  async function updateDuration() {
    try {
      // Get duration and handle Promise
      const duration = await getAudioDuration();
      
      // Update state if we got a valid duration
      if (duration && duration > 0) {
        totalDuration = duration;
        
        // Update current time based on position
        if (!isDragging) {
          currentTime = totalDuration * $playbackPosition;
        }
      }
    } catch (error) {
      console.error("Error getting audio duration:", error);
    }
  }
  
  // Function to get an audio element directly
  function getAudioElementDuration() {
    // Try to get the audio element
    const audio = document.querySelector('audio');
    if (audio && !isNaN(audio.duration) && audio.duration > 0) {
      totalDuration = audio.duration;
      return true;
    }
    return false;
  }
  
  // Also track the duration from the store
  $effect(() => {
    if ($duration > 0) {
      totalDuration = $duration;
    }
  });
  
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
  
  onMount(() => {
    // Initial duration update
    updateDuration();
    
    // Also try to get duration directly from audio element as a fallback
    getAudioElementDuration();
    
    // Setup an interval to force UI updates
    const interval = setInterval(() => {
      // Try to get duration from the audio element first (most reliable)
      if (!getAudioElementDuration()) {
        // Fall back to the engine function if that fails
        updateDuration();
      }
      
      // Update position and time
      if ($isPlaying && !isDragging && totalDuration > 0) {
        sliderValue = $playbackPosition;
        currentTime = totalDuration * $playbackPosition;
      }
    }, 250);
    
    // Clean up on component destruction
    return () => clearInterval(interval);
  });
</script>

<div class="player-controls" style="border-color: {theme.primary}; border: 1px solid;">
  <div class="control-buttons">
    <button 
      class="nav-button prev-button" 
      on:click={goToPreviousTrack}
      title="Previous track"
      style="border-color: {theme.primary};"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary}/>
      </svg>
    </button>
    
    <button 
      class="play-button" 
      on:click={togglePlayPause}
      title={$isPlaying ? "Pause" : "Play"}
    >
      {#if $isPlaying}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill={theme.primary}/>
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5.14V19.14C8 19.94 8.92 20.42 9.58 19.98L20.29 12.99C20.89 12.59 20.89 11.69 20.29 11.29L9.58 4.3C8.92 3.86 8 4.34 8 5.14Z" fill={theme.primary}/>
        </svg>
      {/if}
    </button>
    
    <button 
      class="nav-button next-button" 
      on:click={goToNextTrack}
      title="Next track"
      style="border-color: {theme.primary};"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" fill={theme.primary} transform="scale(-1,1) translate(-24,0)"/>
      </svg>
    </button>
  </div>
  
  <div class="time" style="color: {theme.primary};">
    {formatTime(currentTime)} / {formatTime(totalDuration)}
  </div>
  
  <div class="progress-container">
    <input
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={sliderValue}
      class="progress-slider"
      on:input={handleSeek}
      on:mousedown={handleSeekStart}
      on:mouseup={handleSeekComplete}
      on:touchstart={handleSeekStart}
      on:touchend={handleSeekComplete}
    />
    <div class="progress-bar" style="background-color: rgba(255, 255, 255, 0.2);">
      <div 
        class="progress-fill" 
        style="width: {progressWidth}; background-color: {theme.primary};"
      ></div>
    </div>
  </div>
  
  <div class="song-name" style="color: {theme.primary};">
    {activeTrackTitle}
  </div>
</div>

<style>
  .player-controls {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    color: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  
  .control-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .time {
    font-size: 12px;
    white-space: nowrap;
    min-width: 90px;
  }
  
  .song-name {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  
  .progress-container {
    flex: 1;
    position: relative;
    height: 16px;
    display: flex;
    align-items: center;
  }
  
  .progress-slider {
    position: absolute;
    width: 100%;
    height: 16px;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
    margin: 0;
  }
  
  .progress-bar {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  
  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 2px;
    transition: width 0.1s;
  }
  
  .play-button {
    background: none;
    border: 1px solid;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    min-width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  
  .nav-button {
    background: none;
    border: 1px solid;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    min-width: 24px;
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
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
  }
</style> 