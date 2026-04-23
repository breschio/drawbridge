# Drawbridge V2 Test Framework

## Overview

This is a lightweight test framework for Drawbridge V2 that runs without npm dependencies. It provides comprehensive coverage of all Jobs-to-be-Done (JTBD) extracted from the V1 codebase.

## Architecture

### Test Runner (`test-runner.js`)
- Minimal Jest/Mocha-style test framework
- Supports `describe`, `it`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- Built-in assertion library with `expect()` API
- No external dependencies

### Mocks (`chrome-mock.js`)
- Chrome Extension API mocks (`chrome.runtime`, `chrome.tabs`, `chrome.storage`, etc.)
- File System Access API mocks (`showDirectoryPicker`, directory handles, file handles)
- IndexedDB mocks for persistence testing
- DOM mocks for browser environment

### Test Files

1. **`connection.test.js`** - JTBD-01 to JTBD-13
   - Connection & Project Setup
   - Directory selection
   - Template deployment
   - Persistence & restoration

2. **`tasks.test.js`** - JTBD-42 to JTBD-56
   - Task Management (CRUD)
   - Task creation
   - Status updates
   - Deduplication
   - Statistics

3. **`markdown.test.js`** - JTBD-57 to JTBD-66
   - Markdown Generation
   - Task formatting
   - Checkbox conversion
   - Comment truncation
   - File writing

4. **`run-all.js`**
   - Entry point for running all tests
   - Generates comprehensive report
   - Updates JTBD status

## Running Tests

### Option 1: Browser Console (Recommended)

1. Open your browser and navigate to a page
2. Load the utility files first (in order):
   ```javascript
   // Load utilities
   // These should be loaded via content_script.js normally
   // For testing, load them manually or ensure they're available
   ```

3. Load test framework:
   ```html
   <script src="tests/v2/chrome-mock.js"></script>
   <script src="tests/v2/test-runner.js"></script>
   ```

4. Load test files:
   ```html
   <script src="tests/v2/connection.test.js"></script>
   <script src="tests/v2/tasks.test.js"></script>
   <script src="tests/v2/markdown.test.js"></script>
   ```

5. Run all tests:
   ```html
   <script src="tests/v2/run-all.js"></script>
   ```

### Option 2: Node.js Environment

```bash
# Install Node.js if not already installed
# No npm packages needed!

# Run tests
node tests/v2/run-all.js
```

Note: You'll need to load the utility modules (taskStore.js, markdownGenerator.js, etc.) before running tests.

### Option 3: Test HTML Page

Create `tests/v2/test-runner.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Drawbridge V2 Tests</title>
</head>
<body>
  <h1>Drawbridge V2 Test Runner</h1>
  <p>Open console to see test results...</p>

  <!-- Load utilities (adjust paths as needed) -->
  <script src="../../utils/safeStorage.js"></script>
  <script src="../../utils/taskStore.js"></script>
  <script src="../../utils/markdownGenerator.js"></script>
  <script src="../../utils/persistence.js"></script>
  
  <!-- Load test framework -->
  <script src="chrome-mock.js"></script>
  <script src="test-runner.js"></script>
  
  <!-- Load tests -->
  <script src="connection.test.js"></script>
  <script src="tasks.test.js"></script>
  <script src="markdown.test.js"></script>
  
  <!-- Run all tests -->
  <script src="run-all.js"></script>
</body>
</html>
```

Then open in browser: `file:///path/to/tests/v2/test-runner.html`

## Test Structure

Each test file follows this pattern:

```javascript
const runner = new TestRunner();
const { describe, it, beforeEach, afterEach, expect } = (() => {
  return {
    describe: runner.describe.bind(runner),
    it: runner.it.bind(runner),
    beforeEach: runner.beforeEach.bind(runner),
    afterEach: runner.afterEach.bind(runner),
    expect
  };
})();

describe('JTBD-XX: Job description', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
  });

  afterEach(() => {
    mocks.reset();
  });

  it('should do something', () => {
    // Test code
    expect(actual).toBe(expected);
  });
});
```

## Assertion API

```javascript
expect(value).toBe(expected)              // Strict equality (===)
expect(value).toEqual(expected)           // Deep equality (JSON.stringify)
expect(value).toBeTruthy()                // Truthy check
expect(value).toBeFalsy()                 // Falsy check
expect(value).toBeNull()                  // Null check
expect(value).toBeUndefined()             // Undefined check
expect(array).toContain(item)             // Array/string contains
expect(array).toHaveLength(length)        // Length check
expect(obj).toHaveProperty(prop, value)   // Property check
expect(fn).toThrow(error)                 // Exception check
expect(value).toBeInstanceOf(constructor) // Instance check

// Negation
expect(value).not.toBe(expected)
```

## Adding New Tests

1. **Identify the JTBD** from `JOBS-TO-BE-DONE.md`
2. **Create or add to test file** for the appropriate category
3. **Write test case**:
   ```javascript
   describe('JTBD-XX: Job description', () => {
     it('should verify specific behavior', () => {
       // Arrange
       const input = setupTestData();
       
       // Act
       const result = functionUnderTest(input);
       
       // Assert
       expect(result).toBe(expected);
     });
   });
   ```
4. **Update `run-all.js`** if needed to include new test file
5. **Run tests** and verify
6. **Update JTBD status** in `JOBS-TO-BE-DONE.md`

## Debugging Tests

### Enable Verbose Logging

```javascript
// In chrome-mock.js
const mocks = setupMocks();
mocks.chromeMock.enableDebug();
```

### Check Available Modules

```javascript
console.log('TaskStore:', !!window.MoatTaskStore);
console.log('MarkdownGenerator:', !!window.MoatMarkdownGenerator);
console.log('Persistence:', !!window.MoatPersistence);
```

### Inspect Test Results

```javascript
const results = await runner.run();
console.log(results.stats);
console.log(results.failedTests);
```

## Coverage Goals

- **161 total JTBDs** identified from V1 codebase
- **~135 V2-applicable JTBDs** (excluding V1 sidebar-specific)
- **Target: 80%+ coverage** for V2 migration

## Current Status

Run tests to see current status. Results will show:
- ✅ Passing tests
- ❌ Failing tests
- ⏳ Not yet tested
- 🚫 Not applicable to V2

## Continuous Testing

For V2 development:
1. Write tests BEFORE implementing features (TDD)
2. Run tests AFTER each change
3. Update JTBD status as tests pass
4. Aim for 100% pass rate before V2 release

## Troubleshooting

### "Module not found" errors
- Ensure utility files are loaded before tests
- Check file paths in script tags
- Verify files exist in expected locations

### Tests fail with "not available" messages
- Utility modules (TaskStore, MarkdownGenerator, etc.) are not loaded
- Load them before running tests

### File System Access API errors
- Mocks should handle this automatically
- Verify `setupMocks()` is called in `beforeEach`

### IndexedDB errors
- Mocks should handle this automatically
- Check that `indexedDB` is properly mocked

## Contributing

When adding tests:
1. Follow existing patterns
2. Reference JTBD ID in test name
3. Keep tests focused and isolated
4. Use mocks to avoid side effects
5. Document complex test logic

## License

Same as Drawbridge project.
