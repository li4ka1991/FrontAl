# FrontAl

**Frontend Performance & Bundle Analyzer**

FrontAl is a comprehensive web-based tool for analyzing frontend code performance, bundle composition, and quality issues. It combines static code analysis with Google Lighthouse audits to provide actionable insights for optimizing web applications.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)

## Features

### 📊 Three Analysis Modes

1. **Paste Mode** - Directly paste HTML, CSS, and JavaScript code for instant analysis
2. **Upload Mode** - Drag & drop or select files (.html, .css, .js) for batch analysis
3. **URL Audit Mode** - Analyze live websites with combined static + Lighthouse analysis

### 🔍 Analysis Capabilities

- **Bundle Size Analysis** - Total size, composition breakdown (HTML/CSS/JS), and optimization recommendations
- **Duplication Detection** - Identifies repeated code patterns in JavaScript, CSS, and HTML
- **Performance Issues** - Detects render-blocking resources, excessive JavaScript, CSS delivery problems, large DOM, missing asset hints, and more
- **Lighthouse Integration** - Full performance, accessibility, SEO, and best practices audits
- **Core Web Vitals** - LCP, FCP, TBT, CLS, Speed Index, TTI, INP metrics
- **Combined Scoring** - Weighted scoring system (50% static + 50% Lighthouse for URL mode)

## Getting Started

### Prerequisites

- **Node.js** 18+ (required for URL mode backend)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FrontAl
   ```

2. **Install backend dependencies** (for URL mode)
   ```bash
   cd backend
   npm install
   ```

3. **Start the backend server** (optional, only needed for URL mode)
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3000`

4. **Open the frontend**
   - Simply open `index.html` in your browser
   - No build step required - uses vanilla JavaScript

## Usage

### Paste Mode

1. Click **"Paste Code"** mode button
2. Paste your HTML, CSS, and JavaScript code into the respective text areas
3. Click **"Analyze Code"**
4. View results: bundle size, duplication analysis, performance issues, and recommendations

### Upload Mode

1. Click **"Upload Files"** mode button
2. Drag & drop files or click to browse
3. Select `.html`, `.css`, and/or `.js` files
4. Click **"Analyze Code"**
5. Review comprehensive analysis results

### URL Audit Mode

1. **Ensure backend is running** (`cd backend && npm start`)
2. Click **"Audit URL"** mode button
3. Enter a full URL (must start with `http://` or `https://`)
4. Click **"Analyze URL"**
5. View combined results:
   - Static analysis (bundle size, duplication)
   - Lighthouse scores (Performance, Accessibility, SEO, Best Practices)
   - Core Web Vitals metrics
   - Performance issues from both analyses
   - Combined performance score (50% static + 50% Lighthouse)

## Architecture

### Frontend (`/`)

- **`index.html`** - Single-page application structure
- **`styles.css`** - Mobile-first CSS with CSS custom properties
- **`app.js`** - Main orchestration and UI logic
- **`modules/`** - Independent analysis engines:
  - `sizeAnalyzer.js` - Bundle metrics and composition
  - `duplicationDetector.js` - Code pattern detection
  - `performanceAnalyzer.js` - Static performance checks
  - `scorer.js` - Scoring algorithms
  - `lighthouseClient.js` - Backend API client
  - `lighthouseAdapter.js` - Lighthouse data normalization

**Tech Stack**: Vanilla JavaScript (ES5 compatible), no dependencies, no build step

### Backend (`/backend`)

- **`server.js`** - Express server with two endpoints:
  - `POST /audit` - Runs Lighthouse audit on provided URL
  - `POST /fetch-resources` - Extracts HTML/CSS/JS from URL for static analysis
  - `GET /` - Status endpoint

**Tech Stack**: Node.js, Express, Lighthouse, Chrome Launcher

**Port**: 3000 (hardcoded)  
**CORS**: Restricted to localhost origins only  
**Timeout**: 120s frontend, 125s backend

## Testing

### Manual Browser Tests

FrontAl uses deterministic browser-based tests with no automated runner.

1. **Open test runner**
   ```bash
   # From project root, open in browser:
   tests/test-runner.html
   ```

2. **View results**
   - Tests run automatically on page load
   - 120+ test cases covering all modules
   - Green = Pass, Red = Fail
   - See `tests/README.md` for detailed coverage

