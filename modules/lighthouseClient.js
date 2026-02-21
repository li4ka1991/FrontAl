/**
 * This file was generated with the help of Backend NodeJS Expert AI assistant. 
 */

(() => {
    const API_URL = 'http://localhost:3000/audit';
    const DEFAULT_TIMEOUT_MS = 120000;

    function buildError(message, code, status) {
        const error = new Error(message);
        error.code = code;
        if (status) {
            error.status = status;
        }
        return error;
    }

    async function parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }
        return response.text();
    }

    async function fetchLighthouseAudit(url, options = {}) {
        const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ url }),
                cache: 'no-store',
                credentials: 'omit',
                signal: controller.signal
            });

            const payload = await parseResponse(response);

            if (!response.ok) {
                const message = payload && payload.error ? payload.error : 'Audit request failed.';
                throw buildError(message, 'http_error', response.status);
            }

            if (!payload || typeof payload !== 'object') {
                throw buildError('Unexpected response from audit server.', 'invalid_response');
            }

            return payload;
        } catch (err) {
            if (err && err.name === 'AbortError') {
                throw buildError('Audit timed out. Please try again.', 'timeout');
            }

            if (err && err.code) {
                throw err;
            }

            throw buildError('Network error while running audit.', 'network_error');
        } finally {
            clearTimeout(timeoutId);
        }
    }

    window.fetchLighthouseAudit = fetchLighthouseAudit;
})();
