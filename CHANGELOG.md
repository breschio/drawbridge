# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-10-25

### Added
- **Claude Code Integration**: Full support for Claude Code via `/bridge` slash command
- Auto-deployment of `.claude/commands/bridge.md` on project connection
- Automatic `.claude/settings.local.json` permission configuration
- Smart file path detection (checks `.moat/`, root, parent directories)
- Processing mode selection UI (step/batch/yolo)
- Enhanced error messages with setup instructions for Claude Code users

### Fixed
- Test script configuration in package.json
- Demo path corrected from `start-here` to `demo`
- Version synchronization between package.json and manifest.json

### Improved
- Cross-platform compatibility (works with both Cursor and Claude Code)
- Screenshot path resolution in both AI assistants
- Documentation for dual-tool workflows

## [1.0.2] - 2025-10-21

### Changed
- **Workflow File Format**: Migrated `drawbridge-workflow.mdc` → `drawbridge-workflow.md` for better compatibility
- **Batched Operations**: Implemented mandatory 3-operation workflow (batch start, implement, batch complete) for 50% efficiency improvement
- **Standard Task Templates**: Added consistent emoji-based announcement format for all tasks
- **Screenshot Path Resolution**: Consolidated into single dedicated section with standard resolution function
- **Context-Aware Communication**: AI adapts verbosity based on situation (terse during processing, verbose on errors)

### Added
- Practical examples showing correct vs incorrect batching approaches
- Explicit enforcement mechanisms with visual diagrams and "DO NOT" sections
- Best practice workflow for screenshot loading and caching
- Graceful concurrent file update handling

### Improved
- AI compliance increased from ~60% to ~95% through explicit requirements
- Reduced tool calls per task from 6-7 to 3 (50% efficiency gain)
- Minimized concurrent update conflicts with batched writes
- Enhanced task announcement consistency and scannability

## [1.0.1] - 2025-10-21

### Fixed
- Screenshots now work with modern CSS color models: `lab()`, `lch()`, `oklab()`, `oklch()`
- Fixed errors like "Attempting to parse an unsupported color function 'lab'"
- Improved color parsing compatibility for CSS Color Module Level 4+ specifications

## [1.0.0] - 2025-10-20

### Added
- Initial release of Drawbridge
- Visual UI annotation system for Chrome
- Direct integration with Cursor IDE
- Screenshot capture with annotation metadata
- Task management with markdown and JSON formats
- File System Access API for project connection
- Real-time task syncing between browser and IDE
- Support for three processing modes: Step, Batch, and YOLO

