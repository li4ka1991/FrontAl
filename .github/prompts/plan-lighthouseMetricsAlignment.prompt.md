# Plan: Align Lighthouse Metrics with DevTools

## Problem Analysis

The discrepancies occur because our backend uses incorrect config properties and missing throttling settings. Most critically: CPU throttling is absent (affects TTI/TBT), we use the wrong `emulatedFormFactor` property instead of `formFactor`, and we only extract 3 metrics instead of the 7+ DevTools displays.

### Root Causes

1. **Wrong property:** `emulatedFormFactor` doesn't exist in Lighthouse - should be `formFactor`
2. **Missing CPU throttling:** No `cpuSlowdownMultiplier: 4` setting (dramatically affects TTI and TBT)
3. **Missing network throttling:** No explicit `throttlingMethod: 'simulate'` or `throttling` object with RTT/throughput
4. **Screen size mismatch:** Using 360×640@2× vs DevTools' 412×823@1.75×
5. **Missing metrics:** Not extracting FCP, TTI, TBT, Speed Index from audits

### Decisions

- Use DevTools' exact mobile configuration (412×823@1.75×, 4× CPU slowdown, simulated 4G throttling)
- Extract all performance metrics DevTools shows (FCP, LCP, TBT, CLS, SI, TTI, INP)
- Match screen emulation precisely to avoid layout differences

## Implementation Steps

### 1. Fix Lighthouse Config in backend/server.js

**Location:** Lines 107-118

**Changes:**
- Replace `emulatedFormFactor: 'mobile'` with `formFactor: 'mobile'`
- Add `throttlingMethod: 'simulate'`
- Add full `throttling` object with DevTools defaults:
  - `rttMs: 150`
  - `throughputKbps: 1638.4`
  - `requestLatencyMs: 562.5`
  - `downloadThroughputKbps: 1474.56`
  - `uploadThroughputKbps: 675`
  - `cpuSlowdownMultiplier: 4` (most critical!)
- Update `screenEmulation` to match DevTools:
  - width: 412 (was 360)
  - height: 823 (was 640)
  - deviceScaleFactor: 1.75 (was 2)

**Expected Config:**
```javascript
const config = {
    extends: 'lighthouse:default',
    settings: {
        onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
        
        // ✅ Correct property name
        formFactor: 'mobile',
        
        // ✅ Explicit throttling method
        throttlingMethod: 'simulate',
        
        // ✅ Full throttling config (matches DevTools mobile)
        throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            requestLatencyMs: 562.5,
            downloadThroughputKbps: 1474.56,
            uploadThroughputKbps: 675,
            cpuSlowdownMultiplier: 4
        },
        
        // ✅ Match DevTools screen emulation
        screenEmulation: {
            mobile: true,
            width: 412,
            height: 823,
            deviceScaleFactor: 1.75,
            disabled: false
        }
    }
};
```

### 2. Expand Metric Extraction in modules/lighthouseAdapter.js

**Location:** Lines 137-145 (coreVitals array construction)

**Add buildMetric() calls for:**
- `'first-contentful-paint'` (FCP)
  - Label: "First Contentful Paint"
  - Thresholds: { good: 1800, warn: 3000 }
- `'interactive'` (TTI)
  - Label: "Time to Interactive"
  - Thresholds: { good: 3800, warn: 7300 }
- `'total-blocking-time'` (TBT)
  - Label: "Total Blocking Time"
  - Thresholds: { good: 200, warn: 600 }
- `'speed-index'` (SI)
  - Label: "Speed Index"
  - Thresholds: { good: 3400, warn: 5800 }

**Keep existing:**
- `'largest-contentful-paint'` (LCP)
- `'interaction-to-next-paint'` (INP)
- `'cumulative-layout-shift'` (CLS)

**Updated coreVitals array structure:**
```javascript
const coreVitals = [
    buildMetric(audits, 'first-contentful-paint', 'First Contentful Paint', { good: 1800, warn: 3000 }),
    buildMetric(audits, 'largest-contentful-paint', 'Largest Contentful Paint', { good: 2500, warn: 4000 }),
    buildMetric(audits, 'total-blocking-time', 'Total Blocking Time', { good: 200, warn: 600 }),
    buildMetric(audits, 'cumulative-layout-shift', 'Cumulative Layout Shift', { good: 0.1, warn: 0.25 }),
    buildMetric(audits, 'speed-index', 'Speed Index', { good: 3400, warn: 5800 }),
    buildMetric(audits, 'interactive', 'Time to Interactive', { good: 3800, warn: 7300 }),
    buildMetric(audits, 'interaction-to-next-paint', 'Interaction to Next Paint', { good: 200, warn: 500 }, 'first-input-delay')
].filter(Boolean);
```

### 3. Update Core Web Vitals Display in index.html

**Verification needed:**
- Check if `coreVitalsCard` layout can handle 7 metrics instead of 3
- Verify no hardcoded iteration limits

