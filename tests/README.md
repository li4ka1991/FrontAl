# FrontAl Test Suite

Comprehensive deterministic logic tests for FrontAl's core analysis functions.

## Test Coverage

This test suite provides comprehensive coverage for:

### 1. **Size Analyzer Tests** (`formatBytes`, `analyzeSizes`)
- Byte formatting with proper unit conversion (Bytes, KB, MB)
- Bundle size threshold detection (500KB, 250KB JS, 100KB CSS)
- JavaScript-heavy bundle detection (>70%)
- Percentage calculations and edge cases
- Boundary value testing

### 2. **Duplication Detector Tests**
- **JavaScript Duplication**:
  - Duplicate function bodies (>20 chars)
  - Repeated string literals (>15 chars, >2 occurrences)
  - Anonymous functions in loops
  - Repeated DOM queries (>3 occurrences)
  
- **CSS Duplication**:
  - CSS context parsing (@media queries)
  - Duplicate selectors
  - Repeated property-value pairs (>5 occurrences)
  - Universal selector overuse (>1)
  - Deep selector nesting (4+ levels)
  - Vendor prefix detection (>10)
  
- **HTML Duplication**:
  - Repeated HTML structures (>30 chars, >2 occurrences)
  - Excessive inline styles (>10)

### 3. **Performance Analyzer Tests**
- **HTML Performance**:
  - Render-blocking scripts
  - Synchronous external scripts
  - Excessive inline styles (>5, 50+ chars each)
  - Large DOM size (>1500 elements)
  - Missing viewport meta tag
  - Long inline scripts (>1000 bytes)
  - Multiple render-blocking CSS (>3)
  
- **CSS Performance**:
  - Expensive selectors (>5)
  - @import usage
  - Large CSS files (>1000 rules)
  - Layout-triggering animations
  
- **JavaScript Performance**:
  - Synchronous XMLHttpRequest
  - Forced reflows (>20 occurrences)
  - Console statements (>5)
  - Large utility library detection (jQuery, Lodash, Moment.js)
  - Many event listeners (>20)
  - Memory leak detection (setInterval vs clearInterval)

### 4. **Score Calculation Tests**
- **Size Score Deductions**:
  - 1MB+: -30 points
  - 500KB+: -20 points
  - 250KB+: -10 points
  - 80%+ JS: -10 points (additional)
  - 70%+ JS: -5 points (additional)
  
- **Duplication Score Deductions**:
  - 20+ duplicates: -25 points
  - 10+ duplicates: -15 points
  - 5+ duplicates: -10 points
  - 1+ duplicates: -5 points
  
- **Performance Score Deductions**:
  - Errors: 5 points each (max -25)
  - Warnings: 2 points each (max -15)
  - Info: 1 point each (max -5)
  
- **Grade Mapping**:
  - A: 90-100 (good)
  - B: 75-89 (good)
  - C: 60-74 (warning)
  - D: 40-59 (warning)
  - F: 0-39 (danger)
  
- **Summary Generation**:
  - Score-based messages
  - Component-specific advice

## Running the Tests

### Option 1: Browser (Recommended)

1. Open `test-runner.html` in your web browser:
   ```
   tests/test-runner.html
   ```

2. Click the "Run All Tests" button

3. View results:
   - Statistics cards show pass/fail counts
   - Detailed test results in expandable sections
   - Console output shows individual test execution

### Option 2: Console Only

1. Open `test-runner.html` in your browser

2. Open Browser DevTools (F12)

3. The tests will auto-run and output to console

4. Or manually run:
   ```javascript
   runAllTests()
   ```

## Test Structure

```
tests/
├── manual-tests.js      # All test suites and framework
├── test-runner.html     # Browser-based test runner with UI
└── README.md           # This file
```

## Test Framework

Custom lightweight test framework with:
- `describe(suite, fn)` - Test suite grouping
- `it(name, fn)` - Individual test case
- `assertEqual(actual, expected)` - Value equality
- `assertDeepEqual(actual, expected)` - Deep object equality
- `assertTrue(condition)` - Boolean assertions
- `assertFalse(condition)` - Negative boolean assertions
- `assertContains(array, item)` - Array membership
- `assertGreaterThan(actual, expected)` - Numeric comparison

## Test Helpers

- `createMockFile(name, type, content)` - Creates mock file objects
- `findIssue(issues, titleFragment)` - Finds issue by title
- `findDuplicate(duplicates, titleFragment)` - Finds duplicate by title
- `countBySeverity(issues, severity)` - Counts issues by severity

## Expected Results

All tests are deterministic and should **pass 100%** every time with the same inputs.

Current test count: **100+ test cases**

## Verification Checklist

- ✅ All threshold boundaries tested (exactly at limit, ±1)
- ✅ Edge cases covered (empty arrays, zero values, malformed input)
- ✅ Multi-file scenarios tested
- ✅ Severity sorting verified
- ✅ Deduction capping logic verified
- ✅ Grade mapping boundaries tested
- ✅ Score never goes negative (Math.max safety)
- ✅ Regex pattern edge cases included

## Troubleshooting

**Tests not running:**
- Ensure all module files are present in `../modules/`
- Check browser console for JavaScript errors
- Verify file paths in test-runner.html are correct

**Tests failing:**
- Check if module implementations match expected behavior
- Verify threshold values haven't changed
- Review console output for specific assertion failures

**Browser compatibility:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES5+ JavaScript support
- No transpilation needed

## Adding New Tests

To add new test cases:

1. Open `manual-tests.js`

2. Add a new `describe` block or add `it` cases to existing suites:

```javascript
describe('New Feature Tests', function() {
    it('should test new behavior', function() {
        var result = newFunction(input);
        assertEqual(result, expectedOutput);
    });
});
```

3. Refresh `test-runner.html` to see new tests

## Notes

- Tests use vanilla ES5 JavaScript for maximum compatibility
- No external dependencies required
- Tests run entirely in the browser
- All test data is mocked (no network requests)
- Deterministic: same input always produces same output

## License

Part of the FrontAl project © 2026
