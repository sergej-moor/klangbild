<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { rmsLevels, isPlaying, calculateLevels } from '$lib/audio/engine';
  import { visualizerTheme } from '$lib/theme';
  import VisualizerCanvas from './base/VisualizerCanvas.svelte';
  
  // Props
  const { 
    fullHeight = false,
    vertical = true, // Whether to display vertically (true) or horizontally (false)
    stereo = false, // Display stereo channels
    debug = false
  } = $props();
  
  // Canvas and context
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1);
  let animationId: number;
  let isCanvasReady = $state(false);
  
  // Theme colors
  const rmsColor = visualizerTheme.colors.primary;
  const debugColor = visualizerTheme.colors.accent;
  const backgroundColor = 'rgba(0, 0, 0, 0.1)';
  
  // Level thresholds (in dB)
  const LEVEL_THRESHOLDS = [
    { dB: 0, color: '#FF0000' },     // 0 dB (clip) - Red
    { dB: -3, color: '#FFAA00' },    // -3 dB - Orange
    { dB: -6, color: '#FFFF00' },    // -6 dB - Yellow
    { dB: -12, color: '#00FF00' },   // -12 dB - Green
    { dB: -24, color: '#00AAFF' },   // -24 dB - Light Blue
    { dB: -48, color: '#0000FF' }    // -48 dB - Blue
  ];
  
  // Add headroom above 0 dB and minimum displayable dB level
  const HEADROOM_DB = 6; // 6 dB of headroom above 0 dB
  const MIN_DB = -60;
  
  // Convert a linear amplitude (0-1) to dB
  function linearToDb(value: number): number {
    // Avoid log(0) errors
    if (value < 0.0000001) return MIN_DB;
    
    // Convert to dB = 20 * log10(value)
    return 20 * Math.log10(value);
  }
  
  // Convert dB to a display position (0-1)
  function dbToPosition(db: number): number {
    // Clamp to MIN_DB
    db = Math.max(db, MIN_DB);
    
    // Scale to 0-1 range, accounting for headroom
    // Map from (MIN_DB to HEADROOM_DB) to (0 to 1)
    return (db - MIN_DB) / (HEADROOM_DB - MIN_DB);
  }
  
  // Get color based on dB level
  function getColorForLevel(db: number): string {
    for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
      if (db >= LEVEL_THRESHOLDS[i].dB) {
        return LEVEL_THRESHOLDS[i].color;
      }
    }
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].color;
  }
  
  // Draw the meter
  function drawMeter() {
    if (!ctx || !isCanvasReady) return;
    
    // Make sure to update the levels
    if ($isPlaying) {
      calculateLevels();
    }
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get current values
    const rms = $rmsLevels;
    
    // Convert to dB
    const rmsLeftDb = linearToDb(rms.left);
    const rmsRightDb = linearToDb(rms.right);
    
    if (vertical) {
      // Draw vertical meters
      const padding = Math.max(1, Math.floor(width * 0.02)); // Minimal padding
      
      // Calculate meter widths based on stereo/mono
      const meterWidth = stereo ? (width - padding * 2 - padding) / 2 : width - padding * 2;
      
      // Draw backgrounds
      ctx.fillStyle = backgroundColor;
      
      if (stereo) {
        // Left channel background
        ctx.fillRect(padding, padding, meterWidth, height - padding * 2);
        
        // Right channel background
        ctx.fillRect(padding * 2 + meterWidth, padding, meterWidth, height - padding * 2);
      } else {
        // Mono background
        ctx.fillRect(padding, padding, meterWidth, height - padding * 2);
      }
      
      // Draw RMS levels
      if (stereo) {
        // Left channel RMS
        const rmsLeftHeight = (height - padding * 2) * dbToPosition(rmsLeftDb);
        const rmsLeftY = height - padding - rmsLeftHeight;
        
        // Create gradient for RMS
        const rmsGradientLeft = ctx.createLinearGradient(
          padding, height - padding,
          padding, padding
        );
        
        // Add color stops based on level thresholds
        LEVEL_THRESHOLDS.forEach(threshold => {
          const pos = dbToPosition(threshold.dB);
          rmsGradientLeft.addColorStop(pos, threshold.color);
        });
        
        ctx.fillStyle = rmsGradientLeft;
        ctx.fillRect(padding, rmsLeftY, meterWidth, rmsLeftHeight);
        
        // Right channel RMS
        const rmsRightHeight = (height - padding * 2) * dbToPosition(rmsRightDb);
        const rmsRightY = height - padding - rmsRightHeight;
        
        // Create gradient for RMS
        const rmsGradientRight = ctx.createLinearGradient(
          padding * 2 + meterWidth, height - padding,
          padding * 2 + meterWidth, padding
        );
        
        // Add color stops based on level thresholds
        LEVEL_THRESHOLDS.forEach(threshold => {
          const pos = dbToPosition(threshold.dB);
          rmsGradientRight.addColorStop(pos, threshold.color);
        });
        
        ctx.fillStyle = rmsGradientRight;
        ctx.fillRect(padding * 2 + meterWidth, rmsRightY, meterWidth, rmsRightHeight);
      } else {
        // Mono channel RMS
        const rmsHeight = (height - padding * 2) * dbToPosition(rmsLeftDb);
        const rmsY = height - padding - rmsHeight;
        
        // Create gradient for RMS
        const rmsGradient = ctx.createLinearGradient(
          padding, height - padding,
          padding, padding
        );
        
        // Add color stops based on level thresholds
        LEVEL_THRESHOLDS.forEach(threshold => {
          const pos = dbToPosition(threshold.dB);
          rmsGradient.addColorStop(pos, threshold.color);
        });
        
        ctx.fillStyle = rmsGradient;
        ctx.fillRect(padding, rmsY, meterWidth, rmsHeight);
      }
      
      // Draw level markings (after filling the bars)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      
      // Add a marker for 0 dB and headroom
      const zeroDbY = padding + (height - padding * 2) * (1 - (0 - MIN_DB) / (HEADROOM_DB - MIN_DB));
      ctx.beginPath();
      ctx.moveTo(padding, zeroDbY);
      ctx.lineTo(width - padding, zeroDbY);
      ctx.stroke();
      
      // Add a "0 dB" label in slightly bolder/different style
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`0dB`, width - padding - 30, zeroDbY - 2);
      
      // Draw the rest of the level markings
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      
      LEVEL_THRESHOLDS.forEach(threshold => {
        // Skip 0 dB as we've already drawn it
        if (threshold.dB === 0) return;
        
        const y = padding + (height - padding * 2) * (1 - dbToPosition(threshold.dB));
        
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Add dB labels
        ctx.fillText(`${threshold.dB}dB`, width - padding - 30, y - 2);
      });
    } else {
      // Horizontal meters
      const padding = Math.max(1, Math.floor(height * 0.02));
      
      // Calculate meter heights based on stereo/mono
      const meterHeight = stereo ? (height - padding * 2 - padding) / 2 : height - padding * 2;
      
      // Draw backgrounds
      ctx.fillStyle = backgroundColor;
      
      if (stereo) {
        // Top channel (left) background
        ctx.fillRect(padding, padding, width - padding * 2, meterHeight);
        
        // Bottom channel (right) background
        ctx.fillRect(padding, padding * 2 + meterHeight, width - padding * 2, meterHeight);
      } else {
        // Mono background
        ctx.fillRect(padding, padding, width - padding * 2, meterHeight);
      }
      
      // Draw RMS levels
      if (stereo) {
        // Left channel RMS
        const rmsLeftWidth = (width - padding * 2) * dbToPosition(rmsLeftDb);
        
        // Create gradient for RMS
        const rmsGradientLeft = ctx.createLinearGradient(
          padding, padding,
          width - padding, padding
        );
        
        // Add color stops based on level thresholds
        LEVEL_THRESHOLDS.forEach(threshold => {
          const pos = dbToPosition(threshold.dB);
          rmsGradientLeft.addColorStop(pos, threshold.color);
        });
        
        ctx.fillStyle = rmsGradientLeft;
        ctx.fillRect(padding, padding, rmsLeftWidth, meterHeight);
        
        // Right channel RMS
        const rmsRightWidth = (width - padding * 2) * dbToPosition(rmsRightDb);
        
        // Create gradient for RMS
        const rmsGradientRight = ctx.createLinearGradient(
          padding, padding * 2 + meterHeight,
          width - padding, padding * 2 + meterHeight
        );
        
        // Add color stops based on level thresholds
        LEVEL_THRESHOLDS.forEach(threshold => {
          const pos = dbToPosition(threshold.dB);
          rmsGradientRight.addColorStop(pos, threshold.color);
        });
        
        ctx.fillStyle = rmsGradientRight;
        ctx.fillRect(padding, padding * 2 + meterHeight, rmsRightWidth, meterHeight);
      } else {
        // Mono channel RMS
        const rmsWidth = (width - padding * 2) * dbToPosition(rmsLeftDb);
        
        // Create gradient for RMS
        const rmsGradient = ctx.createLinearGradient(
          padding, padding,
          width - padding, padding
        );
        
        // Add color stops based on level thresholds
        LEVEL_THRESHOLDS.forEach(threshold => {
          const pos = dbToPosition(threshold.dB);
          rmsGradient.addColorStop(pos, threshold.color);
        });
        
        ctx.fillStyle = rmsGradient;
        ctx.fillRect(padding, padding, rmsWidth, meterHeight);
      }
      
      // Draw level markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      
      // Add a marker for 0 dB and headroom
      const zeroDbX = padding + (width - padding * 2) * dbToPosition(0);
      ctx.beginPath();
      ctx.moveTo(zeroDbX, padding);
      ctx.lineTo(zeroDbX, height - padding);
      ctx.stroke();
      
      // Add a "0 dB" label in slightly bolder/different style
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`0dB`, zeroDbX - 10, height - padding + 12);
      
      // Draw the rest of the level markings
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      
      LEVEL_THRESHOLDS.forEach(threshold => {
        // Skip 0 dB as we've already drawn it
        if (threshold.dB === 0) return;
        
        const x = padding + (width - padding * 2) * dbToPosition(threshold.dB);
        
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // Add dB labels
        ctx.fillText(`${threshold.dB}dB`, x - 10, height - padding + 12);
      });
    }
    
    // Draw debug information if enabled
    if (debug) {
      ctx.fillStyle = `${debugColor}80`;
      ctx.font = '10px monospace';
      ctx.fillText(`RMS L: ${rmsLeftDb.toFixed(1)}dB R: ${rmsRightDb.toFixed(1)}dB`, 5, 15);
    }
  }
  
  // Start the animation loop
  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      drawMeter();
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle canvas resize
  function handleResize(event: CustomEvent) {
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    
    // Redraw with new dimensions
    drawMeter();
  }
  
  // Handle canvas ready
  function handleCanvasReady(event: CustomEvent) {
    canvas = event.detail.canvas;
    ctx = event.detail.ctx;
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    isCanvasReady = true;
    
    // Start animation once canvas is ready
    startAnimation();
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
  id="peak-meter"
/>

<style>
  /* Add some styles to ensure the canvas parent takes full space */
  :global(#peak-meter) {
    height: 100%;
    width: 100%;
  }
  
  :global(#peak-meter canvas) {
    width: 100%;
    height: 100%;
  }
</style> 