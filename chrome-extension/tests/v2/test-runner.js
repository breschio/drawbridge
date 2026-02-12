/**
 * Simple Test Runner for Drawbridge V2
 * 
 * Provides a minimal test framework without npm dependencies.
 * Inspired by Jest/Mocha but simplified for browser environment.
 */

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    this.failedTests = [];
  }

  /**
   * Define a test suite
   * @param {string} name - Suite name
   * @param {Function} fn - Suite function containing tests
   */
  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeEachFn: null,
      afterEachFn: null,
      beforeAllFn: null,
      afterAllFn: null
    };

    this.suites.push(suite);
    this.currentSuite = suite;

    // Execute suite definition to collect tests
    fn();

    this.currentSuite = null;
  }

  /**
   * Define a test case
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error('it() must be called inside describe()');
    }

    this.currentSuite.tests.push({
      name,
      fn,
      skip: false
    });
  }

  /**
   * Define a skipped test
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  xit(name, fn) {
    if (!this.currentSuite) {
      throw new Error('xit() must be called inside describe()');
    }

    this.currentSuite.tests.push({
      name,
      fn,
      skip: true
    });
  }

  /**
   * Run before each test in current suite
   */
  beforeEach(fn) {
    if (!this.currentSuite) {
      throw new Error('beforeEach() must be called inside describe()');
    }
    this.currentSuite.beforeEachFn = fn;
  }

  /**
   * Run after each test in current suite
   */
  afterEach(fn) {
    if (!this.currentSuite) {
      throw new Error('afterEach() must be called inside describe()');
    }
    this.currentSuite.afterEachFn = fn;
  }

  /**
   * Run before all tests in current suite
   */
  beforeAll(fn) {
    if (!this.currentSuite) {
      throw new Error('beforeAll() must be called inside describe()');
    }
    this.currentSuite.beforeAllFn = fn;
  }

  /**
   * Run after all tests in current suite
   */
  afterAll(fn) {
    if (!this.currentSuite) {
      throw new Error('afterAll() must be called inside describe()');
    }
    this.currentSuite.afterAllFn = fn;
  }

  /**
   * Run all test suites
   */
  async run() {
    console.log('🧪 Starting Test Runner...\n');

    for (const suite of this.suites) {
      console.log(`\n📦 ${suite.name}`);

      // Run beforeAll
      if (suite.beforeAllFn) {
        try {
          await suite.beforeAllFn();
        } catch (error) {
          console.error(`❌ beforeAll failed: ${error.message}`);
          continue;
        }
      }

      // Run tests
      for (const test of suite.tests) {
        if (test.skip) {
          console.log(`  ⏭️  ${test.name} (skipped)`);
          this.stats.skipped++;
          continue;
        }

        this.stats.total++;

        // Run beforeEach
        if (suite.beforeEachFn) {
          try {
            await suite.beforeEachFn();
          } catch (error) {
            console.error(`  ❌ ${test.name}`);
            console.error(`     beforeEach failed: ${error.message}`);
            this.stats.failed++;
            this.failedTests.push({ suite: suite.name, test: test.name, error });
            continue;
          }
        }

        // Run test
        try {
          await test.fn();
          console.log(`  ✅ ${test.name}`);
          this.stats.passed++;
        } catch (error) {
          console.error(`  ❌ ${test.name}`);
          console.error(`     ${error.message}`);
          if (error.stack) {
            console.error(`     ${error.stack.split('\n').slice(1, 3).join('\n     ')}`);
          }
          this.stats.failed++;
          this.failedTests.push({ suite: suite.name, test: test.name, error });
        }

        // Run afterEach
        if (suite.afterEachFn) {
          try {
            await suite.afterEachFn();
          } catch (error) {
            console.error(`  ⚠️  afterEach failed: ${error.message}`);
          }
        }
      }

      // Run afterAll
      if (suite.afterAllFn) {
        try {
          await suite.afterAllFn();
        } catch (error) {
          console.error(`❌ afterAll failed: ${error.message}`);
        }
      }
    }

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total:   ${this.stats.total}`);
    console.log(`✅ Passed: ${this.stats.passed}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log('='.repeat(50));

    if (this.failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.failedTests.forEach(({ suite, test, error }) => {
        console.log(`  • ${suite} → ${test}`);
        console.log(`    ${error.message}`);
      });
    }

    const passRate = this.stats.total > 0 
      ? ((this.stats.passed / this.stats.total) * 100).toFixed(1)
      : 0;
    
    console.log(`\n📈 Pass Rate: ${passRate}%`);
    
    if (this.stats.failed === 0) {
      console.log('\n🎉 All tests passed!');
    }
  }

  /**
   * Get test results
   */
  getResults() {
    return {
      stats: this.stats,
      failedTests: this.failedTests,
      passed: this.stats.failed === 0
    };
  }
}

