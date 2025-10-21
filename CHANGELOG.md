# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

