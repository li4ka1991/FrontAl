/**
 * Size Analyzer Module
 * Analyzes file sizes, bundle composition, and provides size-related metrics
 */

export function analyzeSizes(files) {
    const results = {
        totalSize: 0,
        fileSizes: {},
        breakdown: {
            html: 0,
            css: 0,
            js: 0
        },
        metrics: [],
        issues: []
    };

    files.forEach(file => {
        const size = file.content.length;
        results.totalSize += size;
        results.fileSizes[file.name] = size;

        // Categorize by type
        if (file.type === 'html') {
            results.breakdown.html += size;
        } else if (file.type === 'css') {
            results.breakdown.css += size;
        } else if (file.type === 'js') {
            results.breakdown.js += size;
        }
    });

    // Calculate percentages
    results.percentages = {
        html: results.totalSize > 0 ? ((results.breakdown.html / results.totalSize) * 100).toFixed(1) : 0,
        css: results.totalSize > 0 ? ((results.breakdown.css / results.totalSize) * 100).toFixed(1) : 0,
        js: results.totalSize > 0 ? ((results.breakdown.js / results.totalSize) * 100).toFixed(1) : 0
    };

    // Generate metrics
    results.metrics.push({
        label: 'Total Bundle Size',
        value: formatBytes(results.totalSize)
    });

    results.metrics.push({
        label: 'HTML',
        value: `${formatBytes(results.breakdown.html)} (${results.percentages.html}%)`
    });

    results.metrics.push({
        label: 'CSS',
        value: `${formatBytes(results.breakdown.css)} (${results.percentages.css}%)`
    });

    results.metrics.push({
        label: 'JavaScript',
        value: `${formatBytes(results.breakdown.js)} (${results.percentages.js}%)`
    });

    // Detect size issues
    if (results.totalSize > 500000) { // > 500KB
        results.issues.push({
            severity: 'warning',
            title: 'Large Bundle Size',
            description: `Total bundle size is ${formatBytes(results.totalSize)}. Consider code splitting and lazy loading.`
        });
    }

    if (results.breakdown.js > 250000) { // > 250KB
        results.issues.push({
            severity: 'error',
            title: 'Large JavaScript Bundle',
            description: `JavaScript bundle is ${formatBytes(results.breakdown.js)}. This can significantly impact page load time.`
        });
    }

    if (results.breakdown.css > 100000) { // > 100KB
        results.issues.push({
            severity: 'warning',
            title: 'Large CSS Bundle',
            description: `CSS bundle is ${formatBytes(results.breakdown.css)}. Consider removing unused CSS or splitting styles.`
        });
    }

    // Check for disproportionate JS
    if (results.percentages.js > 70) {
        results.issues.push({
            severity: 'warning',
            title: 'JavaScript-Heavy Bundle',
            description: `JavaScript makes up ${results.percentages.js}% of your bundle. Consider if all JS is necessary for initial load.`
        });
    }

    return results;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
