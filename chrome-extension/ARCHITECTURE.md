# 🏗 Moat Architecture Documentation

## 🎯 Core Principle: Dynamic, Not Hardcoded

**Moat is designed to work with ANY project directory the user selects.** There are no hardcoded paths to specific directories like "demo-page" or "start-here".

## 📊 System Architecture

### **1. Chrome Extension Layer**
```
Chrome Extension (chrome-extension/)
├── manifest.json          # Extension configuration
├── content_script.js      # Main logic (injected into every localhost page)
├── popup.js              # Extension popup interface
├── moat.js               # UI sidebar and visual components
└── utils/
    ├── taskStore.js      # Task data management
    ├── markdownGenerator.js # Markdown file generation
    └── migrateLegacyFiles.js # Legacy file migration
```

### **2. File System Integration**
```
User Project Directory (ANY name)
└── .moat/                    # Created dynamically
    ├── config.json           # Project-specific settings
    ├── moat-tasks.md         # Human-readable task list
    ├── moat-tasks-detail.json # Machine-readable task data
    ├── drawbridge-workflow.md # Unified AI workflow rule (deployed automatically)
    ├── README.md             # Project-specific guide (deployed automatically)
    └── screenshots/          # Task screenshots (created as needed)
```

### **3. Connection Flow**
```
1. User presses Cmd+Shift+P
2. Browser shows directory picker (File System Access API)
3. User selects ANY project directory
4. Extension creates .moat/ subdirectory
5. Extension deploys rule templates automatically
6. Extension stores directory handle in memory
7. All operations use relative paths within selected directory
```

## 🔄 Connection Lifecycle

### **Connection Establishment**
1. **User Action**: Presses `Cmd+Shift+P` or clicks extension icon
2. **Directory Selection**: File System Access API shows directory picker
3. **Project Setup**: Creates `.moat/` directory in selected location
4. **Rule Deployment**: Copies embedded rule templates to project
5. **Handle Storage**: Stores directory handle in `window.directoryHandle`

### **Connection Persistence**
❗ **CRITICAL LIMITATION**: Directory handles cannot persist across browser sessions due to browser security.

**Connection Lost When**:
- Browser restarts
- Extension updates
- Browser data cleared
- Project directory renamed/moved

**Connection Preserved During**:
- Page refreshes
- Tab switching
- Extension popup usage

### **Reconnection Process**
1. **Detection**: Extension detects missing directory handle
2. **User Prompt**: Shows reconnection notification
3. **Re-selection**: User selects project directory again
4. **Auto-repair**: Extension re-deploys rule templates if missing

## 🔧 Technical Implementation

### **Directory Handle Management**
```javascript
// Dynamic directory selection
const dirHandle = await window.showDirectoryPicker();

// Dynamic .moat directory creation
const moatDir = await dirHandle.getDirectoryHandle('.moat', { create: true });

// Store handle for all operations
window.directoryHandle = moatDir; 
```

### **Rule Template Deployment**
```javascript
// Templates are embedded in extension code
const templates = {
  'drawbridge-workflow.md': `# Drawbridge Workflow: Complete Rules...`,
  'README.md': `# Moat - Connected to ${dirHandle.name}...`
};

// Deploy to ANY project directory
for (const [filename, content] of Object.entries(templates)) {
  const fileHandle = await moatDir.getFileHandle(filename, { create: true });
  // ... write content
}
```

### **Task File Operations**
```javascript
// All paths are relative to connected directory
await window.directoryHandle.getFileHandle('moat-tasks.md', { create: true });
await window.directoryHandle.getFileHandle('moat-tasks-detail.json', { create: true });
```

## 🐛 Troubleshooting Guide

### **"Tasks not saving"**
**Cause**: No project connected  
**Solution**: Press `Cmd+Shift+P` to connect project

### **"AI can't find tasks"**
**Cause**: Rule templates not deployed  
**Solution**: Reconnect project (auto-deploys templates)

### **"Connection lost after browser restart"**
**Cause**: Browser security limitation  
**Solution**: This is normal - reconnect project

### **"Project renamed, extension broken"**
**Cause**: Directory handle invalidated  
**Solution**: Reconnect to renamed project directory

### **Diagnostic Commands**
```javascript
// Check connection status
window.directoryHandle ? "Connected" : "Not Connected"

// Full system diagnosis  
window.moatDebug.diagnoseConnection()

// Check system health
window.moatDebug.checkSystemStatus()
```

## ✅ Key Points for Developers

1. **No Hardcoded Paths**: Extension works with any directory name
2. **Dynamic Rule Deployment**: Templates embedded and deployed automatically  
3. **Connection Required**: User must reconnect after browser restart
4. **Relative Operations**: All file operations use directory handles
5. **Graceful Fallbacks**: Multiple save mechanisms for reliability

## 🚀 Best Practices

### **For Users**
- Connect once per browser session
- Keep project directory name stable
- Use diagnostic tools when issues occur
- Bookmark localhost URLs

### **For Developers**
- Never hardcode directory names
- Always check connection before file operations
- Provide clear reconnection prompts
- Test with various project directory names

This architecture ensures Moat works reliably with any project structure while maintaining security and user control. 