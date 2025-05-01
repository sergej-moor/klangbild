<script lang="ts">
  import { isPlaying, togglePlayPause } from '$lib/audio/engine';
  import { visualizerTheme } from '$lib/theme';
  
  // Get theme values for use in template
  const buttonBg = visualizerTheme.ui.buttonBackground;
  const buttonHover = visualizerTheme.ui.buttonHover;
  const buttonActive = visualizerTheme.ui.buttonActive;
  const buttonText = visualizerTheme.ui.buttonText;
</script>

<div class="flex justify-center mt-2">
  <button 
    class="bg-[{buttonBg}] hover:bg-[{buttonHover}] active:bg-[{buttonActive}] text-[{buttonText}] border-none rounded py-2 px-6 text-base cursor-pointer transition-colors duration-200"
    on:click={togglePlayPause}
  >
    {$isPlaying ? 'Pause' : 'Play'}
  </button>
</div> 