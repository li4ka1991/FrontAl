# FrontAl - AI Agent Instructions

## Project Overview

**FrontAl** is a frontend performance analyzer with three input modes:
- **Paste Mode**: Direct code input (HTML/CSS/JS)
- **Upload Mode**: File-based analysis (.html, .css, .js)
- **URL Audit Mode**: Live site analysis via Lighthouse + static analysis

**Architecture**: Vanilla JS frontend + Node.js/Express backend (Lighthouse runner).

## Architecture Decisions

### URL Mode: Static + Lighthouse Hybrid (Deviation from Original Plan)

**Original Plan**: URL mode was initially designed to be **Lighthouse-only**, skipping static analysis entirely.

**Actual Implementation**: URL mode runs **BOTH static analysis AND Lighthouse**, providing comprehensive coverage:

1. **Resource Fetching**: Backend `/fetch-resources` endpoint extracts HTML/CSS/JS from the target URL
2. **Static Analysis**: Runs all modules (sizeAnalyzer, duplicationDetector, performanceAnalyzer) on fetched resources
3. **Lighthouse Audit**: Runs full Lighthouse performance audit via `/audit` endpoint
4. **Score Combination**: Weighted scoring (50% static + 50% Lighthouse) via `calculateCombinedUrlScore()`
5. **Issue/Recommendation Merging**: Combines findings from both analyses into unified output

**Rationale**: This hybrid approach provides:
- Bundle size insights (not available in Lighthouse alone)
- Code duplication detection (static-only capability)
- Dual validation of performance issues (static patterns + runtime metrics)
- Single comprehensive grade combining both methodologies

**Key Difference**: Paste/Upload modes show static-only results, URL mode shows combined results with Lighthouse cards visible.

## Core Architecture

### Frontend Structure (`/`)
- **`app.js`**: Main orchestration - mode switching, analysis dispatch, UI rendering
- **`index.html`**: Single-page app with three input modes and results grid
- **`modules/`**: Independent analysis engines (no interdependencies)
  - `sizeAnalyzer.js` - Bundle metrics and thresholds
  - `duplicationDetector.js` - Code pattern detection (JS, CSS, HTML)
  - `performanceAnalyzer.js` - Anti-patterns and render-blocking issues
  - `scorer.js` - Combined scoring with `calculateScore()` (static) and `calculateCombinedUrlScore()` (URL mode)
  - `lighthouseClient.js` - Backend API client (audit + resource fetching)
  - `lighthouseAdapter.js` - Lighthouse data normalization

### Backend Structure (`/backend`)
- **`server.js`**: Express server with two POST endpoints:
  - `/audit` - Lighthouse performance audit (Chrome headless)
  - `/fetch-resources` - HTML/CSS/JS extraction from URLs
- **Port**: 3000 (hardcoded)
- **CORS**: Restricted to localhost origins only

## Critical Workflows

### Starting the Backend
```bash
cd backend
npm install  # First time only
npm start    # Runs on http://localhost:3000
```
**Required for URL mode**. Frontend functions in paste/upload modes without backend.

### Testing Strategy
- **Deterministic logic tests**: `tests/manual-tests.js` (browser-based)
- **Test runner**: Open `tests/test-runner.html` in browser
- **Coverage**: 120+ tests across all modules (see `tests/README.md`)
  - **Static analysis**: sizeAnalyzer, duplicationDetector, performanceAnalyzer, scorer
  - **Lighthouse integration**: lighthouseAdapter (metric extraction, category scores, issue/recommendation building, integration tests)
  - **Backend validation**: Mobile-only profile enforcement
- **No automated test runner** - manual execution only

### URL Mode Workflow (Hybrid Analysis)

**Complete execution path** for URL mode analysis:

1. **User Input**: `runLighthouseAnalysis()` triggered with URL
2. **Parallel Fetching**: 
   - `fetchPageResources(url)` → Backend `/fetch-resources` → extracts HTML/CSS/JS
   - `fetchLighthouseAudit(url)` → Backend `/audit` → runs Chrome headless Lighthouse
3. **Static Analysis**: Fetched resources run through:
   - `analyzeSizes()` → Bundle Size & Composition
   - `detectDuplication()` → Duplication Analysis
   - `analyzePerformance()` → Static performance checks
   - `calculateScore()` → Static score (0-100)
4. **Lighthouse Adaptation**: `adaptLighthouseResults()` converts raw Lighthouse JSON to app format
5. **Score Combination**: `calculateCombinedUrlScore(staticScoreResults, lighthouseScoreResults)` applies 50/50 weighting
6. **Issue Merging**: Concatenates static + Lighthouse issues/recommendations arrays
7. **Rendering**: `setResultsMode('combined')` shows all cards (static + Lighthouse)

