---
description: Process pending Drawbridge UI annotation tasks from the browser
---

# Drawbridge Task Processor

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
1. ✅ **BEFORE implementing**: Update JSON to `"status": "doing"`
2. ✅ **Implement** the code change
3. ✅ **AFTER implementing**: Update JSON to `"status": "done"` + MD to `[x]`

**⚠️ NEVER skip the "doing" status. ALWAYS update to "doing" before starting work.**

## Processing Instructions

1. **Load Tasks**: Read `moat-tasks-detail.json` to get all task details including:
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

WORKFLOW:
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
1. Open your browser with the project running (e.g., http://localhost:3000)
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
