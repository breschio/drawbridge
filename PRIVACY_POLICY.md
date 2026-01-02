# Privacy Policy for Drawbridge

**Last Updated:** January 2, 2026

## Overview

Drawbridge ("the Extension") is a browser extension that helps developers annotate web pages and create visual feedback for AI coding assistants. This privacy policy explains how Drawbridge handles your data.

## Data Collection

### What We Collect

When you use Drawbridge, the following data may be captured **locally on your device**:

| Data Type | Purpose | Storage Location |
|-----------|---------|------------------|
| Screenshots | Visual context for annotations | Your local filesystem |
| Element selectors | CSS/HTML targeting information | Your local filesystem |
| Page URLs | Context for where annotations were made | Your local filesystem |
| User preferences | Extension settings and configuration | Chrome local storage |

### What We Do NOT Collect

Drawbridge does **not** collect, transmit, or store:

- ❌ Personal identification information (name, email, address)
- ❌ Authentication credentials or passwords
- ❌ Financial or payment information
- ❌ Health information
- ❌ Location data
- ❌ Browsing history beyond the current annotation
- ❌ Keystroke logging or user activity monitoring
- ❌ Any data on external servers

## Data Storage

All data captured by Drawbridge is stored **exclusively on your local device**:

- **Chrome Storage API**: Used for extension preferences and settings
- **File System Access API**: Used to save annotations and screenshots to folders you explicitly select

**No data is transmitted to Breschi Co LLC servers or any third-party services.**

## Data Sharing

Drawbridge does not automatically share any data. 

When you create an annotation, the formatted output (screenshot, element info, and your comment) is copied to your clipboard. **You decide** when and where to paste this information, such as into an AI coding assistant like Cursor or Claude Code.

## Third-Party Services

Drawbridge does not integrate with or send data to any third-party analytics, advertising, or tracking services.

The extension loads fonts from Google Fonts (fonts.googleapis.com) for UI styling. This is a standard web font request and does not transmit any user data or extension activity to Google.

## Permissions Explained

Drawbridge requests the following Chrome permissions:

| Permission | Why It's Needed |
|------------|-----------------|
| `activeTab` | To capture screenshots and inspect elements on the current page |
| `storage` | To save your preferences and settings locally |
| `scripting` | To inject the annotation UI overlay onto web pages |
| `host_permissions` (all URLs) | To work on any website you're developing (localhost, staging, production) |

## Data Retention

- **Local data**: Retained until you delete it manually
- **Chrome storage**: Retained until you uninstall the extension or clear extension data
- **No server-side retention**: We do not store any data on external servers

## Your Rights

You have full control over your data:

- **Access**: All data is stored locally and accessible on your device
- **Delete**: Remove annotations by deleting files from your filesystem
- **Uninstall**: Removing the extension clears all Chrome storage data

## Children's Privacy

Drawbridge is a developer tool and is not directed at children under 13. We do not knowingly collect any information from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted to this page with an updated revision date.

## Contact

For questions about this privacy policy or Drawbridge's data practices:

**Breschi Co LLC**  
Email: breschicreative@gmail.com

---

## Summary

🔒 **Your data stays on your device.**  
🚫 **Nothing is sent to our servers.**  
✅ **You control what you share.**

