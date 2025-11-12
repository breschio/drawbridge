---
description: Setup Drawbridge MCP and process UI annotation tasks
---

# Drawbridge Command

**Smart two-phase command:**
1. **Setup Phase**: Check and configure MCP server if needed
2. **Processing Phase**: Process tasks (with MCP or file-based fallback)

---

## PHASE 1: MCP Connection Check & Setup

**FIRST, check MCP status in this order:**

### Step 1: Check if MCP tools are available

Try to determine if you have access to drawbridge MCP tools by checking your available tool list.

### Step 2: If MCP NOT available, diagnose and offer to fix

Check these in order:

1. **Check if MCP server is built:**
   ```bash
   ls -la drawbridge-mcp-server/dist/index.js
   ```
   - If missing → Offer to build it: `cd drawbridge-mcp-server && npm run build`

2. **Check if MCP config exists:**
   ```bash
   cat ~/.config/claude-code/mcp_config.json
   ```
   - If missing or no "drawbridge" entry → Offer to create it

3. **If config exists but MCP not connected:**
   - Explain that Claude Code restart is needed
   - Provide restart instructions

### Step 3: MCP Setup Helper

**If user wants MCP setup, create config file:**

```json
{
  "mcpServers": {
    "drawbridge": {
      "command": "node",
      "args": ["<ABSOLUTE_PATH_TO_DRAWBRIDGE>/drawbridge-mcp-server/dist/index.js"],
      "env": {
        "DRAWBRIDGE_PROJECT_PATH": "<CURRENT_PROJECT_DIR>",
        "DRAWBRIDGE_MODE": "manual"
      }
    }
  }
}
```

**IMPORTANT:**
- Replace `<ABSOLUTE_PATH_TO_DRAWBRIDGE>` with full path to drawbridge repo
- Replace `<CURRENT_PROJECT_DIR>` with actual project path (use `pwd`)
- Use absolute paths only (not `~` or relative paths)
- Tell user to restart Claude Code after config creation

### Step 4: Show MCP Status

Always show current status:

```
🔌 MCP Status:
   Server Built: ✅ / ❌
   Config Exists: ✅ / ❌
   Connected: ✅ / ❌

   Mode: [MCP Real-time] or [File-based fallback]
```

---

## PHASE 2: Task Processing

**Processing Mode Selection:**

### If MCP Connected (Preferred):
Use MCP tools for real-time task management:
- `get_pending_tasks` - Get all pending tasks
- `get_all_tasks` - Get all tasks regardless of status
- `update_task_status` - Update task status (to do → doing → done)
- `get_task_by_id` - Get specific task details
- `set_processing_mode` - Change auto/manual mode

**Benefits:**
- Real-time file watching
- Instant notifications of new tasks
- Better performance
- Atomic status updates

### If MCP Not Connected (Fallback):
Use file-based processing (instructions below).

**Note:** File-based mode is fully functional but requires manual file reads/writes.

---

## File-Based Task Processing

You are processing visual UI annotation tasks created via the Drawbridge Chrome extension.

## Task Files Location

**Search priority** (check in this order):
1. `.moat/moat-tasks-detail.json` (current directory)
2. `moat-tasks-detail.json` (current directory - legacy)
3. `../.moat/moat-tasks-detail.json` (parent directory)

Files to read:
- **Primary data**: `moat-tasks-detail.json` - Full task details
- **Human-readable**: `moat-tasks.md` - Task checklist
- **Screenshots**: `.moat/screenshots/` - Visual context

**Important**: Always check `.moat/` subdirectory first before checking project root.

## ⚠️ CRITICAL: Status Lifecycle (MUST FOLLOW)

**EVERY task MUST follow this exact sequence:**

```
"to do" → "doing" → "done"
```

**FOR EACH TASK:**
1. ✅ **BEFORE implementing**: Update status to `"doing"`
   - **With MCP**: Use `update_task_status` tool
   - **Without MCP**: Update JSON file manually
2. ✅ **Implement** the code change
3. ✅ **AFTER implementing**: Update status to `"done"`
   - **With MCP**: Use `update_task_status` tool
   - **Without MCP**: Update JSON to `"status": "done"` + MD to `[x]`

**⚠️ NEVER skip the "doing" status. ALWAYS update to "doing" before starting work.**

