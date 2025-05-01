<script lang="ts">
  import { rmsLevels, isPlaying, calculateLevels } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
  import BaseVisualizer from './BaseVisualizer.svelte';
  import { linearToDb, dbToPosition } from '$lib/utils/visualizerUtils';
  
  // Props
  const { 
    fullHeight = false,
    vertical = true, // Whether to display vertically (true) or horizontally (false)
    stereo = false, // Display stereo channels
    debug = false
  } = $props();
  
  // References to canvas context
  let ctx: CanvasRenderingContext2D;
  let width = 0;
  let height = 0;
  let scale = 1;
  
  // Theme colors
  const backgroundColor = 'rgba(0, 0, 0, 0.1)';
  
  // Level thresholds for markers
  const LEVEL_THRESHOLDS = [
    { dB: 0 },     // 0 dB (clip)
    { dB: -3 },    // -3 dB 
    { dB: -6 },    // -6 dB
    { dB: -12 },   // -12 dB
    { dB: -24 },   // -24 dB
    { dB: -48 }    // -48 dB
  ];
  
  // Add headroom above 0 dB and minimum displayable dB level
  const HEADROOM_DB = 6; // 6 dB of headroom above 0 dB
  const MIN_DB = -60;
  
  // Handle ready event from BaseVisualizer
  function handleReady(event) {
    ({ ctx, width, height, scale } = event.detail);
  }
  
  // Handle resize event from BaseVisualizer
  function handleResize(event) {
    ({ width, height, scale } = event.detail);
  }
  
  // Draw the meter - this will be called by BaseVisualizer
  function drawMeter() {
    if (!ctx) return;
    
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
        const rmsLeftHeight = (height - padding * 2) * dbToPosition(rmsLeftDb, MIN_DB, HEADROOM_DB);
        const rmsLeftY = height - padding - rmsLeftHeight;
        
        // Create gradient for RMS using only low and high energy colors
        const rmsGradientLeft = ctx.createLinearGradient(
          padding, height - padding,
          padding, padding
        );
        
        // Add only low and high energy color stops - skip the mid color
        rmsGradientLeft.addColorStop(0, theme.energy.low);  // Blue at bottom
        rmsGradientLeft.addColorStop(1, theme.energy.high); // Red at top
        
        ctx.fillStyle = rmsGradientLeft;
        ctx.fillRect(padding, rmsLeftY, meterWidth, rmsLeftHeight);
        
        // Right channel RMS
        const rmsRightHeight = (height - padding * 2) * dbToPosition(rmsRightDb, MIN_DB, HEADROOM_DB);
        const rmsRightY = height - padding - rmsRightHeight;
        
        // Create gradient for RMS using only low and high energy colors
        const rmsGradientRight = ctx.createLinearGradient(
          padding * 2 + meterWidth, height - padding,
          padding * 2 + meterWidth, padding
        );
        
        // Add only low and high energy color stops - skip the mid color
        rmsGradientRight.addColorStop(0, theme.energy.low);  // Blue at bottom
        rmsGradientRight.addColorStop(1, theme.energy.high); // Red at top
        
        ctx.fillStyle = rmsGradientRight;
        ctx.fillRect(padding * 2 + meterWidth, rmsRightY, meterWidth, rmsRightHeight);
      } else {
        // Mono channel RMS
        const rmsHeight = (height - padding * 2) * dbToPosition(rmsLeftDb, MIN_DB, HEADROOM_DB);
        const rmsY = height - padding - rmsHeight;
        
        // Create gradient for RMS using only low and high energy colors
        const rmsGradient = ctx.createLinearGradient(
          padding, height - padding,
          padding, padding
        );
        
        // Add only low and high energy color stops - skip the mid color
        rmsGradient.addColorStop(0, theme.energy.low);  // Blue at bottom
        rmsGradient.addColorStop(1, theme.energy.high); // Red at top
        
        ctx.fillStyle = rmsGradient;
        ctx.fillRect(padding, rmsY, meterWidth, rmsHeight);
      }
      
      // Draw level markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      
      // Add a marker for 0 dB and headroom
      const zeroDbY = height - padding - (height - padding * 2) * dbToPosition(0, MIN_DB, HEADROOM_DB);
      ctx.beginPath();
      ctx.moveTo(padding, zeroDbY);
      ctx.lineTo(width - padding, zeroDbY);
      ctx.stroke();
      
      // Add a "0 dB" label in slightly bolder/different style
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`0dB`, width - padding - 25, zeroDbY - 5);
      
      // Draw the rest of the level markings
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      
      LEVEL_THRESHOLDS.forEach(threshold => {
        // Skip 0 dB as we've already drawn it
        if (threshold.dB === 0) return;
        
        const y = height - padding - (height - padding * 2) * dbToPosition(threshold.dB, MIN_DB, HEADROOM_DB);
        
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Add dB labels
        ctx.fillText(`${threshold.dB}dB`, width - padding - 25, y - 5);
      });
    } else {
      // Draw horizontal meters
      const padding = Math.max(1, Math.floor(height * 0.05)); // Minimal padding
      
      // Calculate meter heights based on stereo/mono
      const meterHeight = stereo ? (height - padding * 2 - padding) / 2 : height - padding * 2;
      
      // Draw backgrounds
      ctx.fillStyle = backgroundColor;
      
      if (stereo) {
        // Left channel background
        ctx.fillRect(padding, padding, width - padding * 2, meterHeight);
        
        // Right channel background
        ctx.fillRect(padding, padding * 2 + meterHeight, width - padding * 2, meterHeight);
      } else {
        // Mono background
        ctx.fillRect(padding, padding, width - padding * 2, meterHeight);
      }
      
      // Draw RMS levels
      if (stereo) {
        // Left channel RMS
        const rmsLeftWidth = (width - padding * 2) * dbToPosition(rmsLeftDb, MIN_DB, HEADROOM_DB);
        
        // Create gradient for RMS using only low and high energy colors
        const rmsGradientLeft = ctx.createLinearGradient(
          padding, padding,
          width - padding, padding
        );
        
        // Add only low and high energy color stops - skip the mid color
        rmsGradientLeft.addColorStop(0, theme.energy.low);  // Blue at left
        rmsGradientLeft.addColorStop(1, theme.energy.high); // Red at right
        
        ctx.fillStyle = rmsGradientLeft;
        ctx.fillRect(padding, padding, rmsLeftWidth, meterHeight);
        
        // Right channel RMS
        const rmsRightWidth = (width - padding * 2) * dbToPosition(rmsRightDb, MIN_DB, HEADROOM_DB);
        
        // Create gradient for RMS using only low and high energy colors
        const rmsGradientRight = ctx.createLinearGradient(
          padding, padding * 2 + meterHeight,
          width - padding, padding * 2 + meterHeight
        );
        
        // Add only low and high energy color stops - skip the mid color
        rmsGradientRight.addColorStop(0, theme.energy.low);  // Blue at left
        rmsGradientRight.addColorStop(1, theme.energy.high); // Red at right
        
        ctx.fillStyle = rmsGradientRight;
        ctx.fillRect(padding, padding * 2 + meterHeight, rmsRightWidth, meterHeight);
      } else {
        // Mono channel RMS
        const rmsWidth = (width - padding * 2) * dbToPosition(rmsLeftDb, MIN_DB, HEADROOM_DB);
        
        // Create gradient for RMS using only low and high energy colors
        const rmsGradient = ctx.createLinearGradient(
          padding, padding,
          width - padding, padding
        );
        
        // Add only low and high energy color stops - skip the mid color
        rmsGradient.addColorStop(0, theme.energy.low);  // Blue at left
        rmsGradient.addColorStop(1, theme.energy.high); // Red at right
        
        ctx.fillStyle = rmsGradient;
        ctx.fillRect(padding, padding, rmsWidth, meterHeight);
      }
      
      // Draw level markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      
      // Add a marker for 0 dB and headroom
      const zeroDbX = padding + (width - padding * 2) * dbToPosition(0, MIN_DB, HEADROOM_DB);
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
        
        const x = padding + (width - padding * 2) * dbToPosition(threshold.dB, MIN_DB, HEADROOM_DB);
        
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // Add dB labels
        ctx.fillText(`${threshold.dB}dB`, x - 10, height - padding + 12);
      });
    }
  }
</script>

<BaseVisualizer 
  on:ready={handleReady}
  on:resize={handleResize}
  {fullHeight}
  {debug}
  id="peak-meter"
  draw={drawMeter}
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