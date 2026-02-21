# Plan: Add Node.js Lighthouse Backend

Add a minimal Express backend that runs Lighthouse CLI audits on user-provided URLs. Frontend gets a new "URL" input mode that sends POST requests to `/audit` and displays full Lighthouse reports (performance, accessibility, SEO, best practices). Static analysis remains available for paste/upload modes.

**Key decisions:**
- **URL mode is Lighthouse-only** - paste/upload continue using static analysis
- **Full report** - all Lighthouse categories, not just performance
- **120s timeout** - accommodates slow sites
- **Inline error cards** - failed audits render as result cards with retry button

**Steps**

1. **Create backend structure** 
   - New `backend/` folder at workspace root
   - `backend/package.json` with dependencies: `express`, `cors`, `lighthouse`, `chrome-launcher`
   - `backend/server.js` as main entry point

2. **Implement POST /audit endpoint** in `backend/server.js`
   - Accept `{ url: string }` in request body
   - Validate URL format (must be http/https)
   - Launch Lighthouse CLI with `chromeLauncher`
   - Run audit with flags: `--only-categories=performance,accessibility,seo,best-practices --output=json`
   - Parse JSON output and extract: scores, audits (failed + opportunities), metrics (LCP, FID, CLS, FCP, TTI, TBT)
   - Return structured response matching Lighthouse schema
   - Handle errors: invalid URLs, Chrome launch failures, timeouts

3. **Configure Express server** in `backend/server.js`
   - Enable CORS for `http://localhost` (frontend dev server)
   - Set request size limit to 1KB (only URLs, no large payloads)
   - Add request logging middleware
   - Listen on port 3000
   - Timeout: 125s (5s buffer beyond frontend 120s timeout)

4. **Add URL input mode to frontend** in `index.html`
   - Add third mode button: "URL" alongside "Paste Code" and "Upload Files"
   - Add new `<div id="url-container">` with input field for URL entry
   - Update `modeButtons` click handlers to show/hide url-container
   - Add URL validation on input (basic http/https check)
   - Style consistently with existing paste/upload containers

5. **Implement HTTP client** in new `modules/lighthouseClient.js`
   - `async fetchLighthouseAudit(url)` - POST to `http://localhost:3000/audit`
   - 120s timeout using `AbortController` or `Promise.race()`
   - Error handling: network failures, timeouts, 4xx/5xx responses
   - Return parsed JSON or throw descriptive errors

6. **Transform Lighthouse data** in new `modules/lighthouseAdapter.js`
   - `adaptLighthouseResults(rawData)` - convert Lighthouse JSON to FrontAl format
   - Map Lighthouse audit failures to `issues[]` array (severity based on score)
   - Map opportunities to `recommendations[]` array (priority based on savings)
   - Extract Core Web Vitals into new `metrics` object
   - Create category scores for performance/accessibility/SEO/best-practices
   - Return structure compatible with `renderResults()` in `app.js`

7. **Update `runAnalysis()` function** in `app.js` (lines 168-231)
   - Import `fetchLighthouseAudit` from lighthouseClient.js
   - Import `adaptLighthouseResults` from lighthouseAdapter.js
   - Add conditional: `if (currentMode === 'url')` branch
   - In URL mode: skip sizeAnalyzer/duplicationDetector/performanceAnalyzer, call Lighthouse instead
   - Wrap fetch in try/catch for error handling
   - Pass adapted results to `renderResults()`

8. **Add error rendering** in `app.js` (around line 275)
   - Update `renderResults()` to accept optional error parameter
   - If error exists, render error card in results grid
   - Error card shows: error icon, message, retry button
   - Retry button re-triggers `runAnalysis()` with same URL
   - Style error card distinctly (red accent, warning icon)

9. **Update results rendering** in `app.js` (lines 275-450)
   - Add Lighthouse-specific result cards alongside existing ones
   - New card: "Core Web Vitals" showing LCP/FID/CLS with pass/fail indicators
   - New card: "Lighthouse Scores" with circular progress for each category (perf/a11y/SEO/BP)
   - Adapt existing "Performance Issues" card to handle Lighthouse audit format
   - Use existing CSS classes where possible, add new ones only for Lighthouse-specific elements

10. **Style Lighthouse components** in `styles.css`
    - `.url-container` for URL input area (match paste-container styling)
    - `.core-vitals-card` with metric badges (green/yellow/red based on thresholds)
    - `.lighthouse-score-circle` for radial progress indicators
    - `.error-card` for failure states
    - Ensure responsive layout for new cards

11. **Add backend startup script** in `backend/package.json`
    - `"scripts": { "start": "node server.js" }`
    - Document required Node.js version (recommend 18+)

**Verification**

1. **Backend**: Run `cd backend && npm install && npm start` 
   - Should see "Server running on port 3000"
   - Test: `curl -X POST http://localhost:3000/audit -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`
   - Should return Lighthouse JSON after ~30s

2. **Frontend integration**:
   - Open `index.html` in browser
   - Click "URL" mode button
   - Enter `https://example.com`
   - Click "Analyze"
   - Should see loading state, then Lighthouse results cards after ~30s

3. **Error handling**:
   - Test invalid URL: `not-a-url` → should show inline error card
   - Test unreachable domain: `https://thisdoesnotexist12345.com` → error card
   - Test timeout: provide very slow site (or reduce timeout for testing)

4. **Existing modes still work**:
   - Switch to "Paste Code" mode → paste HTML/CSS/JS → analyze → should see static analysis results
   - Switch to "Upload Files" mode → upload files → should see static analysis results

**Decisions**

- **Chose URL-only Lighthouse mode** over hybrid/replacement → keeps concerns separated, simpler UX
- **Full Lighthouse report** over Core Web Vitals only → provides comprehensive insights
- **120s timeout** over 60s → reliability for slow sites outweighs speed
- **Inline error cards** over alerts/toasts → consistent with existing results layout, allows retry without re-entering URL
- **Port 3000** → standard Express default, easy to remember
- **No persistence** → per requirements, backend is stateless