// Assertion helpers
class Expect {
  constructor(actual) {
    this.actual = actual;
    this.isNot = false;
  }

  get not() {
    this.isNot = true;
    return this;
  }

  toBe(expected) {
    const pass = this.actual === expected;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to be ${JSON.stringify(expected)}`
      );
    }
  }

  toEqual(expected) {
    const pass = JSON.stringify(this.actual) === JSON.stringify(expected);
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to equal ${JSON.stringify(expected)}`
      );
    }
  }

  toBeTruthy() {
    const pass = !!this.actual;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to be truthy`
      );
    }
  }

  toBeFalsy() {
    const pass = !this.actual;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to be falsy`
      );
    }
  }

  toBeNull() {
    const pass = this.actual === null;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to be null`
      );
    }
  }

  toBeUndefined() {
    const pass = this.actual === undefined;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to be undefined`
      );
    }
  }

  toContain(item) {
    const pass = Array.isArray(this.actual) 
      ? this.actual.includes(item)
      : this.actual.indexOf(item) !== -1;
    
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not ' : ''}to contain ${JSON.stringify(item)}`
      );
    }
  }

  toHaveLength(length) {
    const pass = this.actual.length === length;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected length ${this.actual.length} ${this.isNot ? 'not ' : ''}to be ${length}`
      );
    }
  }

  toHaveProperty(property, value) {
    const hasProperty = this.actual.hasOwnProperty(property);
    
    if (!hasProperty) {
      throw new Error(
        `Expected object to have property "${property}"`
      );
    }

    if (value !== undefined) {
      const pass = this.actual[property] === value;
      if ((pass && this.isNot) || (!pass && !this.isNot)) {
        throw new Error(
          `Expected property "${property}" ${this.isNot ? 'not ' : ''}to be ${JSON.stringify(value)}, got ${JSON.stringify(this.actual[property])}`
        );
      }
    }
  }

  toThrow(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new Error('toThrow() requires a function');
    }

    let didThrow = false;
    let thrownError = null;

    try {
      this.actual();
    } catch (error) {
      didThrow = true;
      thrownError = error;
    }

    if ((didThrow && this.isNot) || (!didThrow && !this.isNot)) {
      throw new Error(
        `Expected function ${this.isNot ? 'not ' : ''}to throw`
      );
    }

    if (expectedError && didThrow) {
      if (typeof expectedError === 'string') {
        if (!thrownError.message.includes(expectedError)) {
          throw new Error(
            `Expected error message to include "${expectedError}", got "${thrownError.message}"`
          );
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(thrownError.message)) {
          throw new Error(
            `Expected error message to match ${expectedError}, got "${thrownError.message}"`
          );
        }
      }
    }
  }

  toBeGreaterThan(expected) {
    const pass = this.actual > expected;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be greater than ${expected}`
      );
    }
  }

  toBeLessThan(expected) {
    const pass = this.actual < expected;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be less than ${expected}`
      );
    }
  }

  toBeInstanceOf(constructor) {
    const pass = this.actual instanceof constructor;
    if ((pass && this.isNot) || (!pass && !this.isNot)) {
      throw new Error(
        `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be instance of ${constructor.name}`
      );
    }
  }
}

function expect(actual) {
  return new Expect(actual);
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestRunner, expect };
} else {
  window.TestRunner = TestRunner;
  window.expect = expect;
}
