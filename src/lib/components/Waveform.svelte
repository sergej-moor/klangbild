<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { fullWaveform, loadAudio, playbackPosition, isPlaying, seekToPosition } from '$lib/audio/engine';
  import { theme, sizes } from '$lib/theme';
  
  // Props
  const { 
    compactMode = false 
  } = $props();
  
  // Canvas references and state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(compactMode ? 30 : sizes.defaultHeight); // Even smaller in compact mode
  let isReady = $state(false);
  let progress = $state(0); // Track progress locally
  
  // Animation frame ID for continuous updates
  let animationId: number;
  
  // Styling parameters for bars
  const bgColor = 'transparent'; // Keep transparent
  const waveformColor = theme.secondary; // Use secondary color for unplayed portion
  const progressColor = theme.primary; // Use primary color for played portion
  const barWidth = compactMode ? 1 : 2; // Thinner bars in compact mode
  const barGap = compactMode ? 0 : 1; // Smaller gap in compact mode
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      
      // In compact mode, use a much smaller fixed height
      if (compactMode) {
        height = 40; // Fixed small height for compact mode
      } else {
        height = Math.min(sizes.defaultHeight, container.clientWidth / 2);
      }
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Redraw if data is available
      if ($fullWaveform && $fullWaveform.length > 0) {
        drawWaveform($fullWaveform, progress);
      }
    }
  }
  
  // Clear the canvas
  function clearCanvas() {
    if (!ctx) return;
    
    // For transparent background, use clearRect instead of fillRect
    ctx.clearRect(0, 0, width, height);
  }
  
  // Setup continuous animation for progress updates
  function startProgressAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      if (isReady && ctx && $fullWaveform?.length > 0) {
        // Always get the latest progress directly from the store
        progress = $playbackPosition;
        drawWaveform($fullWaveform, progress);
      }
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle click on the waveform to seek
  function handleWaveformClick(event: MouseEvent) {
    if (!isReady || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the click position relative to the canvas
    const x = event.clientX - rect.left;
    
    // Convert to a position between 0 and 1
    const position = x / rect.width;
    
    // Seek to this position
    seekToPosition(position);
  }
  
  function drawWaveform(data: Float32Array, currentProgress: number) {
    if (!ctx || !canvas) return;
    
    // Clear the canvas
    clearCanvas();
    
    // Ensure we're using the entire data array
    if (!data || data.length === 0) return;
    
    // Calculate how many bars we can fit (use available width)
    const totalBarWidth = barWidth + barGap;
    const maxBars = Math.floor(width / totalBarWidth);
    
    // Calculate step size based on data length to ensure the entire waveform fits
    const step = data.length / maxBars;
    
    // Calculate the bar index at which the progress marker should appear
    const progressBarIndex = Math.floor(maxBars * currentProgress);
    
    // Calculate vertical scaling factor
    const verticalScale = height * (compactMode ? 0.6 : 0.4);
    
    // Draw the bars
    for (let i = 0; i < maxBars; i++) {
      // Get data index for this bar (ensuring we use the full data range)
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(Math.floor((i + 1) * step), data.length);
      
      // Find maximum amplitude in this segment
      let maxValue = 0;
      for (let j = startIdx; j < endIdx; j++) {
        maxValue = Math.max(maxValue, Math.abs(data[j]));
      }
      
      // Calculate bar height based on value
      const barHeight = Math.max(1, maxValue * verticalScale); // Ensure at least 1px height
      
      // Calculate position
      const x = i * totalBarWidth;
      const centerY = height / 2;
      
      // Set color based on playback progress
      if (i <= progressBarIndex) {
        ctx.fillStyle = progressColor;
      } else {
        ctx.fillStyle = waveformColor;
      }
      
      // Draw top bar (above center line)
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
      
      // Draw bottom bar (below center line, mirror of top)
      ctx.fillRect(x, centerY, barWidth, barHeight);
    }
  }
  
  // Lifecycle hooks
  onMount(async () => {
    if (!browser) return;
    
    // Initialize canvas context
    ctx = canvas.getContext('2d')!;
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Add click event listener to the canvas
    canvas.addEventListener('click', handleWaveformClick);
    
    // Mark as ready
    isReady = true;
    
    // Load audio if needed and start animation
    startProgressAnimation();
  });
  
  onDestroy(() => {
    if (!browser) return;
    
    // Clean up event listeners and animation
    window.removeEventListener('resize', handleResize);
    if (canvas) {
      canvas.removeEventListener('click', handleWaveformClick);
    }
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<div class="w-full h-full mx-auto flex flex-col {compactMode ? 'gap-0' : 'gap-2'}" id="full-waveform">
  <div class="w-full rounded-md overflow-hidden">
    <canvas bind:this={canvas} width={width} height={height} class="block w-full h-full"></canvas>
  </div>
  {#if !compactMode}
    <div class="text-sm opacity-70 text-center">
      ({Math.round(progress * 100)}%) 
    </div>
  {/if}
</div> 