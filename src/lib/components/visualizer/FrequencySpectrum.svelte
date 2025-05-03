<script lang="ts">
  import { spectrum, sampleRate } from '$lib/audio/stores';
  import { theme } from '$lib/theme';
  import BaseVisualizer from './BaseVisualizer.svelte';
  import { blendColors, parseColor } from '$lib/audio/visualizer';
  import { browser } from '$app/environment';
  
  // Props - removed debug prop
  const {} = $props();
  
  // References to canvas context
  let ctx: CanvasRenderingContext2D;
  let width = 0;
  let height = 0;
  let scale = 1;
  
  // Frequency scaling - back to original value but with better interpolation
  const freqScalingPower = 3.0; // Controls logarithmic curve
  const minFreqPercent = 0.001; // Start from very low frequencies
  
  // Responsive height scaling factor
  let isSmallScreen = false;
  let heightScaleFactor = 1;
  
  // Previous spectrum data for temporal smoothing
  let prevSpectrum: number[] = [];
  // Smoothing factor (0-1), higher = more smoothing between frames
  const temporalSmoothing = 0.5;
  
  // Gradient intensity settings
  const intensityPower = 3.0; // Higher value makes gradient more intense (was 1.5)
  const minAlpha = 0.05; // Lower minimum alpha makes lower frequencies less visible (was 0.2)
  const alphaRange = 0.95; // Higher range creates more contrast (was 0.8)
  
  // Check screen size on mount and resize
  function checkScreenSize() {
    if (browser) {
      isSmallScreen = window.innerWidth < 768;
      heightScaleFactor = isSmallScreen ? 2 : 1;
    }
  }
  
  // Handle ready event from BaseVisualizer
  function handleReady(event: CustomEvent) {
    ({ ctx, width, height, scale } = event.detail);
    checkScreenSize();
  }
  
  // Handle resize event from BaseVisualizer
  function handleResize(event: CustomEvent) {
    ({ width, height, scale } = event.detail);
    checkScreenSize();
  }
  
  // Cubic interpolation function for smoother curves
  function cubicInterpolate(y0: number, y1: number, y2: number, y3: number, mu: number) {
    const mu2 = mu * mu;
    const a0 = y3 - y2 - y0 + y1;
    const a1 = y0 - y1 - a0;
    const a2 = y2 - y0;
    const a3 = y1;
    return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3;
  }
  
  // Enhanced color blending function for more dramatic gradient
  function intensifyColor(amplitude: number) {
    // Apply a steeper power curve to make peaks pop
    const factor = Math.pow(amplitude, intensityPower);
    
    // Almost invisible at low amplitudes, high contrast at peaks
    const alpha = minAlpha + (factor * alphaRange);
    
    // Use more vivid color for peaks
    const peakColor = theme.primary;
    const lowColor = theme.background;  // Very dark background
    
    // Create the color with enhanced contrast
    return blendColors(lowColor, peakColor, factor, alpha);
  }
  
  // Draw the frequency spectrum - this will be called by BaseVisualizer
  function drawSpectrum() {
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get the current spectrum data
    const spectrumData = $spectrum;
    if (!spectrumData || spectrumData.length === 0) {
      return;
    }
    
    // Calculate how many points to draw
    const pointCount = width;
    const points: {x: number, y: number, amplitude: number}[] = [];
    
    // Process each point
    for (let i = 0; i < pointCount; i++) {
      const xPercent = i / pointCount;
      
      // Use original scaling approach for frequency distribution
      const logPos = minFreqPercent + (1 - minFreqPercent) * 
                    Math.pow(xPercent, freqScalingPower);
      
      // Calculate exact position in the data array (with decimal part)
      const exactIndex = logPos * spectrumData.length;
      
      // Get integer part and fractional part for interpolation
      const indexLow = Math.floor(exactIndex);
      
      // For better interpolation, get 4 points for cubic interpolation when possible
      let value: number;
      const mu = exactIndex - indexLow; // Fractional part
      
      if (indexLow > 0 && indexLow < spectrumData.length - 2) {
        // We have enough points for cubic interpolation
        const y0 = spectrumData[indexLow - 1];
        const y1 = spectrumData[indexLow];
        const y2 = spectrumData[indexLow + 1];
        const y3 = spectrumData[indexLow + 2];
        value = cubicInterpolate(y0, y1, y2, y3, mu);
      } else {
        // Fallback to linear interpolation at edges
        const indexHigh = Math.min(spectrumData.length - 1, indexLow + 1);
        const valueLow = spectrumData[indexLow];
        const valueHigh = spectrumData[indexHigh];
        value = valueLow + mu * (valueHigh - valueLow);
      }
      
      // Apply temporal smoothing if we have previous data
      if (prevSpectrum[i] !== undefined) {
        // Fast attack, slow release: respond quickly to rises but fall off slowly
        const smoothFactor = value > prevSpectrum[i] ? 0.3 : temporalSmoothing;
        value = prevSpectrum[i] * smoothFactor + value * (1 - smoothFactor);
      }
      
      // Store for next frame
      prevSpectrum[i] = value;
      
      // Normalize to 0-1 range
      const amplitude = value / 255;
      
      // Calculate y position with height scaling
      const y = height - amplitude * height * 0.8 * scale * heightScaleFactor;
      
      // Store the point
      points.push({x: i, y, amplitude});
    }
    
    // Fill the area under the curve with energy-based coloring
    for (let i = 0; i < points.length; i++) {
      const {x, y, amplitude} = points[i];
      
      // Skip if we're at the right edge
      if (i >= points.length - 1) continue;
      
      // Get the next point
      const nextPoint = points[i + 1];
      
      // Calculate the width of this segment
      const segmentWidth = nextPoint.x - x;
      
      // Get more dramatic coloring with high contrast
      ctx.fillStyle = intensifyColor(amplitude);
      
      // Fill this vertical slice with the calculated color
      ctx.fillRect(x, y, segmentWidth, height - y);
    }
    
    // Now draw the line for crisp definition
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.primary;
    
    ctx.beginPath();
    
    // Draw the line connecting all points
    for (let i = 0; i < points.length; i++) {
      const {x, y} = points[i];
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    // Stroke the line
    ctx.stroke();
  }
  
  // Add event listener for window resize
  if (browser) {
    window.addEventListener('resize', checkScreenSize);
  }
</script>

<BaseVisualizer 
  on:ready={handleReady}
  on:resize={handleResize}
  id="frequency-spectrum"
  draw={drawSpectrum}
/> 