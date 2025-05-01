<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { visualizerTheme, sizes } from '$lib/theme';
  
  // Props using Svelte 5 runes syntax
  const { 
    bgColor = visualizerTheme.background.primary,
    canvasHeight = sizes.defaultHeight,
    id = 'visualizer-' + Math.random().toString(36).substring(2, 9)
  } = $props();
  
  // Internal state
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let width = $state(500);
  let height = $state(canvasHeight);
  let isInitialized = $state(false);  // Track initialization state
  
  // Event dispatcher for communicating with parent components
  const dispatch = createEventDispatcher<{
    resize: { width: number; height: number; ctx: CanvasRenderingContext2D };
    ready: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement };
  }>();
  
  // Handle resize for responsiveness
  function handleResize() {
    if (!browser || !canvas || !ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
      width = container.clientWidth;
      height = Math.min(canvasHeight, container.clientWidth / 2);
      
      // Update canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Notify parent component about resize
      dispatch('resize', { width, height, ctx });
    }
  }
  
  function clearCanvas() {
    if (!ctx) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }
  
  onMount(() => {
    if (!browser) return;
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (!canvas) return;
      
      ctx = canvas.getContext('2d')!;
      handleResize();
      
      // Set up resize listener
      window.addEventListener('resize', handleResize);
      
      isInitialized = true;
      console.log(`${id} initializing with dimensions:`, width, height);
      
      // Notify parent that canvas is ready
      dispatch('ready', { ctx, canvas });
    }, 0);
  });
  
  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('resize', handleResize);
  });
  
  // Expose methods to parent components via bindings
  export function getContext() {
    return ctx;
  }
  
  export function getDimensions() {
    if (!isInitialized) {
      console.warn(`${id} - getDimensions called before initialization`);
      return { width: 0, height: 0 };
    }
    return { width, height };
  }
  
  export { clearCanvas, isInitialized };
</script>

<div class="w-full max-w-[800px] mx-auto flex flex-col gap-2" {id}>
  <div class="w-full rounded-md overflow-hidden shadow-md">
    <canvas bind:this={canvas} width={width} height={height} class="block w-full h-full"></canvas>
  </div>
  <slot />
</div> 