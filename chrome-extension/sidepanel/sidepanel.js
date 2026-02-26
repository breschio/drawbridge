/**
 * Drawbridge Side Panel
 *
 * Handles UI rendering and communication with content scripts.
 * File operations remain in the content script context.
 */

// State
let currentTab = 'to do';
let tasks = [];
let isConnected = false;
let projectPath = '';
let currentMode = null; // 'comment', 'drawing', or null

// Thumbnail cache
const thumbnailCache = new Map();

// DOM Elements
const taskContainer = document.getElementById('task-container');
const connectionBanner = document.getElementById('connection-banner');
const connectBtn = document.getElementById('connect-btn');
const projectBtn = document.getElementById('project-btn');
const projectMenu = document.getElementById('project-menu');
const statusText = connectionBanner.querySelector('.status-text');
const toolsBtn = document.getElementById('tools-btn');
const toolsMenu = document.getElementById('tools-menu');
const settingsBtn = document.getElementById('settings-btn');
const notificationContainer = document.getElementById('notification-container');
const tabs = document.querySelectorAll('.tab');
const todoBadge = document.getElementById('todo-badge');
const doingBadge = document.getElementById('doing-badge');
const doneBadge = document.getElementById('done-badge');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await loadTheme();

  // Small initial delay to let content script load
  await new Promise(r => setTimeout(r, 100));

  // Try to connect to content script with retry (5 attempts)
  const ready = await connectWithRetry(5);

  if (ready) {
    await checkConnectionStatus();
    if (isConnected) {
      requestTasks();
    }
  }

  // Listen for tab activation changes
  chrome.tabs.onActivated.addListener(handleTabChange);

  // Listen for tab URL changes (navigation)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      handleTabChange();
    }
  });
}

// Handle tab switching - re-check connection status
async function handleTabChange() {
  // Small delay to let content script initialize
  setTimeout(async () => {
    const ready = await connectWithRetry(2);
    if (ready) {
      await checkConnectionStatus();
      if (isConnected) {
        requestTasks();
      } else {
        tasks = [];
        renderTasks();
        updateBadges();
      }
    } else {
      // Content script not ready
      isConnected = false;
      tasks = [];
      updateConnectionBanner();
      renderTasks();
      updateBadges();
    }
  }, 150);
}

