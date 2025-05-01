<script lang="ts">
  import { waveform } from '$lib/audio/engine';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  import { visualizerTheme } from '$lib/theme';
  import { onMount } from 'svelte';
  
  // References to base component values
  let visualizer: VisualizerCanvas;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let isReady = $state(false);
  
  // Styling parameters
  const lineColor = visualizerTheme.visualizations.waveform;
  
  function drawWaveform(data: Float32Array) {
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
      
      // Draw the waveform
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = lineColor;
      
      const sliceWidth = width / data.length;
      let x = 0;
      
      for (let i = 0; i < data.length; i++) {
        // Scale the waveform to be more visible
        const scaleFactor = 3;
        const y = (data[i] * scaleFactor * height / 2) + (height / 2);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    } catch (error) {
      console.error('Error drawing oscilloscope:', error);
    }
  }
  
  // Only start effects after component is mounted
  onMount(() => {
    // Wait for initialization before setting up effect
    $effect(() => {
      if (isReady && ctx && $waveform) {
        drawWaveform($waveform);
      }
    });
  });
  
  function handleReady(event: CustomEvent) {
    console.log('Oscilloscope ready event received');
    ctx = event.detail.ctx;
    const { width: w, height: h } = visualizer.getDimensions();
    width = w;
    height = h;
    isReady = true;
  }
  
  function handleResize() {
    if (isReady && $waveform) {
      console.log('Oscilloscope resize triggered');
      drawWaveform($waveform);
    }
  }
</script>

<VisualizerCanvas 
  bind:this={visualizer} 
  on:ready={handleReady} 
  on:resize={handleResize}
  id="oscilloscope"
>

</VisualizerCanvas>