### Test Coverage

- **Static Analysis**: sizeAnalyzer, duplicationDetector, performanceAnalyzer, scorer
- **Lighthouse Integration**: lighthouseAdapter (metric extraction, category scores, issue/recommendation building)
- **Backend Validation**: Mobile-only profile enforcement

## Performance Checks

### Static Analysis

- ✓ Render-blocking resources (scripts without async/defer)
- ✓ Excessive JavaScript (bundles >100KB, files >50KB)
- ✓ CSS delivery optimization (synchronous stylesheets)
- ✓ DOM size warnings (>1500 elements)
- ✓ Asset prioritization hints (missing preload/prefetch)
- ✓ Large inline SVGs (>5KB)
- ✓ Images missing width/height (CLS prevention)

### Lighthouse Metrics

- ✓ Performance category score
- ✓ Accessibility category score
- ✓ SEO category score
- ✓ Best Practices category score
- ✓ Core Web Vitals: FCP, LCP, TBT, CLS, Speed Index, TTI, INP

## Scoring System

### Static Mode (Paste/Upload)
```
Score = max(0, sizeScore + duplicationScore + performanceScore - 200)
```
**Range**: 0-100  
**Grades**: A (90+), B (75+), C (60+), D (40+), F (0-39)

### Combined Mode (URL Audit)
```
Score = (staticScore × 50%) + (lighthouseScore × 50%)
```
Combines static analysis with runtime Lighthouse metrics for comprehensive grading.

## Development

### Project Structure
```
FrontAl/
├── index.html              # Main app
├── styles.css              # Styling
├── app.js                  # Core logic
├── modules/                # Analysis modules
│   ├── sizeAnalyzer.js
│   ├── duplicationDetector.js
│   ├── performanceAnalyzer.js
│   ├── scorer.js
│   ├── lighthouseClient.js
│   └── lighthouseAdapter.js
├── backend/                # Lighthouse server
│   ├── server.js
│   └── package.json
├── tests/                  # Test suite
│   ├── test-runner.html
│   ├── manual-tests.js
│   └── README.md
└── .github/
    ├── copilot-instructions.md
    ├── instructions/
    └── prompts/
```

### Adding New Performance Checks

1. Add detection logic to `modules/performanceAnalyzer.js`
2. Add test case to `tests/manual-tests.js`
3. Update `tests/README.md` with new threshold/behavior
4. Run browser tests to verify

### Module Conventions

- All modules expose functions via `window.*` (global pattern)
- No ES6 modules - browser-compatible vanilla JS
- Each module is self-contained with no interdependencies
- Tests use auto-skip pattern for optional modules

## API Reference

### Backend Endpoints

#### `POST /audit`
Runs a Lighthouse audit on the provided URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "requestId": "abc123",
  "url": "https://example.com",
  "fetchedAt": "2026-02-23T12:00:00.000Z",
  "summary": { ... },
  "lighthouse": { ... }
}
```

#### `POST /fetch-resources`
Extracts HTML, CSS, and JavaScript from a URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "html": "<!DOCTYPE html>...",
  "css": "body { ... }",
  "js": "function main() { ... }"
}
```

## Browser Compatibility

- ✓ Chrome/Edge 90+
- ✓ Firefox 88+
- ✓ Safari 14+
- ✓ Mobile browsers (responsive design)

## Known Limitations

- **URL Mode requires backend**: Lighthouse audits need the Node.js server running
- **No persistent storage**: All analysis is session-based
- **File size limits**: Large files (>10MB) may cause performance issues
- **Same-origin limitations**: URL mode fetches are server-side to avoid CORS

## Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # macOS/Linux

# Kill process and restart
cd backend
npm start
```

### URL mode shows "backend not running" error
1. Verify backend is running: `http://localhost:3000`
2. Check console for CORS/network errors
3. Ensure URL uses `http://` or `https://`

### Test failures
- Open `tests/test-runner.html` directly in browser
- Check console for module loading errors
- Some tests auto-skip if modules aren't loaded

## Acknowledgments

- Built with vanilla JavaScript for maximum compatibility
- Powered by [Google Lighthouse](https://github.com/GoogleChrome/lighthouse)
- Uses [Chrome Launcher](https://github.com/GoogleChrome/chrome-launcher) for headless audits

---

**Made with ❤️ for frontend performance optimization**