// Event Listeners
function setupEventListeners() {
  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const status = tab.dataset.status;
      setActiveTab(status);
    });
  });

  // Connect button
  connectBtn.addEventListener('click', async () => {
    // Try to reconnect if content script wasn't ready
    if (!contentScriptReady) {
      const ready = await connectWithRetry(3);
      if (!ready) {
        showNotification('Please refresh the page to connect', 'error');
        return;
      }
    }

    const result = await sendToContentScript({ type: 'SETUP_PROJECT' }, false);
    if (!result) {
      showNotification('Please refresh the page to connect', 'error');
    }
    // PROJECT_CONNECTED message will update the UI on success
  });

  // Project button (opens dropdown)
  projectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProjectMenu();
  });

  // Project menu items
  projectMenu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      hideProjectMenu();

      if (action === 'disconnect') {
        // Get current tab's origin to set disconnect flag
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          try {
            const origin = new URL(tab.url).origin;
            // Set disconnect flag in chrome.storage.local - this works even if content script is unreachable
            await chrome.storage.local.set({ [`drawbridge:disconnected:${origin}`]: true });
          } catch (e) {
            console.warn('Could not set disconnect flag:', e);
          }
        }

        // Try to notify content script (best effort)
        sendToContentScript({ type: 'DISCONNECT_PROJECT' }, false);

        // Update UI immediately
        isConnected = false;
        projectPath = '';
        tasks = [];
        thumbnailCache.clear();
        updateConnectionBanner();
        renderTasks();
        updateBadges();
        showNotification('Project disconnected', 'success');
      } else if (action === 'refresh') {
        showNotification('Refreshing data...', 'info');
        requestTasks();
      } else if (action === 'clear-screenshots') {
        // First get screenshot count
        const countResult = await sendToContentScript({ type: 'GET_SCREENSHOT_COUNT' }, false);
        const count = countResult?.count || 0;

        if (count === 0) {
          showNotification('No screenshots to clear', 'info');
          return;
        }

        if (confirm(`Clear ${count} screenshot${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
          const result = await sendToContentScript({ type: 'CLEAR_SCREENSHOTS' }, false);
          if (result?.success) {
            showNotification(`${count} screenshot${count !== 1 ? 's' : ''} cleared`, 'success');
            requestTasks();
          } else {
            showNotification('Failed to clear screenshots', 'error');
          }
        }
      }
    });
  });

  // Tools dropdown
  toolsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleToolsMenu();
  });

  // Tool menu items
  toolsMenu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      hideToolsMenu();

      // Check if content script is ready
      if (!contentScriptReady) {
        const ready = await connectWithRetry(2);
        if (!ready) {
          showNotification('Please refresh the page first', 'error');
          return;
        }
      }

      // Toggle mode off if already active
      if ((action === 'comment' && currentMode === 'comment') ||
          (action === 'rectangle' && currentMode === 'drawing')) {
        sendToContentScript({ type: 'EXIT_ANNOTATION_MODE' }, false);
      } else if (action === 'comment') {
        sendToContentScript({ type: 'ENTER_COMMENT_MODE' }, false);
      } else if (action === 'rectangle') {
        sendToContentScript({ type: 'ENTER_DRAWING_MODE' }, false);
      }
    });
  });

  // Settings button (theme toggle for now)
  settingsBtn.addEventListener('click', toggleTheme);

  // Close menus on outside click
  document.addEventListener('click', () => {
    hideToolsMenu();
    hideProjectMenu();
  });

  // Listen for messages from content script via background
  chrome.runtime.onMessage.addListener(handleMessage);
}

// Message Handling
function handleMessage(message, sender, sendResponse) {
  console.log('[SidePanel] Received message:', message.type);

  switch (message.type) {
    case 'TASKS_LOADED':
      tasks = message.tasks || [];
      renderTasks();
      updateBadges();
      break;

    case 'PROJECT_CONNECTED':
      isConnected = true;
      projectPath = message.path || '';
      updateConnectionBanner();
      showNotification('Project connected', 'success');
      requestTasks();
      break;

    case 'PROJECT_DISCONNECTED':
      isConnected = false;
      projectPath = '';
      tasks = [];
      updateConnectionBanner();
      renderTasks();
      updateBadges();
      showNotification('Project disconnected', 'info');
      break;

    case 'ANNOTATION_CREATED':
      showNotification('Annotation saved', 'success');
      requestTasks();
      break;

    case 'MODE_CHANGED':
      currentMode = message.mode;
      updateToolsButtonState();
      if (message.mode) {
        showNotification(`${message.mode === 'comment' ? 'Comment' : 'Rectangle'} mode active - click on page`, 'info');
      }
      break;

    case 'CONNECTION_STATUS':
      isConnected = message.status === 'connected';
      projectPath = message.path || '';
      updateConnectionBanner();
      if (isConnected) {
        requestTasks();
      }
      break;

    case 'TASK_UPDATED':
      requestTasks();
      break;

    case 'TASK_DELETED':
      requestTasks();
      break;
  }

  return true;
}

// Communication with Content Script
let lastErrorTime = 0;
let contentScriptReady = false;

async function sendToContentScript(message, showError = true) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      console.warn('[SidePanel] No active tab');
      return null;
    }

    // Check for restricted pages
    const restrictedSchemes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'devtools://'];
    if (tab.url && restrictedSchemes.some(scheme => tab.url.startsWith(scheme))) {
      return null;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[SidePanel] Send failed:', chrome.runtime.lastError.message);
          contentScriptReady = false;
          updatePageStatus();
          // Debounce error notifications (only show once per 5 seconds)
          const now = Date.now();
          if (showError && now - lastErrorTime > 5000) {
            lastErrorTime = now;
            showNotification('Page needs refresh to connect', 'error');
          }
          resolve(null);
        } else {
          contentScriptReady = true;
          updatePageStatus();
          resolve(response);
        }
      });
    });
  } catch (error) {
    console.error('[SidePanel] Error sending message:', error);
    return null;
  }
}

// Ping content script to check if it's ready
async function pingContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;

    const restrictedSchemes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'devtools://'];
    if (tab.url && restrictedSchemes.some(scheme => tab.url.startsWith(scheme))) {
      return false;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
        } else {
          resolve(response?.ready === true);
        }
      });
    });
  } catch {
    return false;
  }
}

// Retry connection with backoff
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const ready = await pingContentScript();
    if (ready) {
      contentScriptReady = true;
      updatePageStatus();
      return true;
    }
    // Wait before retry (200ms, 400ms, 800ms)
    await new Promise(r => setTimeout(r, 200 * Math.pow(2, i)));
  }
  contentScriptReady = false;
  updatePageStatus();
  return false;
}

// Update UI based on page connection status
function updatePageStatus() {
  // Don't disable buttons - we'll handle connection issues when user clicks
  // This provides a better UX than showing disabled buttons
}

async function checkConnectionStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      // No active tab
      isConnected = false;
      projectPath = '';
      updateConnectionBanner();
      return;
    }

    // Check if this is a restricted page
    const restrictedSchemes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'devtools://'];
    if (tab.url && restrictedSchemes.some(scheme => tab.url.startsWith(scheme))) {
      isConnected = false;
      projectPath = '';
      updateConnectionBanner();
      return;
    }

    // Don't show error for status check - content script might just need page refresh
    const response = await sendToContentScript({ type: 'GET_CONNECTION_STATUS' }, false);
    if (response) {
      isConnected = response.connected;
      projectPath = response.path || '';
      updateConnectionBanner();
      if (isConnected) {
        requestTasks();
      }
    } else {
      // Content script not ready
      isConnected = false;
      projectPath = '';
      updateConnectionBanner();
    }
  } catch (error) {
    console.error('[SidePanel] Error checking status:', error);
    isConnected = false;
    updateConnectionBanner();
  }
}

async function requestTasks() {
  const response = await sendToContentScript({ type: 'LOAD_TASKS' }, false);
  // Tasks will be received via TASKS_LOADED message from content script
}

// UI Updates
function updateConnectionBanner() {
  if (isConnected) {
    connectionBanner.classList.remove('disconnected');
    connectionBanner.classList.add('connected');
    statusText.textContent = projectPath || 'Connected';
  } else {
    connectionBanner.classList.remove('connected');
    connectionBanner.classList.add('disconnected');
  }
}

function setActiveTab(status) {
  currentTab = status;
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.status === status);
  });
  renderTasks();
}

function updateBadges() {
  const counts = {
    'to do': 0,
    'doing': 0,
    'done': 0
  };

  tasks.forEach(task => {
    const status = (task.status || 'to do').toLowerCase();
    if (counts.hasOwnProperty(status)) {
      counts[status]++;
    }
  });

  todoBadge.textContent = counts['to do'];
  todoBadge.style.display = counts['to do'] > 0 ? 'inline' : 'none';

  doingBadge.textContent = counts['doing'];
  doingBadge.style.display = counts['doing'] > 0 ? 'inline' : 'none';

  doneBadge.textContent = counts['done'];
  doneBadge.style.display = counts['done'] > 0 ? 'inline' : 'none';
}

// Task Rendering
function renderTasks() {
  // Show connect prompt if not connected (whether or not content script is ready)
  if (!isConnected) {
    taskContainer.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p>Connect a project to get started</p>
        <p class="hint">Click "Connect Project" to select a folder</p>
      </div>
    `;
    return;
  }

  const filteredTasks = tasks.filter(task => {
    const taskStatus = (task.status || 'to do').toLowerCase();
    return taskStatus === currentTab;
  });

  if (filteredTasks.length === 0) {
    taskContainer.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No ${currentTab} tasks</p>
        <p class="hint">Use the tools to annotate elements on the page</p>
      </div>
    `;
    return;
  }

  // Sort tasks chronologically (oldest first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    return (a.timestamp || a.createdAt || 0) - (b.timestamp || b.createdAt || 0);
  });

  taskContainer.innerHTML = sortedTasks.map(task => renderTaskCard(task)).join('');

  // Load thumbnails for tasks with screenshots
  loadThumbnails();

  // Add event listeners to task cards
  addTaskEventListeners();
}

function addTaskEventListeners() {
  taskContainer.querySelectorAll('.task-card').forEach(card => {
    const taskId = card.dataset.taskId;

    // Status dropdown
    const statusSelect = card.querySelector('.status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        // Don't show error - TASK_UPDATED message will refresh the UI
        sendToContentScript({
          type: 'UPDATE_TASK_STATUS',
          taskId,
          status: e.target.value
        }, false);
      });
    }

    // Delete button (on card or thumbnail)
    card.querySelectorAll('.delete-btn, .thumbnail-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this task?')) {
          // Don't show error - TASK_DELETED message will refresh the UI
          sendToContentScript({ type: 'DELETE_TASK', taskId }, false);
        }
      });
    });
  });
}

// Load thumbnails for tasks with screenshots
async function loadThumbnails() {
  const thumbnailContainers = taskContainer.querySelectorAll('.thumbnail-container');

  for (const container of thumbnailContainers) {
    const screenshotPath = container.dataset.screenshotPath;
    const taskId = container.dataset.taskId;

    if (!screenshotPath) continue;

    // Check cache first
    if (thumbnailCache.has(screenshotPath)) {
      setThumbnailSrc(container, thumbnailCache.get(screenshotPath));
      continue;
    }

    // Request thumbnail from content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'GET_THUMBNAIL',
          screenshotPath,
          taskId
        }, (response) => {
          if (response?.success && response.dataUrl) {
            thumbnailCache.set(screenshotPath, response.dataUrl);
            setThumbnailSrc(container, response.dataUrl);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load thumbnail:', error);
    }
  }
}

function setThumbnailSrc(container, src) {
  const img = container.querySelector('.thumbnail-img');
  if (img) {
    img.src = src;
    img.style.display = 'block';
  }
}

function renderTaskCard(task) {
  const statusClass = (task.status || 'to do').toLowerCase().replace(' ', '-');
  const timestamp = task.timestamp || task.createdAt;
  const timeAgo = timestamp ? formatTime(timestamp) : '';
  const hasScreenshot = !!task.screenshotPath;
  const isCompleted = task.status === 'done';

  // Calculate thumbnail focus point if available
  let thumbnailStyle = '';
  if (hasScreenshot && task.clickPosition && task.screenshotViewport) {
    const clickAbsoluteX = (task.boundingRect?.x || 0) + (task.clickPosition?.x || 0);
    const clickAbsoluteY = (task.boundingRect?.y || 0) + (task.clickPosition?.y || 0);
    const clickInViewportX = clickAbsoluteX - (task.screenshotViewport?.x || 0);
    const clickInViewportY = clickAbsoluteY - (task.screenshotViewport?.y || 0);
    const xPercent = (clickInViewportX / (task.screenshotViewport?.width || 1)) * 100;
    const yPercent = (clickInViewportY / (task.screenshotViewport?.height || 1)) * 100;
    thumbnailStyle = `object-position: ${xPercent}% ${yPercent}%;`;
  }

  return `
    <div class="task-card status-${statusClass} ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
      <div class="task-layout">
        <div class="task-content-area">
          <div class="task-header">
            <span class="task-time">${timeAgo}</span>
            ${!hasScreenshot ? `
              <button class="delete-btn" title="Delete task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            ` : ''}
          </div>
          <div class="task-content">${escapeHtml(task.comment || task.content || 'No comment')}</div>
          ${task.selector ? `<div class="task-selector">${escapeHtml(task.selector)}</div>` : ''}
        </div>
        ${hasScreenshot ? `
          <div class="thumbnail-container" data-task-id="${task.id}" data-screenshot-path="${task.screenshotPath}">
            <img class="thumbnail-img" style="${thumbnailStyle} display: none;" alt="Screenshot" />
            <button class="thumbnail-delete-btn" title="Delete task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Tools Menu
function toggleToolsMenu() {
  toolsMenu.classList.toggle('hidden');
}

function hideToolsMenu() {
  toolsMenu.classList.add('hidden');
}

// Project Menu
function toggleProjectMenu() {
  projectMenu.classList.toggle('hidden');
  hideToolsMenu();
}

function hideProjectMenu() {
  projectMenu.classList.add('hidden');
}

function updateToolsButtonState() {
  if (currentMode) {
    toolsBtn.classList.add('active');
    toolsBtn.title = `${currentMode === 'comment' ? 'Comment' : 'Rectangle'} mode active`;
  } else {
    toolsBtn.classList.remove('active');
    toolsBtn.title = 'Tools';
  }

  // Update menu items
  toolsMenu.querySelectorAll('.menu-item').forEach(item => {
    const action = item.dataset.action;
    const isActive = (action === 'comment' && currentMode === 'comment') ||
                     (action === 'rectangle' && currentMode === 'drawing');
    item.classList.toggle('active', isActive);
  });
}

// Theme
async function loadTheme() {
  const result = await chrome.storage.local.get('theme');
  const theme = result.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  await chrome.storage.local.set({ theme: next });
}

// Notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  notificationContainer.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('removing');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