## Processing Instructions

1. **Load Tasks**:
   - **With MCP**: Use `get_pending_tasks` or `get_all_tasks`
   - **Without MCP**: Read `moat-tasks-detail.json` directly

   Task details include:
   - `comment`: User's instruction
   - `selector`: CSS selector for target element
   - `screenshotPath`: Visual context (resolve `./screenshots/` to `.moat/screenshots/`)
   - `status`: Current task status ("to do", "doing", "done")

2. **Analyze Dependencies**: Before starting, check if tasks reference each other:
   - Look for pronouns: "that button", "this element", "it"
   - Check for descriptive references: "the blue button", "the updated header"
   - Process dependent tasks in correct order

3. **Processing Mode** (ask user if not specified):
   - **step**: Process one task at a time with approval
   - **batch**: Group related tasks, process together with single approval
   - **yolo**: Process all tasks autonomously (use with caution)

4. **Status Update Details**:
   - **Handle auto-sync**: Extension may regenerate MD after JSON changes
   - **Always re-read MD** before editing to get latest content
   - If edit fails, re-read and verify the checkbox is correct before retrying
   - Batch updates together for efficiency

5. **Implementation Standards**:
   - Use design tokens/CSS variables over hardcoded values
   - Prefer `rem` over `px` for scalability
   - Maintain existing code patterns and conventions
   - Consider accessibility (ARIA, keyboard navigation, contrast)

## Screenshot Path Resolution

```javascript
// JSON stores relative paths, actual files are in .moat/
const resolveScreenshotPath = (path) => {
  return path.replace(/^\.\/screenshots\//, '.moat/screenshots/')
             .replace(/^screenshots\//, '.moat/screenshots/');
};
```

## Example Task Processing

```
Task: "Make this button green"
Selector: button.submit-btn
Screenshot: .moat/screenshots/moat-1234.png

WORKFLOW WITH MCP:
1. ⚠️ FIRST: update_task_status(task_id, "doing")
2. Read screenshot for visual context
3. Find button.submit-btn in codebase
4. Implement change (use design token if available)
5. ⚠️ AFTER: update_task_status(task_id, "done")

WORKFLOW WITHOUT MCP:
1. ⚠️ FIRST: Update .moat/moat-tasks-detail.json → "status": "doing"
2. Read screenshot for visual context
3. Find button.submit-btn in codebase
4. Implement change (use design token if available)
5. ⚠️ AFTER: Update .moat/moat-tasks-detail.json → "status": "done"
6. Update .moat/moat-tasks.md checkbox → [x]
```

**Wrong Order (DO NOT DO THIS):**
❌ Implement → Update to "done" (skips "doing" status)

**Correct Order:**
✅ Update to "doing" → Implement → Update to "done"

## Best Practices

- Load ALL screenshots in parallel at start (batch Read calls)
- Reference files with path:line format (e.g., `src/Button.tsx:42`)
- Ask clarifying questions if task is ambiguous
- Suggest design system alternatives when appropriate

## 🚨 Error Handling

**If no `.moat/` directory exists:**
```
❌ No Drawbridge tasks found.

The `.moat/` directory doesn't exist in this project. This means:
- The Chrome extension hasn't been connected yet, OR
- You're in the wrong directory

To fix:
1. Open your browser with the project running (works on any URL: localhost, file://, custom domains, etc.)
2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows) in the browser
3. Select your project directory
4. Drawbridge will create .moat/ and deploy task files

Then run /bridge again.
```

**If no tasks are found (empty JSON or all tasks done):**
```
✅ No pending tasks found!

All tasks are complete or no annotations have been created yet.

To create new tasks:
1. Open your browser with the project running
2. Press 'f' to enter annotation mode
3. Click any UI element and describe the change
4. Tasks will appear in .moat/moat-tasks.md

Then run /bridge again.
```

**If you're in the wrong directory:**
```
❌ Task files not found in expected locations.

Checked:
- .moat/moat-tasks-detail.json ❌
- moat-tasks-detail.json ❌
- ../.moat/moat-tasks-detail.json ❌

Are you in the correct directory?
- cd to your project root or demo directory
- Make sure the Chrome extension is connected to this project

Current directory: [show pwd]
```

---

Process tasks efficiently while maintaining code quality and consistency.
