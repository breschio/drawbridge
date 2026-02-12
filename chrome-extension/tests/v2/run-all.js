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

// 5. Stub browser modules that test files reference
global.window = global.window || {};
global.window.MoatTaskStore = null;
global.window.MoatMarkdownGenerator = null;
global.window.MoatPersistence = null;
global.window.MoatSafeStorage = null;

// Try loading the actual utility modules
try {
  // taskStore.js uses an IIFE that attaches to window
  require('../../utils/taskStore.js');
} catch (e) { /* optional */ }

try {
  require('../../utils/markdownGenerator.js');
} catch (e) { /* optional */ }

// 5. Collect runners from each test file
const testFiles = [
  './connection.test.js',
  './tasks.test.js',
  './markdown.test.js',
  './filesystem.test.js',
  './v2-architecture.test.js'
];

(async function main() {
  console.log('🚀 Drawbridge V2 Test Suite');
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
      // Each test file creates a `runner` and registers suites.
      // We need to capture it. The files assign to a local `runner` const,
      // so we'll use a wrapper approach: override TestRunner to collect.
      
      // Clear require cache so each file gets fresh state
      delete require.cache[require.resolve(file)];
      
      // The test files do `const runner = new TestRunner()` at top level,
      // then export nothing. We need to intercept the TestRunner constructor.
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
  process.exit(totalFailed > 0 ? 1 : 0);
})();
