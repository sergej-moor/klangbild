<script lang="ts">
  import { theme } from '$lib/theme';
  import { isPlaying } from '$lib/audio/stores';
</script>

<div class="cd-container h-full w-full flex items-center justify-center">
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24"
    class="w-full h-full rotating"
    style="animation-play-state: {$isPlaying ? 'running' : 'paused'}"
  >
    <g 
      fill="none" 
      stroke={theme.primary} 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="0.5"
    >
      <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10"/>
      <path d="M6.5 15.99a6.9 6.9 0 0 0 1.43 1.51m8.096-11c.569.44 1.067.972 1.474 1.573M14.5 12a2.5 2.5 0 1 0-5 0a2.5 2.5 0 0 0 5 0"/>
    </g>
  </svg>
</div>

<style>
  .cd-container {
    padding: 0.5rem;
  }
  
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .rotating {
    animation: rotate 3s linear infinite;
    transform-origin: center;
  }
</style> 