**Timeout**: 120s frontend, 125s backend (5s buffer)
**Error Handling**: Both endpoints can fail independently; errors render as inline cards with retry

## Key Patterns & Conventions

### Scoring System (URL Mode Specifics)
URL mode uses **combined scoring** (50% static + 50% Lighthouse):
```javascript
// In runLighthouseAnalysis():
const staticScoreResults = calculateScore(sizeResults, duplicationResults, staticPerformanceResults);
const combinedScoreResults = calculateCombinedUrlScore(staticScoreResults, adapted.scoreResults);
```
- Static score: `modules/scorer.js` → `calculateScore()`
- Combined: `modules/scorer.js` → `calculateCombinedUrlScore()`
- Both use shared `generateSummary()` for Recommendations section

### Performance Issues Merging
URL mode **merges issues** from both analyses:
```javascript
mergedPerformanceResults.issues = lighthouseIssues.concat(staticIssues);
mergedPerformanceResults.recommendations = lighthouseRecs.concat(staticRecs);
```

### Module Isolation
- All `modules/*.js` expose functions via `window.*` (IIFE pattern)
- No ES6 modules - vanilla browser globals
- Example: `window.analyzeSizes`, `window.calculateScore`

### CSS Variable Usage Exception
In `duplicationDetector.js`, CSS properties using `var()` are excluded from duplication checks:
```javascript
if (propValue.indexOf('var(') !== -1) continue; // Skip CSS variables
```

### Results Mode Control
`setResultsMode(mode)` in `app.js` controls card visibility:
- `'static'`: Hide Lighthouse cards, hide `.result-card-group`
- `'combined'`: Show all cards (size, duplication, performance, Lighthouse scores, vitals)
- `'lighthouse'`: Legacy mode (compatibility)

## Performance Checks Implemented

### Static Analysis (`performanceAnalyzer.js`)
- Render-blocking resources (scripts without async/defer)
- Excessive JavaScript (bundles >100KB, files >50KB)
- CSS delivery optimization (synchronous stylesheets)
- DOM size warnings (>1500 elements)
- Asset prioritization hints (missing `<link rel="preload">`)
- Large inline SVGs (>5KB)
- Images missing width/height attributes (CLS prevention)

### Lighthouse Integration (`lighthouseAdapter.js`)
- Adapts raw Lighthouse JSON to app format
- Extracts category scores (performance, accessibility, SEO, best-practices)
- Core Web Vitals: FCP, LCP, TBT, CLS, Speed Index, TTI, INP

## Development Rules

### When Editing Analyzers
- **Always update tests** in `tests/manual-tests.js` if changing thresholds
- Preserve function signatures (modules expose via `window.*`)
- Test in browser via `test-runner.html` before committing

### When Adding Performance Checks
1. Add detection logic to `performanceAnalyzer.js`
2. Add test case to `tests/manual-tests.js`
3. Update `tests/README.md` with new threshold/behavior
4. Run browser tests to verify

### When Modifying Scoring
- Static score formula: `max(0, sizeScore + duplicationScore + performanceScore - 200)`
- URL combined: 50/50 weighted average with delta adjustment to `performanceScore`
- Grade thresholds: A(90+), B(75+), C(60+), D(40+), F(0-39)
- **Always preserve `scoreResults.mode`** for UI breakdown rendering

### Backend Changes
- Backend uses **strict validation**: `isValidHttpUrl()`, timeout guards, profile checks
- Lighthouse runs in mobile emulation mode (frozen settings in `MOBILE_LIGHTHOUSE_SETTINGS`)
- CORS is intentionally restrictive - only localhost allowed

## Common Pitfalls

1. **Forgetting backend server**: URL mode requires `npm start` in `/backend`
2. **Breaking module globals**: Never rename `window.*` exports without updating `app.js`
3. **Score summary duplication**: Both static and URL modes use `generateSummary()` - changes affect both
4. **Results not clearing**: `clearResults()` must reset all containers + Lighthouse cards + score tooltip
5. **CSS variable false positives**: Always exclude `var()` from duplication checks

## UI State Management

- **Current mode**: Tracked in `currentMode` variable (`'paste'`, `'upload'`, `'url'`)
- **Mode switching**: `switchMode()` clears inputs, resets results, updates button labels
- **Score breakdown tooltip**: Only shown in combined mode via `getScoreBreakdownText()`
- **Card visibility**: Controlled by `setResultsMode()` + individual card `hidden` class toggles

## File Naming & Organization

- Single-responsibility modules: each analyzer is self-contained
- No build step: direct browser execution (ES5 compatible)
- Backend uses CommonJS (`require`), frontend uses globals
- Tests mirror module structure: `sizeAnalyzer.js` → `SizeAnalyzer Tests` in `manual-tests.js`

---

For subagent routing and frontend standards, see `.github/instructions/company-frontend-standards.instructions.md`.
