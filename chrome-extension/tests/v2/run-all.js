/**
 * Run All V2 Tests (Node.js)
 *
 * Sets up globals to match browser environment, then loads and runs each test file.
 */

// 1. Load test framework + mocks
const { TestRunner, expect } = require('./test-runner.js');
const { setupMocks } = require('./chrome-mock.js');

// 2. Make them global (test files expect browser-style globals)
global.TestRunner = TestRunner;
global.expect = expect;
global.setupMocks = setupMocks;

// 3. Setup initial mocks so chrome/window/document exist
const mocks = setupMocks();

// 4. Ensure showDirectoryPicker is on window
global.window.showDirectoryPicker = global.showDirectoryPicker;

// 5. Load utility modules and wire them to window.* globals
//    The modules use `module.exports` in Node.js, so require() returns
//    the exports but never sets window.*. We bridge that here.
try {
  const taskStoreModule = require('../../utils/taskStore.js');
  global.window.MoatTaskStore = taskStoreModule;
  console.log('✅ Loaded: MoatTaskStore');
} catch (e) {
  console.warn('⚠️  Could not load taskStore.js:', e.message);
  global.window.MoatTaskStore = null;
}

try {
  const markdownModule = require('../../utils/markdownGenerator.js');
  global.window.MoatMarkdownGenerator = markdownModule;
  console.log('✅ Loaded: MoatMarkdownGenerator');
} catch (e) {
  console.warn('⚠️  Could not load markdownGenerator.js:', e.message);
  global.window.MoatMarkdownGenerator = null;
}

try {
  const persistenceModule = require('../../utils/persistence.js');
  global.window.MoatPersistence = persistenceModule.MoatPersistence;
  console.log('✅ Loaded: MoatPersistence');
} catch (e) {
  console.warn('⚠️  Could not load persistence.js:', e.message);
  global.window.MoatPersistence = null;
}

try {
  const safeStorageModule = require('../../utils/safeStorage.js');
  global.window.MoatSafeStorage = safeStorageModule.MoatSafeStorage;
  console.log('✅ Loaded: MoatSafeStorage');
} catch (e) {
  console.warn('⚠️  Could not load safeStorage.js:', e.message);
  global.window.MoatSafeStorage = null;
}

// 6. Collect runners from each test file
const testFiles = [
  './connection.test.js',
  './tasks.test.js',
  './markdown.test.js',
  './filesystem.test.js',
  './v2-architecture.test.js'
];

(async function main() {
  console.log('\n🚀 Drawbridge V2 Test Suite');
  console.log('='.repeat(60));
  console.log(`Running ${testFiles.length} test files...\n`);

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const allFailures = [];

  for (const file of testFiles) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${file}`);
    console.log('─'.repeat(60));

    try {
      // Clear require cache so each file gets fresh state
      delete require.cache[require.resolve(file)];

      // Intercept TestRunner constructor to capture the runner instance
      let capturedRunner = null;
      const OrigRunner = TestRunner;

      global.TestRunner = class extends OrigRunner {
        constructor() {
          super();
          capturedRunner = this;
        }
      };

      require(file);

      global.TestRunner = OrigRunner;

      if (capturedRunner) {
        await capturedRunner.run();
        const results = capturedRunner.getResults();
        totalTests += results.stats.total;
        totalPassed += results.stats.passed;
        totalFailed += results.stats.failed;
        totalSkipped += results.stats.skipped;
        allFailures.push(...results.failedTests.map(f => ({ ...f, file })));
      } else {
        console.log('  ⚠️  No test runner found in file');
      }
    } catch (error) {
      console.error(`  ❌ Failed to load: ${error.message}`);
      console.error(`     ${error.stack?.split('\n').slice(1, 3).join('\n     ')}`);
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 OVERALL RESULTS');
  console.log('='.repeat(60));
  console.log(`Total:     ${totalTests}`);
  console.log(`✅ Passed:  ${totalPassed}`);
  console.log(`❌ Failed:  ${totalFailed}`);
  console.log(`⏭️  Skipped: ${totalSkipped}`);

  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  console.log(`\n📈 Pass Rate: ${passRate}%`);

  if (allFailures.length > 0) {
    console.log('\n❌ Failures:');
    allFailures.forEach(({ suite, test, error, file }) => {
      console.log(`  • [${file}] ${suite} → ${test}`);
      console.log(`    ${error.message}`);
    });
  }

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed!');
  }

  console.log('='.repeat(60));

  // Save results to file
  const fs = require('fs');
  const pathMod = require('path');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let commit = 'unknown';
  try {
    commit = require('child_process').execSync('git rev-parse --short HEAD', { cwd: pathMod.resolve(__dirname, '../../../') }).toString().trim();
  } catch(e) {}
  const resultsDir = pathMod.resolve(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  const resultsFile = pathMod.join(resultsDir, `unit-${timestamp}-${commit}.md`);

  let md = `# Unit Test Results\n\n`;
  md += `- **Date:** ${new Date().toISOString()}\n`;
  md += `- **Commit:** ${commit}\n`;
  md += `- **Branch:** v2\n`;
  md += `- **Total:** ${totalTests} | **Passed:** ${totalPassed} | **Failed:** ${totalFailed} | **Skipped:** ${totalSkipped}\n`;
  md += `- **Pass Rate:** ${passRate}%\n\n`;

  if (allFailures.length > 0) {
    md += `## Failures\n\n`;
    md += `| File | Suite | Test | Error |\n`;
    md += `|------|-------|------|-------|\n`;
    allFailures.forEach(({ file, suite, test, error }) => {
      md += `| ${file} | ${suite} | ${test} | ${error.message.replace(/\|/g, '\\|')} |\n`;
    });
  } else {
    md += `## ✅ All tests passed!\n`;
  }

  fs.writeFileSync(resultsFile, md);
  console.log(`\n📄 Results saved: ${resultsFile}`);

  process.exit(totalFailed > 0 ? 1 : 0);
})();
