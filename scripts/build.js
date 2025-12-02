#!/usr/bin/env node

/**
 * Drawbridge Chrome Extension Build Script
 *
 * This script packages the Chrome extension for distribution to the Chrome Web Store.
 * It copies necessary files while excluding test files and development artifacts.
 *
 * Usage: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'chrome-extension');
const BUILD_DIR = path.join(ROOT_DIR, 'build', 'chrome-extension');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'tests',
  '.moat',
  '*.test.js',
  'ARCHITECTURE.md',
  'README.md'
];

// Helper function to check if a path should be excluded
function shouldExclude(relativePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(relativePath);
    }
    // Handle exact matches and directory names
    return relativePath.includes(pattern);
  });
}

// Helper function to recursively copy directory with exclusions
function copyDirectory(src, dest, stats = { files: 0, dirs: 0, excluded: 0 }) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    stats.dirs++;
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(SOURCE_DIR, srcPath);

    // Check if this path should be excluded
    if (shouldExclude(relativePath)) {
      console.log(`  ⊗ Excluded: ${relativePath}`);
      stats.excluded++;
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, stats);
    } else {
      fs.copyFileSync(srcPath, destPath);
      stats.files++;
      console.log(`  ✓ Copied: ${relativePath}`);
    }
  }

  return stats;
}

// Helper function to create zip file
function createZipFile(sourceDir, outputPath) {
  const command = process.platform === 'win32'
    ? `powershell Compress-Archive -Path "${sourceDir}\\*" -DestinationPath "${outputPath}" -Force`
    : `cd "${sourceDir}" && zip -r "${outputPath}" . -x "*.DS_Store"`;

  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error creating zip file:', error.message);
    return false;
  }
}

// Helper function to get version from manifest.json
function getVersion() {
  try {
    const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest.version;
  } catch (error) {
    console.error('Error reading version from manifest.json:', error.message);
    return '1.0.0';
  }
}

// Helper function to format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Main build function
function build() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Drawbridge Chrome Extension Build Script            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const version = getVersion();
  const zipFileName = `drawbridge-v${version}.zip`;
  const zipPath = path.join(DIST_DIR, zipFileName);

  console.log(`📦 Building version: ${version}\n`);

  // Step 1: Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    console.log('  ✓ Removed previous build directory\n');
  }

  // Step 2: Create build and dist directories
  console.log('📁 Creating build directories...');
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log('  ✓ Build and dist directories ready\n');

  // Step 3: Copy files
  console.log('📋 Copying extension files...');
  const stats = copyDirectory(SOURCE_DIR, BUILD_DIR);
  console.log(`\n  ✓ Copied ${stats.files} files and ${stats.dirs} directories`);
  console.log(`  ⊗ Excluded ${stats.excluded} items\n`);

  // Step 4: Create zip file
  console.log('🗜️  Creating distribution package...');
  const success = createZipFile(BUILD_DIR, zipPath);

  if (success && fs.existsSync(zipPath)) {
    const zipStats = fs.statSync(zipPath);
    console.log(`  ✓ Created: ${zipFileName}`);
    console.log(`  📏 Size: ${formatSize(zipStats.size)}\n`);

    // Step 5: Print summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Build Summary                                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`  Version:        ${version}`);
    console.log(`  Output:         ${path.relative(ROOT_DIR, zipPath)}`);
    console.log(`  Package Size:   ${formatSize(zipStats.size)}`);
    console.log(`  Files:          ${stats.files}`);
    console.log(`  Directories:    ${stats.dirs}`);
    console.log(`  Excluded:       ${stats.excluded}`);
    console.log('\n✅ Build completed successfully!\n');
    console.log('📤 Ready to upload to Chrome Web Store');
    console.log(`   → ${zipPath}\n`);

  } else {
    console.error('\n❌ Build failed: Could not create zip file\n');
    process.exit(1);
  }
}

// Run build if this script is executed directly
if (require.main === module) {
  try {
    build();
  } catch (error) {
    console.error('\n❌ Build failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { build };
