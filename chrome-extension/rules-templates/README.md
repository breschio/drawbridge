# 🧭 Moat - Visual UI Feedback for Your Project

Moat is now connected to your project! This directory contains everything you need to turn visual feedback into code changes.

## 🚀 Quick Start

### 1. Create Visual Annotations
1. **Press `f`** in your browser to enter annotation mode
2. **Click any UI element** you want to change
3. **Describe the change** (e.g., "make this blue", "move to center")
4. **Press Enter** to save the annotation

### 2. Process Annotations with AI

**In Cursor:**
```
Use @.moat/drawbridge-workflow.md
```
Or simply type: `bridge`

**In Claude Code:**
```
/bridge
```

The AI will:
- ✅ Intelligently choose the best processing mode (Step, Batch, or YOLO)
- ✅ Show you exactly what it changed with visual context
- ✅ Handle task dependencies and grouping automatically
- ✅ Update your code with production-quality changes

## 📁 Files in This Directory

- **`drawbridge-workflow.md`** - Unified intelligent workflow for processing UI tasks  
- **`moat-tasks.md`** - Your current task list (auto-generated)
- **`moat-tasks-detail.json`** - Technical task data (auto-generated)
- **`config.json`** - Moat settings for this project

## 🎯 Example Workflow

1. **Annotate**: Click a button → "make this green and bigger"
2. **Process**: Run `Use @.moat/drawbridge-workflow.md` or just `bridge`
3. **AI Analyzes**: Chooses optimal mode and handles dependencies
4. **Review**: Shows changes with visual context and waits for approval
5. **Approve**: Type "yes" to apply the changes
6. **See Results**: Changes appear immediately in your browser!

## 🔄 Connection Issues?

If the AI can't find your tasks, the Chrome extension might need to reconnect:

### **Quick Fix:**
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows) in your browser
- Select your project directory again
- Moat will automatically redeploy these workflow files

### **Why This Happens:**
Browser security prevents file connections from persisting across browser restarts. This is normal and expected behavior.

### **Check Connection:**
```javascript
// In browser console:
window.directoryHandle ? "✅ Connected" : "❌ Need to reconnect"
```

## 💡 Common Annotation Examples

### Styling Changes
- "make this blue" → Changes color
- "bigger font" → Increases font size  
- "add shadow" → Adds drop shadow effect
- "make it round" → Adds border radius

### Layout Changes
- "center this" → Centers horizontally
- "move to bottom" → Positions at bottom
- "add spacing" → Adds margin/padding
- "align right" → Right-aligns content

### Content Changes
- "change text to..." → Updates content
- "add a button here" → Inserts new element
- "remove this" → Hides/removes element

## 🛠 Advanced Usage

### Advanced Processing Modes
**Step Mode (Incremental):**
```
step bridge
```

**Batch Mode (Grouped Efficiency):**
```
batch bridge
```

**YOLO Mode (Autonomous All-At-Once):**
```
yolo bridge
```

### Manual Task Review
Check your current tasks:
```
Review @.moat/moat-tasks.md
```

### Custom Instructions
You can edit `drawbridge-workflow.md` to customize how Drawbridge processes your specific project.

## 🎨 Best Practices

### Creating Good Annotations
- **Be specific**: "make this blue" vs "change the color"
- **One change per annotation**: Don't combine multiple requests
- **Use visual terms**: "bigger", "centered", "more spacing"
- **Context matters**: Click the exact element you want changed

### Working with AI
- **Review each change**: Don't approve without checking
- **Give feedback**: If something isn't right, describe what to fix
- **Test thoroughly**: Make sure changes work on mobile too
- **Save your work**: Commit changes to git regularly

## ⚙️ Configuration

Edit `config.json` to customize Moat for your project:
```json
{
  "version": "1.0.0",
  "projectName": "Your Project",
  "targetFiles": ["styles.css", "src/**/*.tsx"],
  "ui": {
    "autoShowMoat": true,
    "confirmBeforeSend": false
  }
}
```

## 🐛 Troubleshooting

### Common Issues
- **"Element not found"**: The page may have changed since annotation
- **"File not accessible"**: Check that your files are saved
- **"Change didn't work"**: Try a more specific description

### Getting Help
1. Check your task list: `@.moat/moat-tasks.md`
2. Try different processing modes: `step bridge`, `batch bridge`, `yolo bridge`
3. Review this README for examples
4. Edit `drawbridge-workflow.md` for custom behavior

## 🌟 Tips for Success

- **Start small**: Try simple changes first (colors, text)
- **Be patient**: Let the AI process one task at a time
- **Stay involved**: Review and approve each change
- **Experiment**: Try different ways of describing changes
- **Have fun**: Enjoy the magic of visual → code transformation!

---

**Happy building with Moat!** 🎯

*This directory was auto-created by the Moat Chrome extension. You can customize these files for your project's specific needs.* 