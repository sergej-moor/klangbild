<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { isPlaying } from '$lib/audio/engine';
  import { theme } from '$lib/theme';
  import { debugMode } from '$lib/stores/debug';
  import VisualizerCanvas from '../base/VisualizerCanvas.svelte';
  
  // Props that all visualizers should support
  const { 
    id = 'visualizer-' + Math.random().toString(36).substring(2, 9),
    draw = null // Accept the draw function from child component
  } = $props();
  
  // Shared state for all visualizers
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(0);
  let height = $state(0);
  let scale = $state(1);
  let deviceScale = $state(1);
  let animationId: number;
  let isCanvasReady = $state(false);
  
  // Standard theme colors for consistency
  const debugColor = theme.energy.high;
  
  // Event dispatcher for child component events
  const dispatch = createEventDispatcher();
  
  // Default draw function if none is provided
  function defaultDraw() {
    // Base implementation just clears the canvas
    if (!ctx || !isCanvasReady) return;
    ctx.clearRect(0, 0, width, height);
    
    // Draw debug info if enabled
    if ($debugMode) {
      drawDebugInfo();
    }
  }
  
  // Standard debug info rendering
  function drawDebugInfo() {
    if (!ctx) return;
    
    // Semi-transparent overlay
    ctx.fillStyle = `${debugColor}20`;
    ctx.fillRect(0, 0, width, height);
    
    // Draw crosshair to show center
    ctx.strokeStyle = `${debugColor}80`;
    ctx.beginPath();
    ctx.moveTo(0, height/2);
    ctx.lineTo(width, height/2);
    ctx.moveTo(width/2, 0);
    ctx.lineTo(width/2, height);
    ctx.stroke();
    
    // Draw text showing dimensions
    ctx.fillStyle = debugColor;
    ctx.font = '10px monospace';
    ctx.fillText(`${id}: ${width}x${height} (scale: ${scale.toFixed(2)})`, 5, 15);
  }
  
  // Standard animation function
  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    
    function animate() {
      // Run the provided draw function, or fall back to the default
      if (typeof draw === 'function') {
        draw();
      } else {
        defaultDraw();
      }
      
      // Draw debug info if enabled (after component's drawing)
      if ($debugMode) {
        drawDebugInfo();
      }
      
      animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Handle canvas resize event
  function handleResize(event: CustomEvent) {
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    deviceScale = event.detail.deviceScale || 1;
    
    // Forward event to child components
    dispatch('resize', {
      width,
      height,
      scale,
      deviceScale,
      ctx,
      canvas
    });
    
    // Redraw on resize
    if (typeof draw === 'function') {
      draw();
    } else {
      defaultDraw();
    }
    
    // Draw debug info if enabled
    if ($debugMode) {
      drawDebugInfo();
    }
  }
  
  // Handle canvas ready event
  function handleCanvasReady(event: CustomEvent) {
    canvas = event.detail.canvas;
    ctx = event.detail.ctx;
    width = event.detail.width;
    height = event.detail.height;
    scale = event.detail.scale || 1;
    deviceScale = event.detail.deviceScale || 1;
    isCanvasReady = true;
    
    // Forward ready event to child components
    dispatch('ready', {
      ctx,
      canvas,
      width,
      height,
      scale,
      deviceScale
    });
    
    // Start animation if playing
    if ($isPlaying) {
      startAnimation();
    } else {
      // Just draw once
      if (typeof draw === 'function') {
        draw();
      } else {
        defaultDraw();
      }
      
      // Draw debug info if enabled
      if ($debugMode) {
        drawDebugInfo();
      }
    }
  }
  
  // Watch isPlaying state to start/stop animation
  $effect(() => {
    if (!isCanvasReady) return;
    
    if ($isPlaying) {
      startAnimation();
    } else if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = undefined;
    }
  });
  
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
  scaleToFit={true}
  {id}
>
  <slot />
</VisualizerCanvas> 