**Expected:** Should work with dynamic rendering from array

### 4. Update app.js Rendering Logic

**Verification needed:**
- Ensure `renderCoreVitals()` function handles extended metrics array
- Verify no hardcoded assumptions about 3 vitals
- Check grid/flex layout handles dynamic count

**Expected:** Should work with existing forEach loop

## Verification Steps

1. **Start backend:**
   ```bash
   cd backend && npm start
   ```

2. **Open frontend in browser:**
   - file://[path]/index.html OR
   - http://127.0.0.1:5500/index.html

3. **Run Lighthouse audit:**
   - Switch to URL mode
   - Enter test URL: `https://web.dev`
   - Click "Analyze URL"
   - Wait for results

4. **Compare with DevTools:**
   - Open DevTools (F12)
   - Navigate to Lighthouse tab
   - Select "Mobile" device
   - Select same categories (Performance, Accessibility, SEO, Best Practices)
   - Click "Analyze page load"
   - Compare metric values side-by-side

5. **Expected outcomes:**
   - All 7 metrics appear in our UI: FCP, LCP, TBT, CLS, SI, TTI, INP
   - Metric values match DevTools within ~5-10% tolerance
   - TTI (Time to Interactive) is no longer missing
   - Performance score matches DevTools

6. **Test different URLs:**
   - `https://example.com` (fast site)
   - `https://amazon.com` (complex site)
   - `https://wikipedia.org` (content-heavy site)

## Technical Details

### DevTools Mobile Configuration (source: Lighthouse v11.7.1)

**Throttling (mobileSlow4G preset):**
```javascript
throttlingMethod: 'simulate'
throttling: {
    rttMs: 150,                      // Round-trip time
    throughputKbps: 1638.4,          // Raw throughput
    requestLatencyMs: 562.5,         // 150 * 3.75
    downloadThroughputKbps: 1474.56, // 1.6 * 1024 * 0.9
    uploadThroughputKbps: 675,       // 750 * 0.9
    cpuSlowdownMultiplier: 4         // 4x CPU slowdown
}
```

**Screen Emulation (mobile):**
```javascript
screenEmulation: {
    mobile: true,
    width: 412,              // Moto G Power viewport width
    height: 823,             // Moto G Power viewport height
    deviceScaleFactor: 1.75, // Device pixel ratio
    disabled: false
}
```

### Performance Metrics Reference

| Audit ID | Metric | Weight | Good | Warn | Unit | Description |
|----------|--------|--------|------|------|------|-------------|
| `first-contentful-paint` | FCP | 10% | ≤1800 | ≤3000 | ms | First text/image paint |
| `largest-contentful-paint` | LCP | 25% | ≤2500 | ≤4000 | ms | Largest element paint (Core Web Vital) |
| `total-blocking-time` | TBT | 30% | ≤200 | ≤600 | ms | Sum of blocking time |
| `cumulative-layout-shift` | CLS | 25% | ≤0.1 | ≤0.25 | score | Layout shift (Core Web Vital) |
| `speed-index` | SI | 10% | ≤3400 | ≤5800 | ms | Visual load speed |
| `interactive` | TTI | 0% | ≤3800 | ≤7300 | ms | Time to Interactive |
| `interaction-to-next-paint` | INP | 0% | ≤200 | ≤500 | ms | Interaction latency (Core Web Vital) |

**Note:** Weights show contribution to Performance score. 0% means informational only.

## Expected Impact

### Before Changes
- Only 3 metrics shown: LCP, INP, CLS
- TTI completely missing
- Metric values 20-50% different from DevTools
- CPU throttling absent → artificially fast TTI/TBT
- Screen size mismatch → different CLS values

### After Changes
- All 7 metrics shown: FCP, LCP, TBT, CLS, SI, TTI, INP
- TTI appears with correct value
- Metric values within 5-10% of DevTools (normal variance)
- CPU throttling enabled → realistic TTI/TBT
- Screen size matches → accurate CLS

## Potential Issues

### Issue 1: UI Layout with 7 Metrics
**Risk:** Core Web Vitals card may overflow or look cramped with 7 items instead of 3
**Mitigation:** Verify CSS grid/flex layout adapts dynamically, adjust if needed

### Issue 2: Longer Audit Time
**Risk:** CPU throttling (4x) will make audits take ~30-60 seconds instead of ~15-20 seconds
**Mitigation:** Already have 120s timeout, no change needed

### Issue 3: Different Baseline
**Risk:** Users may see "worse" scores after update (due to CPU throttling revealing real performance issues)
**Mitigation:** Document that new scores reflect DevTools parity and are more accurate

## References

- [Lighthouse Config Documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md)
- [Lighthouse Throttling Guide](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- [Lighthouse Constants Source](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js)
- [Core Web Vitals Thresholds](https://web.dev/vitals/)
