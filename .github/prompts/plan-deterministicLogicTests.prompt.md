# Plan: Deterministic Logic Tests Implementation

This plan creates a comprehensive manual test suite for FrontAl's core analysis functions, covering size calculations, duplication detection, performance heuristics, and scoring logic. Tests will verify threshold boundaries, edge cases, and ensure deterministic behavior across all analysis modules.

## Steps

### 1. Create tests directory structure
- Create `/tests` folder at project root
- Create `tests/manual-tests.js` as main test file
- Add HTML runner `tests/test-runner.html` for browser-based execution (since modules use vanilla JS)

### 2. Implement test framework foundation
- Create lightweight assertion helpers: `assertEqual`, `assertDeepEqual`, `assertTrue`, `assertFalse`
- Create test runner with `describe` and `it` functions
- Add test result collector with pass/fail tracking
- Implement colorized console output (green for pass, red for fail)
- Add test counter and summary statistics

### 3. Size Calculation Tests (testing `modules/sizeAnalyzer.js`)

#### Test `formatBytes` function:
- Edge case: 0 bytes → "0 Bytes"
- Edge case: 1 byte → "1 Bytes"
- Boundary: exactly 1024 bytes → "1 KB"
- Boundary: exactly 1048576 bytes → "1 MB"
- Standard cases: 512 bytes, 2560 bytes, 2097152 bytes
- Decimal precision: verify 2 decimal places (e.g., 1536 → "1.5 KB")

#### Test `analyzeSizes` function:
- Empty files array → verify zero totals, no issues
- Single HTML file (100 bytes) → verify correct breakdown
- Single JS file (300KB) → triggers "Large JavaScript Bundle" error (threshold: 250KB)
- Single CSS file (150KB) → triggers "Large CSS Bundle" warning (threshold: 100KB)
- Mixed files totaling 600KB → triggers "Large Bundle Size" warning (threshold: 500KB)
- JS-heavy bundle (80% JS) → triggers "JavaScript-Heavy Bundle" warning (threshold: 70%)
- Boundary: exactly 500KB total → verify threshold behavior
- Boundary: exactly 250KB JS → verify threshold behavior
- Boundary: exactly 70% JS → verify threshold behavior
- Verify percentage calculations with totalSize = 0 (division handling)
- Verify metrics array format and content
- Multi-file scenario tracking `fileSizes` object

### 4. Duplication Detection Tests (testing `modules/duplicationDetector.js`)

#### Test `parseCssContexts` function:
- Simple CSS (no @media) → returns single 'global' context
- CSS with one @media query → returns global + media context
- CSS with multiple @media queries → returns all contexts
- Nested braces in global CSS → correct depth tracking
- @media at end of file → properly closes
- Empty content → returns empty global context
- Malformed CSS (unclosed braces) → verify graceful handling

#### Test `checkDuplicateSelectors` function:
- No duplicates → no results added
- Same selector twice → adds duplicate warning
- Comma-separated selectors → splits and counts individually
- Selectors with @-rules → skips correctly
- Context name appears in description
- Whitespace normalization (`.class  .item` vs `.class .item`)

#### Test `analyzeJSDuplication` function:
- **Duplicate function bodies**: 2 identical functions (20+ chars) → warning
- Functions < 20 chars → not detected (pattern threshold)
- **Repeated string literals**: string appearing 3 times (15+ chars) → info
- Strings < 15 chars → ignored
- Strings appearing 2 times → ignored (threshold: > 2)
- **Anonymous functions in loops**: `forEach` with inline function → warning
- Loop without inline function → no issue
- **DOM queries**: same `querySelector` 4 times → warning (threshold: > 3)
- Different queries 3 times each → no issue
- Multi-file tracking: verify file names in results

#### Test `analyzeCssDuplication` function:
- **Duplicate selectors**: test via `checkDuplicateSelectors` integration
- **Repeated declarations**: property appearing 6 times → info (threshold: > 5)
- CSS variables (--custom) → excluded from detection
- **Universal selectors**: 2 uses of `*` → warning (threshold: > 1)
- **Deep nesting**: 4+ level selector → warning
- **Vendor prefixes**: 11 prefixes → info message (threshold: > 10)
- Multi-file CSS tracking

#### Test `analyzeHtmlDuplication` function:
- **Repeated structures**: same element 3 times (30+ chars) → info
- Elements < 30 chars → ignored
- Elements appearing twice → ignored (threshold: > 2)
- **Excessive inline styles**: 11 inline styles → warning (threshold: > 10)
- Self-closing tags handling

#### Test `detectDuplication` main function:
- Verify severity sorting: errors before warnings before info
- Multi-file scenario with mixed types
- Empty files → returns empty duplicates array
- Stats tracking: verify `duplicateBlocks` increments

### 5. Heuristic Rule Evaluation Tests (testing `modules/performanceAnalyzer.js`)

