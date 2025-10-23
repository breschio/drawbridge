Drawbridge - Visual context for Cursor
==========================================

Make comments in the browser (like in Figma) and send them to Cursor.  This chrome plugin + cursor ruleset connects your browser to your local development project. Comments made on the front end are batched into a markdown file. Run the command "bridge" to process them in Cursor. Simplify your workflow by adding more context to visual edits with Cursor.

🚀 1. Setup
-----------

1.  Download or clone the Drawbridge to your desktop or location of choice

2.  Go to chrome extensions, switch to dev mode, and unpack the extension drawbridge/moat-chrome

3.  Activate the plugin

4.  Pin it for easy access

![db-open-extension](https://github.com/user-attachments/assets/1732a588-5985-45b5-85b6-9a73c21d2b4b)


💬 2. Connect your project
-------------------

1. Click the icon to open Drawbridge

2. Click "Connect" to open your file browser

3. Select the local project folder you want to work in

4. Grant acess to Drawbridge to edit your file

5. Drawbridge can now write to its moat-tasks.mdc and moat-task-detail.json files


💬 3. Make Comments
-------------------

1.  Press `c` in your browser, to turn your cursor into a cross hair

2.  Hover over your page to see selectable DOM elements you can leave comments on

3.  Click an element to leave a comment, type your comment, hit `Submit` or press `Enter`

4.  Tasks will be shown in the `Moat` area on the bottom of the page

5. Tasks will also be synced to Cursor

![db-comments-1](https://github.com/user-attachments/assets/d6a8b63a-21e5-46cc-801d-d7b4f40ff769)



🤖 4. Process with AI
-----------------------

Drawbridge works with **Cursor** and **Claude Code**:

### In Cursor

1.  **Run Drawbridge**: In your editor, simply run the command:

    ```
    bridge
    ```

2.  **Drawbridge** will analyze your tasks, understand dependencies, and begin making edits.

3.  **Approve**: By default, drawbridge processes tasks in **Step** mode - one at a time. You may be asked for approval:

    1.  To begin the task

    2.  To finish the task (updates the status in moat-tasks.md and moat-tasks-detail.json)

4.  **Wait:** You can watch your tasks get updated in the **moat-tasks.md**

5. IF you run into trouble with "bridge" simply be more explicit by saying "use @drawbridge-workflow.mdc to process @moat-tasks.mdc"

![db-process-tasks](https://github.com/user-attachments/assets/da71b412-eee4-4cec-abe5-3b9719e297b2)

### In Claude Code

1.  **Run the slash command** (works in terminal or Cursor with Claude Code):

    ```
    /bridge
    ```

2.  **Choose mode**: Claude will ask for your preferred processing mode:
    -   **step**: One task at a time with approval
    -   **batch**: Group related tasks together
    -   **yolo**: Process all tasks autonomously

3.  **Automatic Setup**: The `/bridge` command is automatically deployed to `.claude/commands/` when you connect your project

**Claude Code Features:**
-   ✅ **Smart error messages** - Helpful guidance if tasks aren't found
-   ✅ **File references** - Tasks include file paths for easy navigation
-   ✅ **Screenshot support** - Visual context from browser annotations
-   ✅ **Git-safe** - Automatically adds `.claude/` and `.moat/` to `.gitignore`
-   ✅ **Status tracking** - Follows `"to do" → "doing" → "done"` lifecycle


👩🏼‍🎨 5. Review your changes
------------------------------

1.  Go back to your browser to see your changes

    1.  Should be automatic if you're using react / next.js

    2.  Refresh the page if you're using html / css / js

2.  Continue making edits to refine your work!

![db-tasks-complete](https://github.com/user-attachments/assets/799c0ad6-da98-4506-8f12-ad338aa1aba3)



📁 Core Files
-------------

-   **`drawbridge-workflow.mdc`**: The main ruleset for the AI. This is where Drawbridge's "brain" is defined.

-   **`moat-tasks.md`**: A human-readable list of your pending tasks.

-   **`moat-tasks-detail.json`**: The raw, detailed data for each task, including selectors and screenshot paths.

-   **`/screenshots`**: Visual context for each annotation, used by the AI to understand your intent.


🎯 Example Workflow
-------------------

1.  **Annotate**:

    -   Click a button → "make this green".

    -   Click the same button → "add more padding".

2.  **Process**: In your editor, run `bridge`.

3.  **AI Analyzes**:

    ```
    🤖 Dependency detected. Processing "make this green" before "add more padding".

    ```

4.  **Review**: The AI reviews your **moat-tasks-detail.json** for details of your comment.

5.  **Approve**: You reply `yes`.

6.  **Repeat**: The AI proceeds to the next dependent task.


🛠️ Advanced Usage & Processing Modes
-------------------------------------

You can control how Drawbridge processes tasks by specifying a mode.

-   **`step bridge`** (Default: Safe & Incremental)

    -   Processes tasks one by one, asking for approval at each step. Perfect for complex changes.

-   **`batch bridge`** (Efficient & Grouped)

    -   Intelligently groups related tasks (e.g., all button styles) and processes them together, asking for a single approval per batch.

-   **`yolo bridge`** (Autonomous & Fast)

    -   **Use with caution.** Processes *all* pending tasks in the correct dependency order *without stopping for approvals*. A full summary is provided at the end.


🎨 Best Practices for Annotations
---------------------------------

-   **Be Specific**: "change font to sans-serif" is better than "change font".

-   **Chain Your Thoughts**: For multi-step changes, create separate but related annotations. The AI is smart enough to understand the order.

    -   *Good*: 1. "make button blue" → 2. "add shadow to the blue button"

    -   *Bad*: 1. "make button blue and add a shadow"

-   **Focus on One Thing**: One annotation should represent one distinct change.


🐛 Troubleshooting
------------------

-   **"Dependency Error"**: This means tasks might be out of order. Check the AI's analysis to see the required sequence.

-   **Task `failed` Status**: If a task fails (especially in `yolo` mode), check `moat-tasks.md`. You can reset its status to `pending` in the `.json` file to retry.

-   **Connection Issues**: If Drawbridge can't find tasks, press `Cmd/Ctrl+Shift+P` in your browser and re-select your project directory to reconnect.

**Happy building with Drawbridge!** 🎯

🙏 Acknowledgements
-------------------

Special thanks to the collaborators and community members who helped improve screenshot reliability and modern color support:

- @breschio – for maintaining the project and reviews
- @jankowtf – for the screenshot persistence reliability fixes and test harness improvements
- @falkfrentzen – for reporting and validating the modern color model issue and suggesting `html2canvas-pro`
