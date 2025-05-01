<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying } from '$lib/audio/engine';
  import { visualizerTheme } from '$lib/theme';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  
  // Props
  const { 
    fullHeight = false,
    debug = false
  } = $props();
  
  // Theme colors
  const lowColor = visualizerTheme.visualizations.spectrogram.lowIntensity;
  const midColor = visualizerTheme.visualizations.spectrogram.midIntensity;
  const highColor = visualizerTheme.visualizations.spectrogram.highIntensity;
  const debugColor = visualizerTheme.colors.accent;
  
  // Canvas and context
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let spectrogramData: Uint8Array[] = [];
  let isCanvasReady = $state(false);
  let scale = $state(1);
  
  // Animation frame ID for continuous updates
  let animationId: number;
  
  // Number of history frames to keep
  const historyLength = 200;
  
  // Watch isPlaying state to start/stop animation
  $effect(() => {
    if ($isPlaying) {
      startAnimation();
    } else if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = undefined;
    }
  });
  
  // Color gradient for intensity representation
  function getColor(value: number): string {
    // Use the theme colors to create a gradient based on value
    if (value < 85) {
      // Low intensity (0-85) - blend from black to low color
      const blendFactor = value / 85;
      return blendColors('#000000', lowColor, blendFactor);
    } else if (value < 170) {
      // Medium intensity (85-170) - blend from low to mid color
      const blendFactor = (value - 85) / 85;
      return blendColors(lowColor, midColor, blendFactor);
    } else {
      // High intensity (170-255) - blend from mid to high color
      const blendFactor = (value - 170) / 85;
      return blendColors(midColor, highColor, blendFactor);
    }
  }
  
  // Helper to blend two hex colors
  function blendColors(color1: string, color2: string, factor: number): string {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Parse a hex color into RGB components
  function parseColor(color: string): {r: number, g: number, b: number} {
    // Handle hex format
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }
    // Handle rgb format (simplified)
    return {r: 0, g: 255, b: 0}; // Fallback to green
  }
  
  // Function to draw the spectrogram
  function drawSpectrogram() {
    if (!ctx || !isCanvasReady) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background fill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw the spectrogram data if available
    if (spectrogramData.length > 0) {
      // Draw each spectrum sample as a vertical line of colored pixels
      for (let i = 0; i < spectrogramData.length; i++) {
        const x = width - (spectrogramData.length - i) * Math.max(1, Math.ceil(width / historyLength));
        
        if (x < 0) continue; // Skip if outside canvas
        
        const spectrum = spectrogramData[i];
        
        // Calculate how many frequency bins to display
        // Adjust based on available height and scale
        const maxBins = Math.floor(spectrum.length * Math.min(1, scale));
        const binCount = Math.min(maxBins, Math.floor(height));
        const binHeight = height / binCount;
        
        // Draw each frequency bin with a color representing its intensity
        for (let j = 0; j < binCount; j++) {
          // Calculate the spectrum index based on scale
          const spectrumIndex = Math.floor(j * (spectrum.length / binCount));
          
          // Get the intensity for this frequency bin (0-255)
          const intensity = spectrum[spectrumIndex];
          
          // Calculate y-position (invert to have low frequencies at bottom)
          const y = height - (j + 1) * binHeight;
          
          // Set color based on intensity
          ctx.fillStyle = getColor(intensity);
          
          // Draw a rectangle for this frequency bin
          ctx.fillRect(x, y, Math.max(1, Math.ceil(width / historyLength)), binHeight + 0.5);
        }
      }
    }
    
    // Draw debug information AFTER everything else so it's on top
    if (debug) {
      // Semi-transparent border to show canvas boundaries
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = visualizerTheme.visualizations.waveform.lineWidth;
      ctx.strokeRect(0, 0, width, height);
      
      // Black background for text to ensure visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 200, 20);
      
      // Draw dimensions text
      ctx.fillStyle = 'rgba(0, 255, 0, 1)';
      ctx.font = '10px monospace';
      ctx.fillText(`Spectrogram: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
    }
  }
  
  // Start the visualization animation
  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      // Add the latest spectrum data
      if ($spectrum && $spectrum.length > 0) {
        // Log occasionally to verify we're getting data
        if (Math.random() < 0.01) {
          console.log("Spectrogram data sample:", $spectrum[0], $spectrum[100], $spectrum[200]);
        }
        
        // Make a copy of the current spectrum
        const currentSpectrum = new Uint8Array($spectrum);
        
        // Add to history
        spectrogramData.push(currentSpectrum);
        
        // Limit history length
        if (spectrogramData.length > historyLength) {
          spectrogramData.shift();
        }
        
        // Draw the updated spectrogram
        drawSpectrogram();
      } else {
        // Debug if we're not getting spectrum data
        if (Math.random() < 0.01) {
          console.log("No spectrum data available");
        }
      }
      
      // Only continue animation if still playing
      if ($isPlaying) {
        animationId = requestAnimationFrame(animate);
      }
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle canvas ready event
  function handleCanvasReady(event: CustomEvent) {
    canvas = event.detail.canvas;
    ctx = event.detail.ctx;
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale; // Get scale factor
    isCanvasReady = true;
    
    // Only start animation if playing
    if ($isPlaying) {
      startAnimation();
    } else {
      // Just draw once to show initial state
      drawSpectrogram();
    }
  }
  
  // Handle resize event
  function handleResize(event: CustomEvent) {
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale; // Get scale factor
    
    // Redraw on resize
    drawSpectrogram();
  }
  
  // Clean up on destroy
  onDestroy(() => {
    if (browser && animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<VisualizerCanvas 
  on:ready={handleCanvasReady}
  on:resize={handleResize}
  fullHeight={fullHeight}
  scaleToFit={true}
  id="spectrogram"
/>

<style>
  /* Any spectrogram-specific styles can go here */
</style> 