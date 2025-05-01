<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { waveform } from '$lib/audio/engine';
  import PlayPauseControls from './PlayPauseControls.svelte';
  import { browser } from '$app/environment';
  
  // Runes setup
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(500);
  let height = $state(200);
  
  // Styling parameters
  const lineColor = '#00ff00';
  const bgColor = '#111111';
  
  function drawWaveform(data: Float32Array) {
    if (!ctx) return;
    
    // Clear the canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw the waveform
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = lineColor;
    
    const sliceWidth = width / data.length;
    let x = 0;
    
    for (let i = 0; i < data.length; i++) {
      const y = (data[i] * height / 2) + (height / 2);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
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
        drawWaveform($waveform);
      });
    }
  }
  
  onMount(() => {
    if (!browser) return;
    
    ctx = canvas.getContext('2d')!;
    handleResize();
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    
    // Update canvas when waveform changes
    $effect(() => {
      drawWaveform($waveform);
    });
  });
  
  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('resize', handleResize);
  });
</script>

<div class="oscilloscope-container">
  <div class="canvas-wrapper">
    <canvas bind:this={canvas} width={width} height={height}></canvas>
  </div>
  

</div>

<style>
  .oscilloscope-container {
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
