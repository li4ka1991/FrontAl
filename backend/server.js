/**
 * This file was generated with the help of Backend NodeJS Expert AI assistant. 
 */

'use strict';

const express = require('express');
const cors = require('cors');
const lighthouseModule = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const PORT = process.env.PORT || 3000;
const MAX_BODY_SIZE = '1kb';
const AUDIT_TIMEOUT_MS = 125000;
const LIGHTHOUSE_CATEGORIES = ['performance', 'accessibility', 'seo', 'best-practices'];
const MOBILE_LIGHTHOUSE_SETTINGS = Object.freeze({
    onlyCategories: LIGHTHOUSE_CATEGORIES,
    formFactor: 'mobile',
    throttlingMethod: 'simulate',
    throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        requestLatencyMs: 562.5,
        downloadThroughputKbps: 1474.56,
        uploadThroughputKbps: 675,
        cpuSlowdownMultiplier: 4
    },
    screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false
    }
});
const lighthouseRunner = typeof lighthouseModule === 'function'
    ? lighthouseModule
    : lighthouseModule.default;

const app = express();

const corsOptions = {
    origin(origin, callback) {
        if (!origin || origin === 'null' || origin === 'http://localhost' || origin === 'http://127.0.0.1') {
            callback(null, true);
            return;
        }

        callback(new Error('Not allowed by CORS'));
    },
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
};

app.use(cors(corsOptions));
app.options('/audit', cors(corsOptions));
app.options('/fetch-resources', cors(corsOptions));

app.use(express.json({ limit: MAX_BODY_SIZE }));

// Root route - status check
app.get('/', (req, res) => {
    res.json({
        service: 'FrontAl Lighthouse Backend',
        status: 'running',
        version: '1.0.0',
        endpoints: [
            { method: 'POST', path: '/audit', description: 'Run Lighthouse audit on a URL' },
            { method: 'POST', path: '/fetch-resources', description: 'Extract HTML/CSS/JS from a URL' }
        ]
    });
});

app.post('/fetch-resources', async (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

    if (!isValidHttpUrl(url)) {
        return res.status(400).json({ error: 'Invalid URL. Use http or https.' });
    }

    try {
        const resources = await fetchPageResources(url);
        return res.json(resources);
    } catch (error) {
        return res.status(500).json({
            error: error.message || 'Failed to fetch resources'
        });
    }
});

app.post('/audit', async (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

    if (!isValidHttpUrl(url)) {
        return res.status(400).json({ error: 'Invalid URL. Use http or https.' });
    }

    const requestId = createRequestId();

    try {
        const result = await runLighthouse(url);
        const lhr = result.lhr;
        const summary = summarizeLighthouse(lhr);

        return res.json({
            requestId,
            url: lhr.finalUrl || url,
            fetchedAt: new Date().toISOString(),
            summary,
            lighthouse: lhr
        });
    } catch (error) {
        const status = error.code === 'TIMEOUT' ? 504 : 500;
        const message = error.code === 'TIMEOUT'
            ? 'Audit timed out. Try a faster URL or try again later.'
            : (error && error.message) ? error.message : 'Audit failed. Please try again.';

        return res.status(status).json({
            requestId,
            error: message
        });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Lighthouse backend running on port ${PORT}`);
});

server.setTimeout(AUDIT_TIMEOUT_MS + 5000);

function isValidHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

async function runLighthouse(url) {
    let chrome;

    try {
        if (typeof lighthouseRunner !== 'function') {
            const importError = new Error('Lighthouse runner is not available.');
            importError.code = 'LH_IMPORT_ERROR';
            throw importError;
        }

        chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
        });

        const options = {
            port: chrome.port,
            logLevel: 'error'
        };

        const config = {
            extends: 'lighthouse:default',
            settings: MOBILE_LIGHTHOUSE_SETTINGS
        };

        const runner = lighthouseRunner(url, options, config);
        const result = await withTimeout(runner, AUDIT_TIMEOUT_MS);

        if (!isMobileDiagnosticsResult(result)) {
            const profileError = new Error('Audit profile mismatch. Only mobile emulated Lighthouse diagnostics are allowed.');
            profileError.code = 'PROFILE_MISMATCH';
            throw profileError;
        }

        return result;
    } finally {
        if (chrome) {
            try {
                await chrome.kill();
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }
}

function isMobileDiagnosticsResult(result) {
    const settings = result?.lhr?.configSettings;
    const screen = settings?.screenEmulation;

    return settings?.formFactor === 'mobile'
        && settings?.throttlingMethod === 'simulate'
        && screen?.mobile === true
        && screen?.disabled === false;
}

function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            const error = new Error('Audit timed out');
            error.code = 'TIMEOUT';
            reject(error);
        }, timeoutMs);

        promise
            .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

function summarizeLighthouse(lhr) {
    const categories = Object.values(lhr.categories || {}).map(category => ({
        id: category.id,
        title: category.title,
        score: typeof category.score === 'number' ? Math.round(category.score * 100) : 0
    }));

    const audits = lhr.audits || {};
    const getMetric = id => audits[id]?.displayValue || '--';

    return {
        categories,
        metrics: {
            lcp: getMetric('largest-contentful-paint'),
            inp: getMetric('interaction-to-next-paint') || getMetric('first-input-delay'),
            cls: getMetric('cumulative-layout-shift'),
            fcp: getMetric('first-contentful-paint'),
            tbt: getMetric('total-blocking-time'),
            tti: getMetric('interactive')
        }
    };
}

function createRequestId() {
    return Math.random().toString(36).slice(2, 10);
}

async function fetchPageResources(url) {
    const https = require('https');
    const http = require('http');
    
    // Fetch main HTML
    const htmlContent = await fetchUrl(url);
    
    const resources = {
        html: htmlContent,
        css: '',
        js: ''
    };

    // Extract inline and linked CSS
    const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleTagRegex.exec(htmlContent)) !== null) {
        resources.css += match[1] + '\n\n';
    }

    // Extract inline and linked JS
    const scriptTagRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = scriptTagRegex.exec(htmlContent)) !== null) {
        const scriptContent = match[1].trim();
        if (scriptContent) {
            resources.js += scriptContent + '\n\n';
        }
    }

    return resources;
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const lib = urlObj.protocol === 'https:' ? require('https') : require('http');
        
        const options = {
            timeout: 10000,
            headers: {
                'User-Agent': 'FrontAl-Analyzer/1.0'
            }
        };

        lib.get(url, options, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirects
                resolve(fetchUrl(response.headers.location));
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            let data = '';
            response.setEncoding('utf8');
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(data));
            response.on('error', reject);
        }).on('error', reject).on('timeout', () => {
            reject(new Error('Request timeout'));
        });
    });
}