#### Test `analyzeHtmlPerformance` function:
- Render-blocking script (`<script>` without async/defer) → error
- External script without async/defer → warning
- 6 large inline styles (50+ chars each) → warning (threshold: > 5)
- 1600 elements → "Large DOM Size" warning (threshold: > 1500)
- Missing viewport meta → info
- Inline script > 1000 bytes → warning
- 4 blocking CSS files → warning (threshold: > 3)
- Scripts with async/defer → no blocking issue
- Boundary: exactly 5 inline styles → no warning
- Boundary: exactly 1500 elements → no warning

#### Test `analyzeCssPerformance` function:
- 6 expensive selectors → warning (threshold: > 5)
- 1 `@import` → error (threshold: > 0)
- 1001 CSS rules → "Large CSS File" warning (threshold: > 1000)
- Animation with `width` property → "Layout-Triggering" info
- Animation with only `transform` → no layout warning
- Boundary: exactly 1000 rules → no warning

#### Test `analyzeJsPerformance` function:
- Synchronous XHR (third param = false) → error
- 21 reflow-triggering properties → warning (threshold: > 20)
- 6 console statements → info (threshold: > 5)
- jQuery detection → "Large Utility Libraries" info
- Lodash/Underscore detection → info
- Moment.js detection → info
- 21 event listeners → info (threshold: > 20)
- 3 `setInterval`, 2 `clearInterval` → memory leak warning
- Equal intervals/clears → no warning

#### Test `generateRecommendations` function:
- JS > 50% of bundle → high priority JS reduction
- CSS > 30% of bundle → medium priority CSS optimization
- Verify always-added recommendations (compression, resource hints)
- Edge: 100% JS bundle
- Edge: 100% CSS bundle

#### Test `analyzePerformance` main function:
- Verify severity sorting
- Multi-file scenario integration
- Empty files → returns empty issues/recommendations

### 6. Score Calculation Tests (testing `modules/scorer.js`)

#### Test size score deductions:
- 1.5MB bundle → -30 points
- 750KB bundle → -20 points
- 300KB bundle → -10 points
- Boundary: exactly 1MB, 500KB, 250KB
- 85% JS → -10 additional points (threshold: > 80%)
- 75% JS → -5 additional points (threshold: > 70%)
- Boundary: exactly 80%, exactly 70%

#### Test duplication score deductions:
- 25 duplicates → -25 points
- 15 duplicates → -15 points
- 8 duplicates → -10 points
- 3 duplicates → -5 points
- 0 duplicates → no deduction
- Boundary: exactly 20, 10, 5 duplicates

#### Test performance score deductions:
- 6 errors → -30 points (5 each, max -25)
- 10 warnings → -20 points (2 each, max -15)
- 10 info → -10 points (1 each, max -5)
- Verify capping: 20 errors should still max at -25
- Mixed: 2 errors, 3 warnings, 4 info → verify calculation

#### Test `calculateScore` integration:
- Perfect score: no issues → 100, grade 'A', category 'good'
- Score boundary 90 → 'A', category 'good'
- Score boundary 75 → 'B', category 'good'
- Score boundary 60 → 'C', category 'warning'
- Score boundary 40 → 'D', category 'warning'
- Score < 40 → 'F', category 'danger'
- Massive deductions → verify score doesn't go negative (Math.max(0, ...))
- Verify deductions array contains all applied deductions
- Verify component scores (sizeScore, duplicationScore, performanceScore)

#### Test `generateSummary` function:
- Score 95 → "Excellent!" message
- Score 80 → "Good job!" message
- Score 65 → "Decent" message
- Score 50 → "Several performance issues" message
- Score 30 → "Significant performance problems" message
- sizeScore 70 → includes bundle size advice
- duplicationScore 70 → includes duplication advice
- performanceScore 70 → includes anti-pattern advice
- All scores > 80 → only base message
- Boundary: exactly 90, 75, 60, 40

### 7. Create test execution helpers
- Mock file objects creator: `createMockFile(name, type, content)`
- Results generators for easy test setup
- Console output formatter with test statistics
- Test suite organization with nesting support

### 8. Add test runner HTML
- Load all module files (`modules/sizeAnalyzer.js`, etc.)
- Load `tests/manual-tests.js`
- Display results in DOM with styled output
- Add expandable test details
- Show pass/fail counts, percentage

## Verification

1. Open `tests/test-runner.html` in browser
2. Check console output shows all test results
3. Verify 100% pass rate for deterministic tests
4. Run tests multiple times to ensure deterministic behavior (same inputs → same outputs)
5. Modify a module function to break a test, verify test catches the failure
6. Check that all edge cases and boundary conditions are covered

## Decisions

- **Browser-based testing**: Modules use vanilla ES5 JavaScript, easier to test in browser than set up Node.js environment (chose simplicity over Node.js test runners)
- **Manual test framework**: Custom lightweight framework instead of external library to avoid dependencies and maintain project simplicity
- **Comprehensive coverage**: Test all documented thresholds, boundaries (±1), and edge cases identified in research to ensure robustness
- **Mock data approach**: Create minimal mock file objects rather than loading real files for faster, more focused unit tests
