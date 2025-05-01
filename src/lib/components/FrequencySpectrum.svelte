<script lang="ts">
  import { spectrum } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  import { visualizerTheme } from '$lib/theme';
  import { onMount } from 'svelte';
  
  // References to base component values - same structure as Oscilloscope
  let visualizer: VisualizerCanvas;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let isReady = $state(false);
  
  // Styling parameters
  const barColor = visualizerTheme.visualizations.spectrum;
  const barWidth = 2;
  const barGap = 1;
  
  function drawSpectrum(data: Uint8Array) {
    if (!visualizer?.isInitialized || !ctx) {
      return;
    }
    
    // Get latest context and dimensions
    ctx = visualizer.getContext();
    if (!ctx) return;
    
    try {
      const dims = visualizer.getDimensions();
      width = dims.width;
      height = dims.height;
      
      // Clear the canvas
      visualizer.clearCanvas();
      
      // Calculate the width of each bar to fit the canvas
      const numBars = Math.min(Math.floor(width / (barWidth + barGap)), data.length);
      const step = Math.floor(data.length / numBars);
      
      // Draw frequency bars
      ctx.fillStyle = barColor;
      
      for (let i = 0; i < numBars; i++) {
        const dataIndex = i * step;
        // Simple value calculation, similar to Oscilloscope approach
        const value = data[dataIndex] / 255.0; // Normalize to 0-1
        const barHeight = value * height;
        
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    } catch (error) {
      console.error('Error drawing spectrum:', error);
    }
  }
  
  // Only start effects after component is mounted
  onMount(() => {
    // Wait for initialization before setting up effect
    $effect(() => {
      if (isReady && ctx && $spectrum) {
        drawSpectrum($spectrum);
      }
    });
  });
  
  function handleReady(event: CustomEvent) {
    console.log('Frequency Spectrum ready event received');
    ctx = event.detail.ctx;
    const { width: w, height: h } = visualizer.getDimensions();
    width = w;
    height = h;
    isReady = true;
  }
  
  function handleResize() {
    if (isReady && $spectrum) {
      console.log('Frequency Spectrum resize triggered');
      drawSpectrum($spectrum);
    }
  }
</script>

<VisualizerCanvas 
  bind:this={visualizer} 
  on:ready={handleReady} 
  on:resize={handleResize}
  id="frequency-spectrum"
>
  <div class="text-sm opacity-70 text-center">Frequency Spectrum</div>
</VisualizerCanvas> 