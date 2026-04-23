// Moat Chrome Extension - Content Script
(function() {
  const DEBUG = false;

  let commentMode = false;
  let hoveredElement = null;
  let commentBox = null;
  let highlightedElement = null;
  let projectRoot = null;
  let markdownFileHandle = null; // Handle for moat-tasks.md

  // Drawing mode state (for free-form rectangle tool)
  let drawingMode = false;
  let drawingTool = null; // Current active tool ('rectangle', 'arrow', etc.)
  let drawingCanvas = null; // Canvas overlay element
  let drawingCtx = null; // Canvas 2D context
  let isDrawing = false; // Whether currently drawing
  let drawStartX = 0;
  let drawStartY = 0;
  let currentRect = null; // Current rectangle being drawn {x, y, width, height}

  // Drawing tools registry (extensible for future tools)
  const drawingTools = {
    rectangle: {
      name: 'rectangle',
      cursor: 'crosshair',
      draw: function(ctx, x, y, width, height) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
        ctx.fillRect(x, y, width, height);
      }
    }
    // Future tools can be added here:
    // arrow: { ... },
    // connector: { ... }
  };

  // Generate unique session ID
  const sessionId = `moat-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Import utility modules (added for Task 2.1)
  let taskStore = null;
  let markdownGenerator = null;

  // Initialize utility modules
  let migrator = null; // Task 4.6: Migration system

  function initializeUtilities() {
    if (DEBUG) console.log(' Initializing TaskStore and MarkdownGenerator utilities...');
    if (DEBUG) console.log(' window.MoatTaskStore available:', !!window.MoatTaskStore);
    if (DEBUG) console.log(' window.MoatMarkdownGenerator available:', !!window.MoatMarkdownGenerator);
    if (DEBUG) console.log(' window.directoryHandle available:', !!window.directoryHandle);
    
    // Initialize TaskStore
    if (window.MoatTaskStore) {
      try {
        taskStore = new window.MoatTaskStore.TaskStore();
        
        // Initialize TaskStore with directory handle if available
        if (window.directoryHandle) {
          taskStore.initialize(window.directoryHandle);
          if (DEBUG) console.log(' TaskStore initialized with directory handle');
        } else {
      console.error('New task system not available');
    }
    
    if (DEBUG) console.log(' ===== ANNOTATION PROCESSING COMPLETE =====');
  }

  // Get user-friendly element label
  function getElementLabel(element) {
    const tagName = element.tagName.toLowerCase();
    
    // For links
    if (tagName === 'a') {
      const text = element.textContent.trim();
      return text ? `Link: ${text}` : 'Link';
    }
    
    // For buttons
    if (tagName === 'button' || element.type === 'button') {
      const text = element.textContent.trim();
      return text ? `Button: ${text}` : 'Button';
    }
    
    // For inputs
    if (tagName === 'input') {
      const type = element.type || 'text';
      const placeholder = element.placeholder;
      const label = element.getAttribute('aria-label') || placeholder;
      return label ? `Input (${type}): ${label}` : `Input (${type})`;
    }
    
    // For images
    if (tagName === 'img') {
      const alt = element.alt;
      return alt ? `Image: ${alt}` : 'Image';
    }
    
    // For divs and containers
    if (tagName === 'div' || tagName === 'section' || tagName === 'article' || tagName === 'main') {
      const role = element.getAttribute('role');
      const ariaLabel = element.getAttribute('aria-label');
      const id = element.id;
      
      if (role) return `Container (${role})`;
      if (ariaLabel) return `Container: ${ariaLabel}`;
      if (id) return `Container #${id}`;
      
      // Check for common class patterns
      const classes = element.className.split(' ').filter(c => c && !c.startsWith('moat-'));
      if (classes.includes('header')) return 'Header Container';
      if (classes.includes('footer')) return 'Footer Container';
      if (classes.includes('sidebar')) return 'Sidebar Container';
      if (classes.includes('nav') || classes.includes('navigation')) return 'Navigation Container';
      if (classes.includes('content') || classes.includes('main')) return 'Main Container';
      
      // If it has background color or image, label it as such
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.backgroundImage !== 'none') return 'Background Container';
      if (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
          computedStyle.backgroundColor !== 'transparent') return 'Colored Container';
      
      return 'Container';
    }
    
    // For lists
    if (tagName === 'ul' || tagName === 'ol') {
      return 'List';
    }
    
    if (tagName === 'li') {
      const text = element.textContent.trim().substring(0, 20);
      return text ? `List Item: ${text}${text.length > 20 ? '...' : ''}` : 'List Item';
    }
    
    // For elements with aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `${tagName}: ${ariaLabel}`;
    }
    
    // For elements with text content
    const text = element.textContent.trim().substring(0, 30);
    if (text) {
      return `${tagName}: ${text}${text.length > 30 ? '...' : ''}`;
    }
    
    // Default - capitalize tag name
    return tagName.charAt(0).toUpperCase() + tagName.slice(1);
  }

  // Get CSS selector for element
  function getSelector(element) {
    // First, check for ID
    if (element.id) {
      return `#${element.id}`;
    }
    
    const tagName = element.tagName.toLowerCase();
    
    // For links, try href attribute
    if (tagName === 'a' && element.href) {
      const href = element.getAttribute('href');
      if (href && href !== '#') {
        return `a[href="${href}"]`;
      }
    }
    
    // Check for unique attributes
    const uniqueAttributes = ['data-testid', 'data-id', 'data-component', 'aria-label', 'name', 'role'];
    for (const attr of uniqueAttributes) {
      const value = element.getAttribute(attr);
      if (value) {
        return `${tagName}[${attr}="${value}"]`;
      }
    }
    
    // For buttons/inputs with specific text
    if (tagName === 'button') {
      const text = element.textContent.trim();
      if (text && document.querySelectorAll(`button`).length > 1) {
        // Use nth-of-type to be more specific
        const parent = element.parentElement;
        const buttons = Array.from(parent.querySelectorAll('button'));
        const index = buttons.indexOf(element) + 1;
        if (index > 0) {
          return `${getSelector(parent)} > button:nth-of-type(${index})`;
        }
      }
    }
    
    // Build path-based selector
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // Skip if we hit an element with ID
      if (current.id) {
        path.unshift(`#${current.id}`);
        break;
      }
      
      // For containers, try to use semantic selectors
      if (selector === 'div' || selector === 'section' || selector === 'article') {
        const role = current.getAttribute('role');
        const dataTestId = current.getAttribute('data-testid');
        
        if (role) {
          selector = `${selector}[role="${role}"]`;
        } else if (dataTestId) {
          selector = `${selector}[data-testid="${dataTestId}"]`;
        } else {
          // Add classes (but filter out moat classes and common utility classes)
          if (current.className && typeof current.className === 'string') {
            const classes = current.className
              .split(' ')
              .filter(c => c && !c.startsWith('moat-') && !c.match(/^(w-|h-|p-|m-|flex|grid|block|inline)/))
              .slice(0, 2); // Only use first 2 meaningful classes
            
            if (classes.length > 0) {
              selector += `.${classes.join('.')}`;
            }
          }
        }
      } else {
        // For non-containers, add classes
        if (current.className && typeof current.className === 'string') {
          const classes = current.className
            .split(' ')
            .filter(c => c && !c.startsWith('moat-'))
            .slice(0, 2);
          
          if (classes.length > 0) {
            selector += `.${classes.join('.')}`;
          }
        }
      }
      
      // Add nth-child if needed
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const index = siblings.indexOf(current) + 1;
        
        // Only add nth-child if there are multiple siblings of same type
        const sameTags = siblings.filter(s => s.tagName === current.tagName);
        if (sameTags.length > 1) {
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    // Return the path, limited to last 3 elements for brevity
    return path.slice(-3).join(' > ');
  }

  // Validate selector returns exactly one element
  function validateSelector(selector, targetElement) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 1 && elements[0] === targetElement) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Get enhanced element context
  function getElementContext(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      text: element.textContent.trim().substring(0, 100),
      href: element.href || null,
      type: element.type || null,
      ariaLabel: element.getAttribute('aria-label') || null,
      dataTestId: element.getAttribute('data-testid') || null,
      className: element.className && typeof element.className === 'string' 
        ? element.className.split(' ').filter(c => c && !c.startsWith('moat-')).join(' ')
        : null
    };
  }

  // Create comment input box
  async function createCommentBox(element, x, y) {
    // If comment box already exists, shake it instead of creating new one
    if (commentBox) {
      shakeCommentBox();
      return;
    }
    
    // Use the existing hover overlay for screenshot (already in DOM and positioned)
    // No need to create a new one - just wait a moment to ensure it's rendered
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Capture screenshot with the highlight visible
    let screenshotData = null;
    try {
      const rect = element.getBoundingClientRect();
      const padding = 100;
      
      // Calculate capture area in viewport coordinates
      const captureX = Math.max(0, rect.x - padding);
      const captureY = Math.max(0, rect.y - padding);
      const captureWidth = Math.min(rect.width + (padding * 2), window.innerWidth - captureX);
      const captureHeight = Math.min(rect.height + (padding * 2), window.innerHeight - captureY);
      
      console.log('📸 Capturing element screenshot at:', {
        element: element.tagName,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        captureArea: { x: captureX, y: captureY, w: captureWidth, h: captureHeight }
      });
      
      screenshotData = await captureScreenshotNative({
        x: captureX,
        y: captureY,
        width: captureWidth,
        height: captureHeight
      }, padding);
      
      if (screenshotData) {
        console.log('✅ Screenshot captured successfully');
      }
    } catch (e) {
      console.warn('Screenshot capture failed:', e);
    }
    
    // Keep the DOM overlay visible while user is commenting
    // Don't remove it - just store reference
    
    commentBox = document.createElement('div');
    commentBox.className = 'float-comment-box';
    commentBox.screenshotData = screenshotData; // Store for later use
    commentBox.highlightedElement = element; // Store element reference
    commentBox.highlightOverlay = hoverOverlay; // Store overlay reference for cleanup
    commentBox.innerHTML = `
      <textarea 
        class="float-comment-input" 
        placeholder="What needs to be fixed?"
        autofocus
      ></textarea>
      <div class="float-comment-actions">
        <button class="float-comment-cancel">Cancel</button>
        <button class="float-comment-submit">Submit (Enter)</button>
      </div>
    `;
    
    // Append to shadow root for CSS isolation (if available), otherwise fallback to body
    const container = window.moatShadowRoot || document.body;
    container.appendChild(commentBox);
    
    // Position near cursor (using actual click coordinates)
    const boxWidth = 320;
    const boxHeight = 120; // Approximate height
    const padding = 10;
    
    // Calculate optimal position near cursor
    let left = x + padding;
    let top = y + padding;
    
    // Ensure comment box stays within viewport boundaries
    // Check right edge
    if (left + boxWidth > window.innerWidth) {
      left = x - boxWidth - padding; // Position to the left of cursor
    }
    
    // Check bottom edge
    if (top + boxHeight > window.innerHeight) {
      top = y - boxHeight - padding; // Position above cursor
    }
    
    // Check left edge (in case cursor is very close to left)
    if (left < padding) {
      left = padding;
    }
    
    // Check top edge (in case cursor is very close to top)
    if (top < padding) {
      top = padding;
    }
    
    // Apply position
    commentBox.style.left = `${left}px`;
    commentBox.style.top = `${top}px`;
    
    // Final adjustment after measuring actual box dimensions
    const boxRect = commentBox.getBoundingClientRect();
    if (boxRect.right > window.innerWidth) {
      commentBox.style.left = `${window.innerWidth - boxRect.width - padding}px`;
    }
    if (boxRect.bottom > window.innerHeight) {
      commentBox.style.top = `${window.innerHeight - boxRect.height - padding}px`;
    }
    
    const textarea = commentBox.querySelector('textarea');
    const submitBtn = commentBox.querySelector('.float-comment-submit');
    const cancelBtn = commentBox.querySelector('.float-comment-cancel');
    
    // Focus textarea
    setTimeout(() => textarea.focus(), 50);
    
    // Handle submit
    const handleSubmit = async () => {
      const content = textarea.value.trim();
      if (!content) return;
      
      const rect = element.getBoundingClientRect();
      const selector = getSelector(element);
      
      // Validate selector
      if (!validateSelector(selector, element)) {
        console.warn('Moat: Selector validation failed, using fallback');
      }
      
      // Calculate click position relative to element (for thumbnail centering)
      const clickX = x - rect.x;
      const clickY = y - rect.y;
      
      // Create annotation object
      const annotation = {
        type: "user_message",
        role: "user",
        content: content,
        target: selector,
        elementLabel: getElementLabel(element),
        elementContext: getElementContext(element),
        selectorMethod: "querySelector",
        boundingRect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        clickPosition: {
          x: Math.round(clickX),
          y: Math.round(clickY),
          elementWidth: Math.round(rect.width),
          elementHeight: Math.round(rect.height)
        },
        pageUrl: window.location.href,
        timestamp: Date.now(),
        sessionId: sessionId,
        status: "to do",
        id: `moat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Use pre-captured screenshot (captured when comment box was created)
      if (commentBox.screenshotData) {
        annotation.screenshot = commentBox.screenshotData.dataUrl;
        annotation.screenshotViewport = commentBox.screenshotData.viewport;
        if (DEBUG) console.log(' Using pre-captured screenshot with visible highlight');
      } else {
        console.log('⚠️ Moat: No pre-captured screenshot available');
      }
      
      // Remove DOM overlay after submission
      if (commentBox.highlightOverlay) {
        commentBox.highlightOverlay.remove();
        hoverOverlay = null;
      }
      
      addToQueue(annotation);
      exitCommentMode();
    };
    
    // Event listeners
    submitBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', exitCommentMode);
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        exitCommentMode();
      }
    });
  }

  // Shake comment box to indicate it's already open
  function shakeCommentBox() {
    if (!commentBox) return;
    
    commentBox.classList.add('float-shake');
    setTimeout(() => {
      commentBox.classList.remove('float-shake');
    }, 500);
    
    // Also focus the textarea
    const textarea = commentBox.querySelector('textarea');
    if (textarea) textarea.focus();
  }

  // Remove comment box
  function removeCommentBox() {
    if (commentBox) {
      commentBox.remove();
      commentBox = null;
    }
  }

  // Enter comment mode
  function enterCommentMode() {
    commentMode = true;
    document.body.classList.add('float-comment-mode');
  }

  // Exit comment mode
  function exitCommentMode() {
    commentMode = false;
    document.body.classList.remove('float-comment-mode');
    
    // Remove DOM overlay from the element
    if (commentBox && commentBox.highlightOverlay) {
      commentBox.highlightOverlay.remove();
      hoverOverlay = null;
    }
    
    removeCommentBox();
    removeHighlight();
  }

  // Create canvas overlay for drawing
  function createDrawingCanvas() {
    if (drawingCanvas) return; // Already exists
    
    drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'float-drawing-canvas';
    drawingCanvas.className = 'float-drawing-canvas';
    drawingCanvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
      background: transparent;
    `;
    
    // Set canvas size
    drawingCanvas.width = window.innerWidth;
    drawingCanvas.height = window.innerHeight;
    
    drawingCtx = drawingCanvas.getContext('2d');
    
    const container = window.moatShadowRoot || document.body;
    container.appendChild(drawingCanvas);
    
    // Set up mouse handlers
    setupDrawingHandlers();
    
    // Update canvas size on resize
    window.addEventListener('resize', updateCanvasSize);
  }

  // Update canvas size on window resize
  function updateCanvasSize() {
    if (!drawingCanvas) return;
    drawingCanvas.width = window.innerWidth;
    drawingCanvas.height = window.innerHeight;
  }

  // Remove canvas overlay
  function removeDrawingCanvas() {
    if (drawingCanvas) {
      window.removeEventListener('resize', updateCanvasSize);
      removeDrawingHandlers();
      drawingCanvas.remove();
      drawingCanvas = null;
      drawingCtx = null;
    }
  }

  // Enter drawing mode
  function enterDrawingMode(toolName = 'rectangle') {
    if (drawingMode) return; // Already in drawing mode
    
    // Exit comment mode if active
    if (commentMode) {
      exitCommentMode();
    }
    
    drawingMode = true;
    drawingTool = toolName;
    
    // Create canvas overlay
    createDrawingCanvas();
    
    // Enable pointer events on canvas when drawing
    if (drawingCanvas) {
      drawingCanvas.style.pointerEvents = 'auto';
    }
    
    // Add drawing mode class for cursor styling
    document.body.classList.add('float-drawing-mode');
    
    console.log(`🎨 Entered drawing mode with tool: ${toolName}`);
  }

  // Exit drawing mode
  function exitDrawingMode() {
    if (!drawingMode) return;
    
    drawingMode = false;
    drawingTool = null;
    isDrawing = false;
    currentRect = null;
    
    // Clear canvas
    if (drawingCtx && drawingCanvas) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    
    // Disable pointer events
    if (drawingCanvas) {
      drawingCanvas.style.pointerEvents = 'none';
    }
    
    // Remove drawing mode class
    document.body.classList.remove('float-drawing-mode');
    
    // Remove canvas overlay (optional - can keep it for performance)
    // removeDrawingCanvas();
    
    console.log('🎨 Exited drawing mode');
  }

  // Create comment box for freeform rectangle
  async function createFreeformCommentBox(rectangleData, x, y) {
    // If comment box already exists, shake it instead of creating new one
    if (commentBox) {
      shakeCommentBox();
      return;
    }
    
    // Capture screenshot with rectangle drawn on canvas
    let screenshotData = null;
    try {
      // Draw final rectangle on canvas before capture (ensure it's visible)
      if (drawingCtx && drawingTool) {
        const tool = drawingTools[drawingTool];
        if (tool && tool.draw) {
          tool.draw(drawingCtx, rectangleData.x, rectangleData.y, rectangleData.width, rectangleData.height);
        }
      }
      
      // Brief delay to ensure canvas is rendered before capture
      await new Promise(resolve => setTimeout(resolve, 16));
      
      // Calculate capture area in viewport coordinates
      const padding = 100;
      const captureX = Math.max(0, rectangleData.x - padding);
      const captureY = Math.max(0, rectangleData.y - padding);
      const captureWidth = Math.min(rectangleData.width + (padding * 2), window.innerWidth - captureX);
      const captureHeight = Math.min(rectangleData.height + (padding * 2), window.innerHeight - captureY);
      
      console.log('📸 Capturing rectangle screenshot at:', {
        rect: rectangleData,
        captureArea: { x: captureX, y: captureY, w: captureWidth, h: captureHeight }
      });
      
      screenshotData = await captureScreenshotNative({
        x: captureX,
        y: captureY,
        width: captureWidth,
        height: captureHeight
      }, padding);
      
      if (screenshotData) {
        console.log('✅ Screenshot captured with rectangle');
      }
    } catch (e) {
      console.warn('Screenshot capture failed:', e);
    }
    
    // Create comment box
    commentBox = document.createElement('div');
    commentBox.className = 'float-comment-box';
    commentBox.screenshotData = screenshotData;
    commentBox.rectangleData = rectangleData; // Store rectangle data
    commentBox.innerHTML = `
      <textarea 
        class="float-comment-input" 
        placeholder="What needs to be fixed?"
        autofocus
      ></textarea>
      <div class="float-comment-actions">
        <button class="float-comment-cancel">Cancel</button>
        <button class="float-comment-submit">Submit (Enter)</button>
      </div>
    `;
    
    // Append to shadow root for CSS isolation (if available), otherwise fallback to body
    const container = window.moatShadowRoot || document.body;
    container.appendChild(commentBox);
    
    // Position near cursor (using actual mouse coordinates)
    const boxWidth = 320;
    const boxHeight = 120; // Approximate height
    const padding = 10;
    
    // Calculate optimal position near cursor
    let left = x + padding;
    let top = y + padding;
    
    // Ensure comment box stays within viewport boundaries
    if (left + boxWidth > window.innerWidth) {
      left = x - boxWidth - padding;
    }
    if (top + boxHeight > window.innerHeight) {
      top = y - boxHeight - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top < padding) {
      top = padding;
    }
    
    // Apply position
    commentBox.style.left = `${left}px`;
    commentBox.style.top = `${top}px`;
    
    // Final adjustment after measuring actual box dimensions
    const boxRect = commentBox.getBoundingClientRect();
    if (boxRect.right > window.innerWidth) {
      commentBox.style.left = `${window.innerWidth - boxRect.width - padding}px`;
    }
    if (boxRect.bottom > window.innerHeight) {
      commentBox.style.top = `${window.innerHeight - boxRect.height - padding}px`;
    }
    
    const textarea = commentBox.querySelector('textarea');
    const submitBtn = commentBox.querySelector('.float-comment-submit');
    const cancelBtn = commentBox.querySelector('.float-comment-cancel');
    
    // Focus textarea
    setTimeout(() => textarea.focus(), 50);
    
    // Handle submit
    const handleSubmit = async () => {
      const content = textarea.value.trim();
      if (!content) return;
      
      // Get rectangle data from comment box
      const rectData = commentBox.rectangleData;
      
      // Create annotation object with freeform rectangle data
      const annotation = {
        type: "user_message",
        role: "user",
        content: content,
        target: null, // No element selector for freeform
        selectorMethod: "freeform",
        boundingRect: {
          x: Math.round(rectData.x),
          y: Math.round(rectData.y),
          w: Math.round(rectData.width),
          h: Math.round(rectData.height)
        },
        // Include all bounding box formats
        boundingBox: {
          xyxy: rectData.xyxy,
          xywh: {
            x: rectData.x,
            y: rectData.y,
            width: rectData.width,
            height: rectData.height
          },
          normalized: rectData.normalized,
          viewport: rectData.viewport,
          type: rectData.type
        },
        pageUrl: window.location.href,
        timestamp: Date.now(),
        sessionId: sessionId,
        status: "to do",
        id: `moat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Use pre-captured screenshot
      if (commentBox.screenshotData) {
        annotation.screenshot = commentBox.screenshotData.dataUrl;
        annotation.screenshotViewport = commentBox.screenshotData.viewport;
        if (DEBUG) console.log(' Using pre-captured screenshot with rectangle');
      }
      
      // Clear canvas after submission
      if (drawingCtx && drawingCanvas) {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      }
      
      // Clean up drawing mode completely
      exitDrawingMode();
      removeDrawingCanvas();
      
      addToQueue(annotation);
      removeCommentBox();
    };
    
    // Event listeners
    submitBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', () => {
      // Clear canvas and exit drawing mode
      if (drawingCtx && drawingCanvas) {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      }
      exitDrawingMode();
      removeDrawingCanvas();
      removeCommentBox();
    });
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        // Clear canvas and exit drawing mode
        if (drawingCtx && drawingCanvas) {
          drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        }
        exitDrawingMode();
        removeDrawingCanvas();
        removeCommentBox();
      }
    });
  }

  // Global hover overlay element
  let hoverOverlay = null;

  // Highlight element on hover with DOM overlay
  function highlightElement(element) {
    removeHighlight();
    highlightedElement = element;
    
    // Create overlay div for both hover and click
    const rect = element.getBoundingClientRect();
    hoverOverlay = document.createElement('div');
    hoverOverlay.className = 'float-hover-overlay';
    hoverOverlay.style.cssText = `
      position: absolute;
      left: ${rect.x + window.scrollX}px;
      top: ${rect.y + window.scrollY}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid #3B82F6;
      border-radius: 4px;
      background-color: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 9998;
      box-sizing: border-box;
    `;
    document.body.appendChild(hoverOverlay);
  }

  // Remove highlight
  function removeHighlight() {
    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
    highlightedElement = null;
  }

  // Export annotations
  function exportAnnotations() {
    const queue = JSON.parse(localStorage.getItem('moat.queue') || '[]');
    const exportData = {
      version: '1.0.0',
      sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      protocol: 'file',
      annotations: queue
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moat-annotations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`Exported ${queue.length} annotations`);
  }

  // Mouse move handler
  document.addEventListener('mousemove', (e) => {
    if (!commentMode || commentBox) return; // Don't highlight if comment box is open
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    
    // Skip if element is the shadow host (moat UI container)
    if (element && element.id === 'moat-shadow-host') {
      return;
    }
    
    // Use composedPath() to properly detect if hovering over Shadow DOM elements
    const path = e.composedPath();
    const hoveringOverMoatUI = path.some(el => 
      el.classList && (
        el.classList.contains('float-moat') || 
        el.classList.contains('float-comment-box')
      )
    );
    
    if (element && element !== hoveredElement && !hoveringOverMoatUI) {
      hoveredElement = element;
      highlightElement(element);
    }
  });

  // Drawing mode mouse handlers
  function setupDrawingHandlers() {
    if (!drawingCanvas) return;
    
    // Mouse down - start drawing
    drawingCanvas.addEventListener('mousedown', handleDrawingMouseDown, true);
    
    // Mouse move - update preview
    drawingCanvas.addEventListener('mousemove', handleDrawingMouseMove, true);
    
    // Mouse up - finalize rectangle
    drawingCanvas.addEventListener('mouseup', handleDrawingMouseUp, true);
    
    // Mouse leave - cancel drawing if mouse leaves canvas
    drawingCanvas.addEventListener('mouseleave', handleDrawingMouseLeave, true);
  }

  function removeDrawingHandlers() {
    if (!drawingCanvas) return;
    
    drawingCanvas.removeEventListener('mousedown', handleDrawingMouseDown, true);
    drawingCanvas.removeEventListener('mousemove', handleDrawingMouseMove, true);
    drawingCanvas.removeEventListener('mouseup', handleDrawingMouseUp, true);
    drawingCanvas.removeEventListener('mouseleave', handleDrawingMouseLeave, true);
  }

  function handleDrawingMouseDown(e) {
    if (!drawingMode || !drawingTool) return;
    
    // Check if clicking on Moat UI elements
    const path = e.composedPath();
    const clickingOnMoatUI = path.some(el => 
      el.classList && (
        el.classList.contains('float-moat') || 
        el.classList.contains('float-comment-box') ||
        el.id === 'moat-shadow-host'
      )
    );
    
    if (clickingOnMoatUI) {
      return; // Don't start drawing if clicking on Moat UI
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    isDrawing = true;
    
    // Get coordinates relative to viewport (clientX/Y already accounts for scroll)
    drawStartX = e.clientX;
    drawStartY = e.clientY;
    
    currentRect = {
      x: drawStartX,
      y: drawStartY,
      width: 0,
      height: 0
    };
    
    console.log('🎨 Started drawing at:', drawStartX, drawStartY);
  }

  function handleDrawingMouseMove(e) {
    if (!drawingMode || !isDrawing || !drawingTool) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate current rectangle (clientX/Y is viewport-relative)
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    currentRect = {
      x: Math.min(drawStartX, currentX),
      y: Math.min(drawStartY, currentY),
      width: Math.abs(currentX - drawStartX),
      height: Math.abs(currentY - drawStartY)
    };
    
    // Redraw canvas with preview
    redrawCanvas();
  }

  function handleDrawingMouseUp(e) {
    if (!drawingMode || !isDrawing || !drawingTool) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Finalize rectangle
    if (currentRect && currentRect.width > 5 && currentRect.height > 5) {
      // Rectangle is large enough, show comment box
      finalizeRectangle(e.clientX, e.clientY);
    } else {
      // Rectangle too small, cancel
      cancelDrawing();
    }
  }

  function handleDrawingMouseLeave(e) {
    if (!drawingMode || !isDrawing) return;
    
    // Cancel drawing if mouse leaves canvas
    cancelDrawing();
  }

  function redrawCanvas() {
    if (!drawingCtx || !drawingCanvas || !currentRect) return;
    
    // Clear canvas
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    // Draw current rectangle preview
    const tool = drawingTools[drawingTool];
    if (tool && tool.draw) {
      tool.draw(drawingCtx, currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  }

  function cancelDrawing() {
    isDrawing = false;
    currentRect = null;
    
    // Clear canvas
    if (drawingCtx && drawingCanvas) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
  }

  function finalizeRectangle(mouseX, mouseY) {
    if (!currentRect || !drawingTool) return;
    
    const rect = currentRect;
    isDrawing = false;
    
    // Store rectangle data for screenshot capture
    // Note: rect coordinates are viewport-relative (clientX/Y), which is correct for canvas overlay
    const rectangleData = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      // Calculate normalized coordinates (0-1)
      normalized: {
        x: rect.x / window.innerWidth,
        y: rect.y / window.innerHeight,
        width: rect.width / window.innerWidth,
        height: rect.height / window.innerHeight
      },
      // Calculate xyxy format (x1, y1, x2, y2)
      xyxy: {
        x1: rect.x,
        y1: rect.y,
        x2: rect.x + rect.width,
        y2: rect.y + rect.height
      },
      // Calculate xywh format (x, y, width, height) - same as base but explicit
      xywh: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      // Viewport info
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      type: 'freeform'
    };
    
    console.log('🎨 Finalized rectangle:', rectangleData);
    
    // Exit drawing mode (but keep canvas visible for screenshot)
    drawingMode = false;
    drawingTool = null;
    document.body.classList.remove('float-drawing-mode');
    
    // Show comment box at cursor position
    createFreeformCommentBox(rectangleData, mouseX, mouseY);
  }

  // Click handler
  document.addEventListener('click', (e) => {
    if (!commentMode) return;
    
    // Use composedPath() to properly detect clicks inside Shadow DOM
    // This is necessary because e.target gets retargeted to the shadow host
    // when events bubble out of Shadow DOM, breaking .closest() checks
    const path = e.composedPath();
    const clickedInsideMoatUI = path.some(el => 
      el.classList && (
        el.classList.contains('float-moat') || 
        el.classList.contains('float-comment-box')
      )
    );
    
    if (clickedInsideMoatUI) {
      return;
    }
    
    // Also check for shadow host directly (fallback safety check)
    const element = e.target;
    if (element.id === 'moat-shadow-host') {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    createCommentBox(element, e.clientX, e.clientY);
  }, true);

  // Global variables for new notification system
  let hasPressedC = false;
  let initialNotificationShown = false;

  // Listen for keyboard events
  document.addEventListener('keydown', (e) => {
    // Exit drawing mode with Escape
    if (e.key === 'Escape' && drawingMode) {
      e.preventDefault();
      exitDrawingMode();
      // Clean up canvas overlay when exiting via Esc
      removeDrawingCanvas();
      return;
    }
    
    // Exit comment mode with Escape (works on all tabs, even if not visible)
    if (e.key === 'Escape' && commentMode) {
      e.preventDefault();
      exitCommentMode();
      return;
    }
    
    // Don't process keyboard shortcuts if in input fields
    if (e.target.matches('input, textarea')) {
      return;
    }
    
    // Check if sidebar is visible (for C key)
    const sidebarVisible = window.Moat && window.Moat.isSidebarVisible ? window.Moat.isSidebarVisible() : false;
    const canUseShortcuts = !document.hidden && sidebarVisible;
    
    // Check if user has started interacting (can't switch tools once started)
    // - If commentBox exists, they've started/finished a comment or drawing
    // - If isDrawing is true, they're actively drawing a rectangle
    const hasStartedComment = commentBox !== null;
    const hasStartedDrawing = isDrawing === true;
    const canSwitchTools = !hasStartedComment && !hasStartedDrawing;
    
    // Toggle between Comment and Rectangle modes with C and R keys
    if ((e.key === 'R' || e.key === 'r') && canSwitchTools && canUseShortcuts) {
      e.preventDefault();
      
      if (commentMode) {
        // Switch from comment mode to rectangle mode
        exitCommentMode();
        enterDrawingMode('rectangle');
        showNotification('Switched to Rectangle tool', 'info');
      } else if (!drawingMode) {
        // Enter rectangle mode (not switching, just entering)
        enterDrawingMode('rectangle');
      }
      return;
    }
    
    // 'C' key should ONLY work when sidebar is visible on the active tab
    if ((e.key === 'C' || e.key === 'c') && canSwitchTools && canUseShortcuts) {
      e.preventDefault();
      
      if (drawingMode) {
        // Switch from drawing mode to comment mode
        exitDrawingMode();
        // Dispatch event to remove persistent notification
        window.dispatchEvent(new CustomEvent('moat:c-key-pressed'));
        
        // Mark that C has been pressed
        if (!hasPressedC) {
          hasPressedC = true;
        }
        
        enterCommentMode();
        showNotification('Switched to Comment tool', 'info');
      } else if (!commentMode) {
        // Enter comment mode (not switching, just entering)
        // Dispatch event to remove persistent notification
        window.dispatchEvent(new CustomEvent('moat:c-key-pressed'));
        
        // Mark that C has been pressed
        if (!hasPressedC) {
          hasPressedC = true;
          // Show the click instruction notification
          showNotification('Click anywhere to comment', 'info', 'click-instruction');
        }
        
        enterCommentMode();
      }
      return;
    }
    
    // Export annotations with Cmd+Shift+E
    if (e.key === 'e' && e.metaKey && e.shiftKey) {
      e.preventDefault();
      exportAnnotations();
    }
    
    // Connect to project with Cmd+Shift+P
    if (e.key === 'p' && e.metaKey && e.shiftKey) {
      e.preventDefault();
      setupProject();
    }
    
    // Bridge command detection (when not in input fields)
    if (!e.target.matches('input, textarea, [contenteditable]')) {
      // Bridge command sequence detection
      let bridgeSequence = window.bridgeSequence || '';
      let bridgeTimeout = window.bridgeTimeout || null;
      
      // Clear timeout if exists
      if (bridgeTimeout) {
        clearTimeout(bridgeTimeout);
      }
      
      // Add to sequence
      bridgeSequence += e.key.toLowerCase();
      
      // Check if sequence contains "bridge"
      if (bridgeSequence.includes('bridge')) {
        e.preventDefault();
        console.log('🌉 Bridge command detected! Processing tasks...');
        processToDoTasks();
        bridgeSequence = '';
        window.bridgeSequence = bridgeSequence;
        return;
      }
      
      // Reset sequence after 2 seconds
      bridgeTimeout = setTimeout(() => {
        bridgeSequence = '';
        window.bridgeSequence = bridgeSequence;
      }, 2000);
      
      // Keep sequence manageable
      if (bridgeSequence.length > 10) {
        bridgeSequence = bridgeSequence.slice(-6);
      }
      
      // Store globally for persistence
      window.bridgeSequence = bridgeSequence;
      window.bridgeTimeout = bridgeTimeout;
    }
  });

  // Function to show initial notification after plugin loads
  function showInitialNotification() {
    if (!initialNotificationShown && !hasPressedC) {
      initialNotificationShown = true;
      // Show persistent notification until C is pressed
      showNotification('Press C to make a comment', 'info', 'press-c-instruction');
    }
  }

  // Initialize Moat extension on page load
  async function initializeExtension() {
    try {
      console.log('🚀 Initializing Moat Chrome Extension...');
      
      // Initialize project connection (will attempt to restore if available)
      if (DEBUG) console.log(' Initializing project connection...');
      
      // Initialize utilities first
      const utilitiesReady = await initializeUtilities();
      if (utilitiesReady) {
        console.log('✅ New task system ready');
      } else {
        console.log('⚠️ Falling back to legacy system');
      }
      
      // Try to restore project connection
      await initializeProject();
      
      // Initialize UI
      initializeUI();
      
      // Show initial notification after a short delay to ensure UI is ready
      setTimeout(() => {
        showInitialNotification();
      }, 1000);
      
      // Test annotation capture flow removed - no automatic testing
      
      console.log('✅ Moat extension initialized');
      if (DEBUG) console.log(' To connect to project, press Cmd+Shift+P or run setupProject()');
      
    } catch (error) {
      console.error('❌ Extension initialization failed:', error);
    }
  }

  // Initialize UI components
  function initializeUI() {
    // Initialize queue
    initializeQueue();
    
    // End-to-end test available via window.moatDebug.runEndToEndTest() if needed
  }

  // Initialize Moat extension on page load
  initializeExtension();

  console.log('Moat Chrome Extension loaded (AG-UI disabled)');

  // Task 4.10: Export debugging functions for manual testing
  // Listen for messages from background script (extension icon click) and side panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Legacy action-based messages
    if (request.action === 'ping') {
      // Simple ping to check if content script is ready
      sendResponse({ success: true, ready: true });
    } else if (request.action === 'getQueueStatus') {
      const queue = window.MoatSafeStorage ? window.MoatSafeStorage.getJSON('moat.queue', []) : [];
      sendResponse({
        count: queue.length,
        protocol: 'file',
        projectConnected: !!markdownFileHandle
      });
    } else if (request.action === 'exportAnnotations') {
      exportAnnotations();
      sendResponse({ success: true });
    }

    // Side Panel message types
    else if (request.type === 'GET_CONNECTION_STATUS') {
      sendResponse({
        connected: !!window.directoryHandle,
        path: projectRoot || ''
      });
    }

    else if (request.type === 'SETUP_PROJECT') {
      setupProject().then(() => {
        // Notify side panel of connection
        relayToSidePanel({
          type: 'PROJECT_CONNECTED',
          path: projectRoot || ''
        });
        sendResponse({ success: true });
      }).catch(err => {
        console.error('Setup project failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    }

    else if (request.type === 'DISCONNECT_PROJECT') {
      (async () => {
        try {
          const origin = window.location.origin;
          console.log('🔌 Moat: Disconnecting project for origin:', origin);

          // Reset in-memory connection state
          window.directoryHandle = null;
          projectRoot = null;
          markdownFileHandle = null;
          connectionEventDispatched = false;

          // Clear persisted handles from IndexedDB
          if (window.moatPersistence) {
            await window.moatPersistence.clearProjectConnection(origin);
            if (DEBUG) console.log(' IndexedDB persistence cleared');
          }

          // Clear legacy localStorage connection
          if (window.MoatSafeStorage) {
            window.MoatSafeStorage.remove('moat.connection');
          }
          localStorage.removeItem(`moat.project.${origin}`);
          if (DEBUG) console.log(' localStorage cleared');

          // Notify side panel
          relayToSidePanel({ type: 'PROJECT_DISCONNECTED' });
          sendResponse({ success: true });
          if (DEBUG) console.log(' Project disconnected successfully');
        } catch (err) {
          console.error('❌ Moat: Disconnect failed:', err);
          sendResponse({ success: false, error: err.message });
        }
      })();
    }

    else if (request.type === 'LOAD_TASKS') {
      loadTasksForSidePanel().then(tasks => {
        relayToSidePanel({ type: 'TASKS_LOADED', tasks });
        sendResponse({ success: true, tasks });
      }).catch(err => {
        console.error('Load tasks failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    }

    else if (request.type === 'UPDATE_TASK_STATUS') {
      updateTaskStatusFromSidePanel(request.taskId, request.status).then(() => {
        relayToSidePanel({ type: 'TASK_UPDATED', taskId: request.taskId });
        sendResponse({ success: true });
      }).catch(err => {
        console.error('Update task status failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    }

    else if (request.type === 'DELETE_TASK') {
      deleteTaskFromSidePanel(request.taskId).then(() => {
        relayToSidePanel({ type: 'TASK_DELETED', taskId: request.taskId });
        sendResponse({ success: true });
      }).catch(err => {
        console.error('Delete task failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    }

    else if (request.type === 'ENTER_COMMENT_MODE') {
      enterCommentMode();
      relayToSidePanel({ type: 'MODE_CHANGED', mode: 'comment' });
      sendResponse({ success: true });
    }

    else if (request.type === 'ENTER_DRAWING_MODE') {
      enterDrawingMode('rectangle');
      relayToSidePanel({ type: 'MODE_CHANGED', mode: 'drawing' });
      sendResponse({ success: true });
    }

    else if (request.type === 'EXIT_ANNOTATION_MODE') {
      exitCommentMode();
      exitDrawingMode();
      relayToSidePanel({ type: 'MODE_CHANGED', mode: null });
      sendResponse({ success: true });
    }

    else if (request.type === 'GET_THUMBNAIL') {
      getThumbnailDataUrl(request.screenshotPath).then(dataUrl => {
        sendResponse({ success: !!dataUrl, dataUrl });
      }).catch(err => {
        console.error('Get thumbnail failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    }

    else if (request.type === 'GET_SCREENSHOT_COUNT') {
      getScreenshotCount().then(count => {
        sendResponse({ success: true, count });
      }).catch(err => {
        console.error('Get screenshot count failed:', err);
        sendResponse({ success: false, count: 0, error: err.message });
      });
    }

    else if (request.type === 'CLEAR_SCREENSHOTS') {
      clearScreenshots().then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        console.error('Clear screenshots failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    }

    return true; // Keep message channel open for async response
  });

  // Helper to relay messages to side panel via background
  function relayToSidePanel(payload) {
    chrome.runtime.sendMessage({ type: 'RELAY_TO_SIDEPANEL', payload }).catch(() => {
      // Side panel might not be open
    });
  }

  // Load tasks for side panel
  async function loadTasksForSidePanel() {
    if (!taskStore || !window.directoryHandle) {
      return [];
    }
    try {
      await taskStore.loadTasksFromFile();
      return taskStore.tasks || [];
    } catch (err) {
      console.error('Error loading tasks:', err);
      return [];
    }
  }

  // Update task status from side panel
  async function updateTaskStatusFromSidePanel(taskId, status) {
    if (!taskStore) {
      throw new Error('TaskStore not initialized');
    }
    await taskStore.updateTaskStatusAndSave(taskId, status);
    // Dispatch event for moat.js (during migration period)
    window.dispatchEvent(new CustomEvent('moat:tasks-updated'));
  }

  // Delete task from side panel
  async function deleteTaskFromSidePanel(taskId) {
    if (!taskStore) {
      throw new Error('TaskStore not initialized');
    }
    await taskStore.deleteTask(taskId);
    await taskStore.saveTasksToFile();
    // Rebuild markdown
    if (markdownGenerator && window.directoryHandle) {
      await markdownGenerator.rebuildMarkdownFile(window.directoryHandle, taskStore.tasks);
    }
    // Dispatch event for moat.js (during migration period)
    window.dispatchEvent(new CustomEvent('moat:tasks-updated'));
  }

  // Get count of screenshots in the screenshots directory
  async function getScreenshotCount() {
    if (!window.directoryHandle) {
      return 0;
    }

    try {
      const screenshotsDir = await window.directoryHandle.getDirectoryHandle('screenshots', { create: false });
      let count = 0;
      for await (const entry of screenshotsDir.values()) {
        if (entry.kind === 'file') {
          count++;
        }
      }
      return count;
    } catch (error) {
      // Screenshots directory doesn't exist
      return 0;
    }
  }

  // Clear all screenshots from the screenshots directory
  async function clearScreenshots() {
    if (!window.directoryHandle) {
      throw new Error('No directory handle');
    }

    try {
      const screenshotsDir = await window.directoryHandle.getDirectoryHandle('screenshots', { create: false });

      // Get all files in screenshots directory
      const filesToDelete = [];
      for await (const entry of screenshotsDir.values()) {
        if (entry.kind === 'file') {
          filesToDelete.push(entry.name);
        }
      }

      // Delete each file
      for (const fileName of filesToDelete) {
        await screenshotsDir.removeEntry(fileName);
      }

      console.log(`Cleared ${filesToDelete.length} screenshots`);

      // Also clear screenshot paths from tasks
      if (taskStore) {
        taskStore.tasks.forEach(task => {
          task.screenshotPath = null;
        });
        await taskStore.saveTasksToFile();
      }
    } catch (error) {
      console.warn('Error clearing screenshots:', error);
      throw error;
    }
  }

  // Get thumbnail as data URL for side panel
  async function getThumbnailDataUrl(screenshotPath) {
    if (!screenshotPath || !window.directoryHandle) {
      return null;
    }

    try {
      // Parse screenshot path (format: "./screenshots/filename.png")
      const pathParts = screenshotPath.replace('./', '').split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Get screenshots directory
      const screenshotsDir = await window.directoryHandle.getDirectoryHandle('screenshots', { create: false });

      // Read file
      const fileHandle = await screenshotsDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();

      // Convert to data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.warn('Failed to get thumbnail data URL:', screenshotPath, error);
      return null;
    }
  }

  // Relay project connection events to side panel (V2)
  window.addEventListener('moat:project-connected', (e) => {
    const detail = e.detail || {};
    if (detail.status === 'connected') {
      relayToSidePanel({
        type: 'PROJECT_CONNECTED',
        path: detail.path || projectRoot || ''
      });
    } else if (detail.status === 'not-connected') {
      relayToSidePanel({ type: 'PROJECT_DISCONNECTED' });
    }
  });

  // Relay task update events to side panel (V2)
  window.addEventListener('moat:tasks-updated', (e) => {
    relayToSidePanel({ type: 'TASK_UPDATED' });
  });
})(); 
