# Live Test: Chrome Extension → MCP Server → Claude Code

This is the **complete end-to-end test** using the real workflow.

## What We'll Do

```
Chrome Extension → File System → MCP Server → Claude Code (Me!)
     (You)          (.moat/)      (Running)     (Processing)
```

1. You create annotation in Chrome
2. Extension writes to `.moat/moat-tasks-detail.json`
3. MCP server detects file change
4. I (Claude Code) get notified
5. I ask if you want to process it
6. You approve
7. I implement the change!

---

## Step 1: Choose Your Test Project

You need a web project running on any URL. Which do you want to use?

### Option A: Use the demo project
```bash
cd demo
python3 -m http.server 8080
# Opens at http://localhost:8080
```

### Option B: Use your own project
Any project running on any URL will work! (localhost, file://, custom domains, DDEV, etc.)

**For this guide, I'll assume you're using the demo project. Note: Drawbridge now works on any URL, not just localhost!**

---

## Step 2: Configure Claude Code (Me!)

Create the MCP configuration file:

```bash
mkdir -p ~/.config/claude-code

cat > ~/.config/claude-code/mcp_config.json <<'EOF'
{
  "mcpServers": {
    "drawbridge": {
      "command": "node",
      "args": ["/Users/tbreschi/Documents/_code/drawbridge/drawbridge-mcp-server/dist/index.js"],
      "env": {
        "DRAWBRIDGE_PROJECT_PATH": "/Users/tbreschi/Documents/_code/drawbridge/demo",
        "DRAWBRIDGE_MODE": "manual"
      }
    }
  }
}
EOF

echo "✅ Claude Code MCP config created!"
```

**Important**: Update `DRAWBRIDGE_PROJECT_PATH` if using a different project!

---

## Step 3: Exit This Session and Restart Claude Code

I need to restart to load the MCP server configuration.

```bash
# Exit this session
exit

# Start new Claude Code session in the drawbridge directory
cd /Users/tbreschi/Documents/_code/drawbridge
claude-code
```

When I restart, the MCP server will automatically start in the background!

---

## Step 4: Start Your Web Server

In a **new terminal** (keep Claude Code running):

```bash
cd /Users/tbreschi/Documents/_code/drawbridge/demo
python3 -m http.server 8080
```

Open your browser to: **http://localhost:8080**

You should see the demo page.

---

## Step 5: Connect Chrome Extension to Demo Project

1. **Open the Drawbridge extension** (click the icon in Chrome toolbar)

2. **Press `Cmd+Shift+P`** (or click "Connect" button)

3. **Select the demo folder**:
   - Navigate to `/Users/tbreschi/Documents/_code/drawbridge/demo`
   - Click "Select" or "Open"

4. **Grant permissions** when Chrome asks

You should see in the extension:
```
✅ Connected to: demo
```

---

## Step 6: Create Your First Test Annotation

Now the fun part!

1. **Press `C` key** in the browser (cursor becomes crosshair)

2. **Hover over an element** (you'll see it highlighted)

3. **Click on a button or heading**

4. **Type a comment** in the popup:
   ```
   Change the background color to blue
   ```

5. **Press `Enter`** or click "Submit"

The task is now created!

---

## Step 7: Watch the Magic Happen! ✨

### In the MCP Server logs (if you're watching):

You'll see:
```
📝 Task file changed: .../demo/.moat/moat-tasks-detail.json
🆕 1 new task(s) detected!
   • [Element]: "Change the background color to blue"
📢 Notification: 1 new task(s) ready for processing
```

### In Claude Code (me):

I will automatically say something like:

```
I detected a new Drawbridge task!

Task: "Change the background color to blue"
Element: .your-element-selector
Screenshot: Available

Would you like me to process this task?
```

---

## Step 8: Approve and Watch Me Work

Reply to me:
```
Yes, process it
```

I will then:

1. **Update status to "doing"**
   ```
   ✅ Updated task status: to do → doing
   ```

2. **Read the screenshot** (if available)
   ```
   📸 Loading screenshot for visual context...
   ```

3. **Find the element in your code**
   ```
   🔍 Found element in: demo/index.html line 42
   ```

4. **Implement the change**
   ```
   🔧 Updating background color to blue...
   ```

5. **Update status to "done"**
   ```
   ✅ Task completed: doing → done
   ```

---

## Step 9: Verify the Change

1. **Go back to your browser** (http://localhost:8080)

2. **Refresh the page** (or it auto-reloads if using hot reload)

3. **See the change!** The element should now have a blue background

4. **Check the Drawbridge extension** - Task should be marked as done ✓

---

## Full Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ YOU: Press C → Click element → Type comment → Press Enter  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ CHROME EXTENSION: Writes to .moat/moat-tasks-detail.json   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ MCP SERVER: Detects file change within < 1 second          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ CLAUDE CODE: Receives notification via MCP protocol        │
│ "I detected a new task! Would you like me to process it?"  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ YOU: "Yes, process it"                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ CLAUDE CODE: Updates status → Implements change → Done!    │
└─────────────────────────────────────────────────────────────┘
```

---

## Expected Timeline

- **0s**: You press Enter on your comment
- **< 0.5s**: Chrome extension writes to file
- **< 1s**: MCP server detects change
- **< 2s**: I (Claude Code) notify you
- **Your approval**: You say "yes"
- **5-30s**: I implement the change
- **Done!**: Refresh browser to see result

**Total time from comment to code change: ~10-60 seconds** (depending on complexity)

---

## Troubleshooting

### "I don't see the MCP server notification"

Check if I loaded the MCP server:

Ask me:
```
"What MCP servers are available to you?"
```

I should respond with "drawbridge" in the list.

### "The file watcher isn't detecting changes"

1. Check the MCP server is running:
   ```bash
   ps aux | grep drawbridge-mcp-server
   ```

2. Manually start the server to see logs:
   ```bash
   cd drawbridge-mcp-server
   DRAWBRIDGE_PROJECT_PATH=/Users/tbreschi/Documents/_code/drawbridge/demo node dist/index.js
   ```

### "Extension says not connected"

1. Press `Cmd+Shift+P` again
2. Re-select the demo folder
3. Make sure you selected the `demo/` folder, not `drawbridge/`

### "Tasks aren't being created"

1. Check the `.moat/` folder exists:
   ```bash
   ls -la demo/.moat/
   ```

2. Check the task file was created:
   ```bash
   cat demo/.moat/moat-tasks-detail.json
   ```

---

## Advanced: Watch Server Logs

If you want to see what's happening behind the scenes:

**Terminal 1**: Start web server
```bash
cd demo
python3 -m http.server 8080
```

**Terminal 2**: Start MCP server manually (to see logs)
```bash
cd drawbridge-mcp-server
DRAWBRIDGE_PROJECT_PATH=/Users/tbreschi/Documents/_code/drawbridge/demo node dist/index.js
```

**Terminal 3**: Start Claude Code
```bash
cd /Users/tbreschi/Documents/_code/drawbridge
claude-code
```

Now you can see all the logs in real-time!

---

## Quick Start Commands

Copy-paste these to get started quickly:

```bash
# 1. Create Claude Code config
mkdir -p ~/.config/claude-code
cat > ~/.config/claude-code/mcp_config.json <<'EOF'
{
  "mcpServers": {
    "drawbridge": {
      "command": "node",
      "args": ["/Users/tbreschi/Documents/_code/drawbridge/drawbridge-mcp-server/dist/index.js"],
      "env": {
        "DRAWBRIDGE_PROJECT_PATH": "/Users/tbreschi/Documents/_code/drawbridge/demo",
        "DRAWBRIDGE_MODE": "manual"
      }
    }
  }
}
EOF

# 2. Exit current Claude Code session
exit

# 3. Restart Claude Code (run in new terminal)
cd /Users/tbreschi/Documents/_code/drawbridge
claude-code

# 4. Start demo server (run in another new terminal)
cd /Users/tbreschi/Documents/_code/drawbridge/demo
python3 -m http.server 8080

# 5. Open browser to http://localhost:8080
# 6. Press Cmd+Shift+P in browser to connect extension
# 7. Press C to create annotation
```

---

## Success Criteria ✅

You'll know it's working when:

- [ ] MCP server detects your annotation within 1 second
- [ ] I (Claude Code) notify you about the new task
- [ ] I can read the task details (comment, selector, screenshot)
- [ ] I ask for your approval before making changes
- [ ] After approval, I update the code
- [ ] The task status changes to "done" in the extension
- [ ] Your browser shows the implemented change

---

Ready to try it? Let's start with **Step 2** - creating the config file!
