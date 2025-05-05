<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { theme } from '$lib/theme';
  import { browser } from '$app/environment';
  
  let mouseX = 0;
  let mouseY = 0;
  let isHovering = false;
  let isVisible = true;
  let globalDragging = false;
  
  // Use a reactive array of trails that we'll recreate on updates
  let trails: { x: number, y: number, scale: number }[] = [];
  let animationFrameId: number;
  let forceUpdateCounter = 0; // Used to force Svelte reactivity
  
  // Initialize trail positions
  const TRAIL_COUNT = 3;
  for (let i = 0; i < TRAIL_COUNT; i++) {
    trails.push({ 
      x: 0, 
      y: 0, 
      scale: 1 - (i * 0.15)
    });
  }
  
  // Only hide cursor on waveform component
  const hideCursorComponents = ['waveform-visualizer'];
  
  // List of standard cursor values that indicate an interactive element
  const interactiveCursors = [
    'pointer', 'hand', 
    'grab', 'grabbing', 
    'move', 
    'text', 
    'cell', 
    'crosshair',
    'col-resize', 'row-resize', 
    'n-resize', 'e-resize', 's-resize', 'w-resize', 
    'ne-resize', 'nw-resize', 'se-resize', 'sw-resize',
    'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize',
    'zoom-in', 'zoom-out',
    'copy', 'alias', 'context-menu', 'help',
    'all-scroll', 'not-allowed', 'progress', 'wait',
    'ns-resize' // Explicitly add ns-resize for knobs
  ];
  
  // Default/non-interactive cursors
  const defaultCursors = ['auto', 'default', 'none', 'inherit', 'initial', 'unset'];
  
  function updateTrailPositions() {
    // Create a copy of the trails array to modify
    let newTrails = [...trails];
    let hasChanges = false;
    
    // The main cursor position is the target
    let targetX = mouseX;
    let targetY = mouseY;
    
    // Update each trail position
    newTrails.forEach((trail, index) => {
      // Each trail follows the one before it (or the cursor for the first one)
      const dx = targetX - trail.x;
      const dy = targetY - trail.y;
      
      // Use different ease factors for each trail
      const easeFactor = 0.3 - (index * 0.03);
      
      // Calculate the new position
      let newX = trail.x + (dx * easeFactor);
      let newY = trail.y + (dy * easeFactor);
      
      // Enforce a minimum movement to avoid stagnation
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 0.5) {
        // If very close but not exactly at target, give a small nudge
        if (distance > 0.01) {
          const angle = Math.atan2(dy, dx);
          newX = trail.x + Math.cos(angle) * 0.5;
          newY = trail.y + Math.sin(angle) * 0.5;
          hasChanges = true;
        }
      } else {
        hasChanges = true;
      }
      
      // Update the trail
      trail.x = newX;
      trail.y = newY;
      
      // Each trail becomes the reference for the next one
      targetX = trail.x;
      targetY = trail.y;
    });
    
    // If the trails moved, update the array and force reactivity
    if (hasChanges) {
      trails = newTrails;
      forceUpdateCounter++; // Force Svelte to detect changes
    }
    
    // Request next frame to keep animation running continuously
    animationFrameId = requestAnimationFrame(updateTrailPositions);
  }
  
  function handleMouseMove(e: MouseEvent) {
    // Always update cursor position
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Check if mouse is over interactive element
    const target = e.target as HTMLElement;
    
    // First check if we should hide the cursor on this element
    checkCursorVisibility(target);
    
    // Check if we're hovering over an interactive element (including parents)
    isHovering = isElementInteractive(target);
  }
  
  // Add global mouse event listeners
  function addGlobalListeners() {
    if (!browser) return;
    
    // Track global pointer down/up events to handle dragging
    const handlePointerDown = () => {
      globalDragging = true;
    };
    
    const handlePointerUp = () => {
      globalDragging = false;
    };
    
    // Add event listener for pointer events to track cursor during dragging
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    
    // Add more aggressive mouse tracking during dragging operations
    const trackDuringDrag = (e: MouseEvent) => {
      if (globalDragging) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    };
    
    window.addEventListener('mousemove', trackDuringDrag, { capture: true });
    
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mousemove', trackDuringDrag, { capture: true });
    };
  }
  
  // Specifically detect playlist items and knobs
  function isSpecificInteractiveComponent(element: HTMLElement): boolean {
    // Check if it's a playlist item (li with cursor-pointer)
    if (element.tagName === 'LI' && element.classList.contains('cursor-pointer')) {
      return true;
    }
    
    // Check for Knob component (has cursor-ns-resize)
    if (element.classList.contains('cursor-ns-resize')) {
      return true;
    }
    
    // Check for specific data attributes used in Knob
    if (element.hasAttribute('data-label')) {
      return true;
    }
    
    // Check for playlist buttons
    if (element.closest('li.cursor-pointer') || 
        element.closest('[data-label]')) {
      return true;
    }
    
    return false;
  }
  
  // Check if a cursor style indicates interactivity
  function isInteractiveCursor(cursorStyle: string): boolean {
    return interactiveCursors.includes(cursorStyle) || 
           !defaultCursors.includes(cursorStyle);
  }
  
  // Improved function to check if an element or any of its parents is interactive
  function isElementInteractive(element: HTMLElement): boolean {
    // Fast path for specific components we know should be interactive
    if (isSpecificInteractiveComponent(element)) {
      return true;
    }
    
    // Start with the current element
    let currentElement: HTMLElement | null = element;
    
    // Walk up the DOM tree checking each element
    while (currentElement) {
      // Special check for playlist items and knobs
      if (isSpecificInteractiveComponent(currentElement)) {
        return true;
      }
      
      // Check computed style for cursor
      const computedStyle = window.getComputedStyle(currentElement);
      const cursorStyle = computedStyle.cursor;
      
      // Check if this element is interactive
      if (
        // Check for any interactive cursor style
        isInteractiveCursor(cursorStyle) ||
        // Check common interactive elements
        currentElement.tagName === 'BUTTON' || 
        currentElement.tagName === 'A' || 
        currentElement.tagName === 'INPUT' ||
        currentElement.tagName === 'SELECT' ||
        currentElement.tagName === 'TEXTAREA' ||
        // Check common attributes and classes
        currentElement.classList.contains('interactive') ||
        currentElement.getAttribute('role') === 'button' ||
        currentElement.hasAttribute('onclick') ||
        currentElement.hasAttribute('data-interactive')
      ) {
        return true;
      }
      
      // Move up to parent
      currentElement = currentElement.parentElement;
    }
    
    return false;
  }
  
  // Check if the cursor should be visible based on what element is being hovered
  function checkCursorVisibility(element: HTMLElement) {
    // Start with the target element
    let currentElement: HTMLElement | null = element;
    
    // Check if we're hovering over the waveform component
    let shouldHide = false;
    
    // Walk up the DOM tree to find the waveform component
    while (currentElement && !shouldHide) {
      // Check element ID
      if (hideCursorComponents.includes(currentElement.id)) {
        shouldHide = true;
        break;
      }
      
      // Check if it's a canvas within the waveform
      if (currentElement.tagName === 'CANVAS' && 
          currentElement.parentElement && 
          hideCursorComponents.some(id => currentElement?.parentElement?.id === id || 
                                   currentElement?.parentElement?.parentElement?.id === id)) {
        shouldHide = true;
        break;
      }
      
      // Move up to parent
      currentElement = currentElement.parentElement;
    }
    
    // Update cursor visibility
    isVisible = !shouldHide;
  }
  
  function disableAllNativeCursors() {
    if (!browser) return;
    
    // Create a style element
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        cursor: none !important;
      }
    `;
    
    // Add it to the document
    document.head.appendChild(style);
    
    return () => {
      // Clean up function
      document.head.removeChild(style);
    };
  }
  
  // Mark all interactive elements with data-interactive attribute
  function markInteractiveElements() {
    if (!browser) return;
    
    // Get all potentially interactive elements
    const interactiveSelectors = [
      'button', 
      'a', 
      '[role="button"]', 
      'input', 
      'select', 
      'textarea',
      '.btn',
      '[onclick]',
      // Elements that typically have cursor: pointer
      'label[for]',
      '.clickable',
      'summary',
      '.nav-item',
      '.link',
      '.menu-item',
      // Specifically target the knob and playlist elements
      '.cursor-ns-resize',
      'li.cursor-pointer',
      '[data-label]'
    ];
    
    const elements = document.querySelectorAll(interactiveSelectors.join(','));
    
    // Mark them all
    elements.forEach(el => {
      el.setAttribute('data-interactive', 'true');
      
      // Also mark immediate children as interactive to handle nested content
      Array.from(el.children).forEach(child => {
        (child as HTMLElement).setAttribute('data-interactive', 'true');
      });
    });
    
    // Scan for elements with any non-default cursor in their computed style
    document.querySelectorAll('*').forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        if (isInteractiveCursor(style.cursor)) {
          el.setAttribute('data-interactive', 'true');
          
          // Also mark immediate children
          Array.from(el.children).forEach(child => {
            (child as HTMLElement).setAttribute('data-interactive', 'true');
          });
        }
      } catch (e) {
        // Ignore errors from inaccessible elements
      }
    });
  }
  
  onMount(() => {
    if (browser) {
      // Hide all native cursors
      const removeStyles = disableAllNativeCursors();
      
      // Add event listener
      window.addEventListener('mousemove', handleMouseMove);
      
      // Add global event listeners for dragging
      const removeGlobalListeners = addGlobalListeners();
      
      // Mark interactive elements initially
      markInteractiveElements();
      
      // Start trail animation
      animationFrameId = requestAnimationFrame(updateTrailPositions);
      
      // And periodically to catch dynamic elements
      const intervalId = setInterval(markInteractiveElements, 2000);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (removeStyles) removeStyles();
        if (removeGlobalListeners) removeGlobalListeners();
        cancelAnimationFrame(animationFrameId);
        clearInterval(intervalId);
      };
    }
  });
  
  onDestroy(() => {
    if (browser) {
      // Restore default cursor
      document.body.style.cursor = 'auto';
      
      // Cancel animation
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }
  });
  
  // Use accent color directly
  $: cursorColor = theme.accent;
</script>

{#if browser && isVisible}
<div 
  class="cursor-container"
  style="
    left: {mouseX}px; 
    top: {mouseY}px;
  "
>
  <!-- Trail elements that follow behind the cursor -->
  {#each trails as trail, i (i + '-' + forceUpdateCounter)}
    <div 
      class="cursor-trail"
      style="
        --cursor-color: {cursorColor};
        --trail-scale: {trail.scale};
        left: {trail.x - mouseX}px;
        top: {trail.y - mouseY}px;
      "
    ></div>
  {/each}
  
  <!-- Rotating outline square with enter/exit animations -->
  <div class="cursor-outline-wrapper" class:active={isHovering}>
    <div 
      class="cursor-outline"
      class:dragging={globalDragging}
      style="--cursor-color: {cursorColor};"
    ></div>
  </div>
  
  <!-- Main cursor point - always visible -->
  <div 
    class="cursor-point"
    class:dragging={globalDragging}
    style="--cursor-color: {cursorColor};"
  ></div>
</div>
{/if}

<style>
  .cursor-container {
    position: fixed;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
  }
  
  /* Wrapper for the outline square to handle scaling */
  .cursor-outline-wrapper {
    position: absolute;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
    pointer-events: none;
  }
  
  /* Active state when hovering */
  .cursor-outline-wrapper.active {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  
  /* The actual outline square that rotates */
  .cursor-outline {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 1px solid var(--cursor-color);
    background-color: transparent;
    transform: translate(-50%, -50%);
    animation: rotate 4s linear infinite;
  }
  
  @keyframes rotate {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  
  /* Main cursor point - always visible */
  .cursor-point {
    position: absolute;
    width: 6px;
    height: 6px;
    background-color: var(--cursor-color);
    transform: translate(-50%, -50%);
    transition: width 0.2s ease, height 0.2s ease;
  }
  
  .cursor-point.dragging {
    width: 8px;
    height: 8px;
  }
  
  /* Trail styling - smaller filled squares */
  .cursor-trail {
    position: absolute;
    width: calc(6px * var(--trail-scale, 1));
    height: calc(6px * var(--trail-scale, 1));
    background-color: var(--cursor-color);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
</style> 