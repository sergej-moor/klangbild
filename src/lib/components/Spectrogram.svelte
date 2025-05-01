<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { spectrum, isPlaying, sampleRate } from '$lib/audio/engine';
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
  
  // Number of frequency bands to display
  const NUM_BANDS = 128;
  
  // Frequency range constants - human hearing range
  const MIN_FREQ = 20; // 20 Hz is typically the lower limit of human hearing
  const MAX_FREQ_MULTIPLIER = 0.5; // Nyquist frequency (half sample rate)
  
  // Pre-calculate band edge frequencies and mapping
  let bandEdges: number[] = [];
  let bandBinRanges: {start: number, end: number}[] = [];
  
  // Function to initialize frequency bands
  function initFrequencyBands() {
    const actualSampleRate = $sampleRate || 44100;
    const nyquist = actualSampleRate * MAX_FREQ_MULTIPLIER;
    
    // Generate logarithmically-spaced band edge frequencies
    bandEdges = new Array(NUM_BANDS + 1);
    for (let i = 0; i <= NUM_BANDS; i++) {
      // Calculate band edge frequency using logarithmic spacing
      const t = i / NUM_BANDS;
      bandEdges[i] = MIN_FREQ * Math.pow(nyquist / MIN_FREQ, t);
    }
    
    // Pre-calculate which spectrum bins correspond to each band
    const binCount = $spectrum ? $spectrum.length : 1024; // Default to 1024 if not available
    bandBinRanges = new Array(NUM_BANDS);
    
    for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
      // Convert edge frequencies to bin indices
      const lowFreq = bandEdges[bandIndex];
      const highFreq = bandEdges[bandIndex + 1];
      
      // Calculate which bins in the FFT data correspond to these frequencies
      const lowBin = Math.floor((lowFreq / nyquist) * binCount);
      const highBin = Math.min(binCount - 1, Math.ceil((highFreq / nyquist) * binCount));
      
      bandBinRanges[bandIndex] = { start: lowBin, end: highBin };
    }
  }
  
  // Function to get average intensity for a band
  function getBandIntensity(spectrum: Uint8Array, bandIndex: number): number {
    const range = bandBinRanges[bandIndex];
    let sum = 0;
    let count = 0;
    
    // Sum up the values in this frequency range
    for (let i = range.start; i <= range.end; i++) {
      sum += spectrum[i];
      count++;
    }
    
    // Return the average intensity
    return count > 0 ? Math.round(sum / count) : 0;
  }
  
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
    // Use a more balanced conversion for better dynamic range
    const norm = value / 255;
    
    // Use a gentler curve with lower exponent for better overall visibility
    // 1.4 provides good contrast without making everything too dark
    const adjustedNorm = Math.pow(norm, 1.4);
    
    // Apply the transformation to get the visual intensity
    const visualIntensity = adjustedNorm * 255;
    
    // Use the transformed value for color mapping
    if (visualIntensity < 85) {
      // Low intensity (0-85) - blend from black to low color
      const blendFactor = visualIntensity / 85;
      return blendColors('#000000', lowColor, blendFactor);
    } else if (visualIntensity < 170) {
      // Medium intensity (85-170) - blend from low to mid color
      const blendFactor = (visualIntensity - 85) / 85;
      return blendColors(lowColor, midColor, blendFactor);
    } else {
      // High intensity (170-255) - blend from mid to high color
      const blendFactor = (visualIntensity - 170) / 85;
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
    
    // Get the sample rate for frequency calculations
    const actualSampleRate = $sampleRate || 44100;
    const nyquist = actualSampleRate * MAX_FREQ_MULTIPLIER;
    
    // Initialize frequency bands if not already done
    if (bandEdges.length === 0) {
      initFrequencyBands();
    }
    
    // Draw the spectrogram data if available
    if (spectrogramData.length > 0) {
      // Draw each spectrum sample as a vertical line of colored pixels
      for (let i = 0; i < spectrogramData.length; i++) {
        const x = width - (spectrogramData.length - i) * Math.max(1, Math.ceil(width / historyLength));
        
        if (x < 0) continue; // Skip if outside canvas
        
        const spectrum = spectrogramData[i];
        const bandHeight = height / NUM_BANDS;
        
        // Draw each frequency band with a color representing its intensity
        for (let j = 0; j < NUM_BANDS; j++) {
          // Get the average intensity for this band
          const intensity = getBandIntensity(spectrum, j);
          
          // Calculate y-position with inverted j 
          // This makes higher frequencies (higher band indices) appear at the top
          const y = (NUM_BANDS - 1 - j) * bandHeight;
          
          // Set color based on intensity
          ctx.fillStyle = getColor(intensity);
          
          // Draw a rectangle for this frequency band
          ctx.fillRect(x, y, Math.max(1, Math.ceil(width / historyLength)), bandHeight + 0.5);
        }
      }
    }
    
    // Draw debug information if enabled
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
      
      // Update the frequency markers to show band edges
      const markers = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]; // Hz
      const bandHeight = height / NUM_BANDS; // Define bandHeight here for markers
      
      ctx.fillStyle = debugColor;
      ctx.font = '9px monospace';
      
      markers.forEach(freq => {
        // Skip frequencies above Nyquist
        if (freq > nyquist) return;
        
        // Find which band this frequency belongs to
        let bandIndex = 0;
        for (let i = 0; i < bandEdges.length - 1; i++) {
          if (freq >= bandEdges[i] && freq < bandEdges[i + 1]) {
            bandIndex = i;
            break;
          }
        }
        
        // Calculate y position based on band position, with inverted index
        // This makes higher frequencies appear at the top
        const yPercent = (NUM_BANDS - 1 - bandIndex) / NUM_BANDS;
        const y = Math.floor(yPercent * height) + bandHeight / 2;
        
        if (y >= 0 && y < height) {
          // Draw marker and label
          const markerWidth = 10;
          
          // Create a small black background for better text visibility
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const label = freq >= 1000 ? `${freq/1000}k` : `${freq}`;
          const textWidth = ctx.measureText(label).width;
          ctx.fillRect(markerWidth, y - 5, textWidth + 6, 10);
          
          // Draw the marker line
          ctx.fillStyle = debugColor;
          ctx.fillRect(0, y, markerWidth, 1);
          
          // Draw the frequency label
          ctx.fillText(label, markerWidth + 3, y + 3);
        }
      });
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
  
  // Add listener for sampleRate changes to reinitialize bands
  $effect(() => {
    if ($sampleRate) {
      initFrequencyBands();
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