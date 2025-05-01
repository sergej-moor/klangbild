<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { isPlaying, togglePlayPause, playbackPosition, seekToPosition, getAudioDuration } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
  
  // Props
  const { 
    compact = false,
    songName = "Untitled"
  } = $props();
  
  // Component state
  let sliderValue = $state(0);
  let currentTime = $state(0);
  let duration = $state(0);
  let isDragging = $state(false);
  let audioElement: HTMLAudioElement | null = null;
  
  // Format time as MM:SS
  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Handle slider input
  function handleSeek(event: Event) {
    const newPosition = parseFloat((event.target as HTMLInputElement).value);
    sliderValue = newPosition;
    if (isDragging) {
      currentTime = newPosition * duration;
    }
  }
  
  // Handle when slider is released
  function handleSeekComplete() {
    isDragging = false;
    seekToPosition(sliderValue);
  }
  
  // Handle when slider is pressed
  function handleSeekStart() {
    isDragging = true;
  }
  
  // Find the audio element - look for various possible selectors
  function findAudioElement(): HTMLAudioElement | null {
    if (!browser) return null;
    
    // Try different possible selectors for the audio element
    const selectors = [
      'audio',                // Standard tag
      '#audio-player',        // Common ID
      '.audio-player',        // Common class
      '[data-audio-player]'   // Data attribute
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLAudioElement;
      if (element) return element;
    }
    
    return null;
  }
  
  // Create a derived value for progress width to ensure reactivity
  const progressWidth = $derived(`${sliderValue * 100}%`);
  
  // Update component when playback position changes
  $effect(() => {
    if (!isDragging) {
      sliderValue = $playbackPosition;
      currentTime = duration * $playbackPosition;
    }
  });
  
  onMount(() => {
    // Find the audio element
    audioElement = findAudioElement();
    
    // Get audio duration
    duration = getAudioDuration();
    console.log("Track duration loaded:", duration);
    
    // Setup an interval to force UI updates (failsafe)
    const interval = setInterval(() => {
      if ($isPlaying && !isDragging) {
        sliderValue = $playbackPosition;
        currentTime = duration * $playbackPosition;
      }
      
      // Check for audio element again if we don't have it
      if (!audioElement) {
        audioElement = findAudioElement();
      }
    }, 250);
    
    return () => clearInterval(interval);
  });
</script>

<div class="player-controls" class:compact>
  {#if compact}
    <div class="compact-progress">
      <button 
        class="play-button" 
        on:click={togglePlayPause}
        aria-label={$isPlaying ? "Pause" : "Play"}
        style="border-color: {theme.primary}; color: {theme.primary};"
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
      
      <div class="time" style="color: {theme.primary};">
        {formatTime(currentTime)} / {formatTime(duration)}
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
        <div class="progress-bar" style="background-color: {theme.background};">
          <div 
            class="progress-fill" 
            style="width: {progressWidth}; background-color: {theme.primary};"
          ></div>
        </div>
      </div>
      
      <div class="song-name" style="color: {theme.primary};">
        {songName}
      </div>
    </div>
  {:else}
    <!-- Full layout code here -->
  {/if}
</div>

<style>
  .player-controls {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 2px;
    color: #ffffff;
    font-size: 10px;
    overflow: hidden;
  }
  
  .player-controls.compact {
    flex-direction: row;
    align-items: center;
    padding: 2px 0;
    gap: 4px;
    height: 24px;
  }
  
  .compact-progress {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 4px;
    height: 100%;
    overflow: hidden;
  }
  
  .time {
    font-size: 9px;
    white-space: nowrap;
    min-width: 70px;
  }
  
  .song-name {
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
  }
  
  .progress-container {
    flex: 1;
    position: relative;
    height: 12px;
    display: flex;
    align-items: center;
  }
  
  .progress-slider {
    position: absolute;
    width: 100%;
    height: 12px;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
    margin: 0;
  }
  
  .progress-bar {
    width: 100%;
    height: 3px;
    border-radius: 1px;
    overflow: hidden;
    position: relative;
  }
  
  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 1px;
    transition: width 0.1s;
  }
  
  .play-button {
    background: none;
    border: 1px solid;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    min-width: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  
  .compact .play-button {
    width: 20px;
    height: 20px;
    min-width: 20px;
  }
  
  .play-button:hover {
    background-color: rgba(0, 255, 255, 0.1);
  }
  
  .play-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.5);
  }
</style> 