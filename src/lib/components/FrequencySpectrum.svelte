<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { spectrum } from '$lib/audio/engine';
  import { browser } from '$app/environment';
  
  // Runes setup
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(500);
  let height = $state(200);
  
  // Styling parameters
  const barColor = '#3498db';
  const bgColor = '#111111';
  const barWidth = 2;
  const barGap = 1;
  
  function drawSpectrum(data: Uint8Array) {
    if (!ctx) return;
    
    // Clear the canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate the width of each bar to fit the canvas
    const numBars = Math.min(width / (barWidth + barGap), data.length);
    const step = Math.floor(data.length / numBars);
    
    // Draw frequency bars
    ctx.fillStyle = barColor;
    
    for (let i = 0; i < numBars; i++) {
      const dataIndex = i * step;
      const value = data[dataIndex] / 255.0; // Normalize to 0-1
      const barHeight = value * height;
      
      const x = i * (barWidth + barGap);
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      height = Math.min(200, container.clientWidth / 2);
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Redraw if we have data
      $effect(() => {
        drawSpectrum($spectrum);
      });
    }
  }
  
  onMount(() => {
    if (!browser) return;
    
    ctx = canvas.getContext('2d')!;
    handleResize();
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    
    // Update canvas when spectrum changes
    $effect(() => {
      drawSpectrum($spectrum);
    });
  });
  
  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('resize', handleResize);
  });
</script>

<div class="spectrum-container">
  <div class="canvas-wrapper">
    <canvas bind:this={canvas} width={width} height={height}></canvas>
  </div>
</div>

<style>
  .spectrum-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .canvas-wrapper {
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  }
  
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background-color: #111111;
  }
</style> 