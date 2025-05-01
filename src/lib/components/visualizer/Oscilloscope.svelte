<script lang="ts">
  import { waveform } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
  import BaseVisualizer from './BaseVisualizer.svelte';
  
  // Props
  const { 
    fullHeight = false,
    debug = false
  } = $props();
  
  // References to canvas context
  let ctx: CanvasRenderingContext2D;
  let width = 0;
  let height = 0;
  let scale = 1;
  
  // Theme colors
  const lineColor = theme.primary;
  const lineWidth = 1;
  
  // Handle ready event from BaseVisualizer
  function handleReady(event) {
    ({ ctx, width, height, scale } = event.detail);
  }
  
  // Handle resize event from BaseVisualizer
  function handleResize(event) {
    ({ width, height, scale } = event.detail);
  }
  
  // Draw the oscilloscope waveform - this will be called by BaseVisualizer
  function drawOscilloscope() {
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get the current waveform data
    let waveformData = $waveform;
    if (!waveformData || waveformData.length === 0) {
      return;
    }
    
    // Downsample the waveform data to simulate a smaller FFT size (1024)
    // This makes the oscilloscope more responsive and focused
    const targetSize = 1024;
    if (waveformData.length > targetSize) {
      const downsampled = new Float32Array(targetSize);
      const step = Math.floor(waveformData.length / targetSize);
      
      for (let i = 0; i < targetSize; i++) {
        downsampled[i] = waveformData[i * step];
      }
      
      waveformData = downsampled;
    }
    
    // Setup line style
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Begin path
    ctx.beginPath();
    
    // Calculate the center line and amplitude scaling
    const centerY = height / 2;
    
    // Auto-scale amplitude based on available height and current scale factor
    const scaleFactor = (height * 0.8) / 2 * scale;
    
    // Always stretch the waveform to fill the entire canvas width
    // by adjusting the step size based on the available data points
    const step = waveformData.length / width;
    
    // Plot each point in the waveform
    for (let i = 0; i < width; i++) {
      // Calculate the data index for this x position
      const dataIndex = Math.min(waveformData.length - 1, Math.floor(i * step));
      
      // Get the waveform value (-1.0 to 1.0)
      const value = waveformData[dataIndex];
      
      // Calculate y position (invert and scale)
      const y = centerY - (value * scaleFactor);
      
      // Plot the point
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    
    // Draw the line
    ctx.stroke();
  }
</script>

<BaseVisualizer 
  on:ready={handleReady}
  on:resize={handleResize}
  {fullHeight}
  {debug}
  id="oscilloscope"
  draw={drawOscilloscope}
/>
