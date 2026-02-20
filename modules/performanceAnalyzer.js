/**
 * Performance Analyzer Module
 * Detects performance anti-patterns and provides PageSpeed-inspired recommendations
 */

function analyzePerformance(files) {
    var isMultiFile = files.length > 1;
    var results = {
        issues: [],
        recommendations: []
    };

    var htmlFiles = files.filter(function(f) { return f.type === 'html'; });
    var cssFiles = files.filter(function(f) { return f.type === 'css'; });
    var jsFiles = files.filter(function(f) { return f.type === 'js'; });

    if (htmlFiles.length > 0) analyzeHtmlPerformance(htmlFiles, isMultiFile, results);
    if (cssFiles.length > 0) analyzeCssPerformance(cssFiles, isMultiFile, results);
    if (jsFiles.length > 0) analyzeJsPerformance(jsFiles, isMultiFile, results);

    generateRecommendations(files, results);

    return results;
}

function analyzeHtmlPerformance(files, isMultiFile, results) {
    files.forEach(function(file) {
        var content = file.content;
        var fileInfo = isMultiFile ? ' (in ' + file.name + ')' : '';

        var inlineScripts = content.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
        var blockingScripts = inlineScripts.filter(function(script) {
            return !script.includes('async') && !script.includes('defer') && script.includes('<script>');
        });

        if (blockingScripts.length > 0) {
            results.issues.push({
                severity: 'error',
                title: 'Render-Blocking Scripts',
                description: 'Found ' + blockingScripts.length + ' inline script(s) without async/defer' + fileInfo + '. These block page rendering.',
                file: file.name,
                suggestion: 'Add defer or async attributes, or move scripts to bottom of body.'
            });
        }

        var externalScripts = content.match(/<script[^>]+src=[^>]*>/g) || [];
        var syncExternalScripts = externalScripts.filter(function(script) {
            return !script.includes('async') && !script.includes('defer');
        });

        if (syncExternalScripts.length > 0) {
            results.issues.push({
                severity: 'warning',
                title: 'Synchronous External Scripts',
                description: syncExternalScripts.length + ' external script(s) load synchronously' + fileInfo + ', blocking page rendering.',
                file: file.name,
                suggestion: 'Add defer attribute for scripts that don\'t need to run immediately.'
            });
        }

        var inlineStyles = content.match(/style\s*=\s*["'][^"']{50,}["']/g) || [];
        if (inlineStyles.length > 5) {
            results.issues.push({
                severity: 'warning',
                title: 'Excessive Inline Styles',
                description: 'Found ' + inlineStyles.length + ' elements with large inline styles' + fileInfo + '.',
                file: file.name,
                suggestion: 'Move styles to external CSS file for better caching and maintainability.'
            });
        }

        var elementCount = (content.match(/<[a-z][\s\S]*?>/gi) || []).length;
        if (elementCount > 1500) {
            results.issues.push({
                severity: 'warning',
                title: 'Large DOM Size',
                description: 'Document contains approximately ' + elementCount + ' elements' + fileInfo + '. Large DOMs slow down rendering.',
                file: file.name,
                suggestion: 'Simplify DOM structure, use virtualization for large lists.'
            });
        }

        if (!content.includes('viewport')) {
            results.issues.push({
                severity: 'info',
                title: 'Missing Viewport Meta Tag',
                description: 'No viewport meta tag found' + fileInfo + '.',
                file: file.name,
                suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile optimization.'
            });
        }

        var longInlineScripts = inlineScripts.filter(function(script) { return script.length > 1000; });
        if (longInlineScripts.length > 0) {
            results.issues.push({
                severity: 'warning',
                title: 'Long Inline Scripts',
                description: 'Found ' + longInlineScripts.length + ' inline script(s) larger than 1KB' + fileInfo + '.',
                file: file.name,
                suggestion: 'Move large scripts to external files for better caching.'
            });
        }

        var cssLinks = content.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/g) || [];
        var blockingCss = cssLinks.filter(function(link) { return !link.includes('media='); });
        
        if (blockingCss.length > 3) {
            results.issues.push({
                severity: 'warning',
                title: 'Multiple Render-Blocking CSS Files',
                description: blockingCss.length + ' CSS files block initial render' + fileInfo + '.',
                file: file.name,
                suggestion: 'Consider inlining critical CSS and lazy-loading non-critical styles.'
            });
        }
    });
}

function analyzeCssPerformance(files, isMultiFile, results) {
    files.forEach(function(file) {
        var content = file.content;
        var fileInfo = isMultiFile ? ' (in ' + file.name + ')' : '';

        var expensiveSelectors = content.match(/\*[^{]*\{|\[.*?\^.*?\]|:nth-child\([^)]*\)/g) || [];
        if (expensiveSelectors.length > 5) {
            results.issues.push({
                severity: 'warning',
                title: 'Expensive CSS Selectors',
                description: 'Found ' + expensiveSelectors.length + ' potentially expensive selector(s)' + fileInfo + ' (universal, attribute, nth-child).',
                file: file.name,
                suggestion: 'Use simpler, class-based selectors for better performance.'
            });
        }

        var imports = content.match(/@import/g) || [];
        if (imports.length > 0) {
            results.issues.push({
                severity: 'error',
                title: 'CSS @import Usage',
                description: 'Found ' + imports.length + ' @import statement(s)' + fileInfo + '. These prevent parallel downloads.',
                file: file.name,
                suggestion: 'Use &lt;link&gt; tags instead of @import for better performance.'
            });
        }

        var rules = content.match(/\{[^}]+\}/g) || [];
        if (rules.length > 1000) {
            results.issues.push({
                severity: 'warning',
                title: 'Large CSS File',
                description: 'CSS file contains ' + rules.length + ' rules' + fileInfo + '. Large stylesheets slow down parsing.',
                file: file.name,
                suggestion: 'Split into smaller files, remove unused CSS, or use critical CSS.'
            });
        }

        var animations = content.match(/@keyframes[^}]+\{[^}]+\}/g) || [];
        var complexAnimations = animations.filter(function(anim) {
            return anim.includes('width') || anim.includes('height') || anim.includes('top') || anim.includes('left');
        });

        if (complexAnimations.length > 0) {
            results.issues.push({
                severity: 'info',
                title: 'Layout-Triggering Animations',
                description: 'Found ' + complexAnimations.length + ' animation(s) that may trigger layout' + fileInfo + '.',
                file: file.name,
                suggestion: 'Use transform and opacity for animations to leverage GPU acceleration.'
            });
        }
    });
}

function analyzeJsPerformance(files, isMultiFile, results) {
    files.forEach(function(file) {
        var content = file.content;
        var fileInfo = isMultiFile ? ' (in ' + file.name + ')' : '';

        var syncXHR = content.match(/\.open\s*\(\s*["'][^"']+["']\s*,\s*["'][^"']+["']\s*,\s*false\s*\)/g) || [];
        if (syncXHR.length > 0) {
            results.issues.push({
                severity: 'error',
                title: 'Synchronous XMLHttpRequest',
                description: 'Found ' + syncXHR.length + ' synchronous XHR call(s)' + fileInfo + '. These block the main thread.',
                file: file.name,
                suggestion: 'Use async XHR or fetch API instead.'
            });
        }

        var reflowTriggers = content.match(/(offsetHeight|offsetWidth|clientHeight|clientWidth|scrollHeight|scrollWidth|getComputedStyle|getBoundingClientRect)/g) || [];
        if (reflowTriggers.length > 20) {
            results.issues.push({
                severity: 'warning',
                title: 'Potential Forced Reflows',
                description: 'Found ' + reflowTriggers.length + ' property access(es) that may trigger reflow' + fileInfo + '.',
                file: file.name,
                suggestion: 'Batch DOM reads, cache layout properties, avoid layout thrashing.'
            });
        }

        var consoleLogs = content.match(/console\.(log|warn|error|debug)/g) || [];
        if (consoleLogs.length > 5) {
            results.issues.push({
                severity: 'info',
                title: 'Console Statements',
                description: 'Found ' + consoleLogs.length + ' console statement(s)' + fileInfo + '.',
                file: file.name,
                suggestion: 'Remove console statements from production code.'
            });
        }

        var libraries = [];
        if (content.includes('jQuery') || content.match(/\$\s*\(/)) {
            libraries.push('jQuery');
        }
        if (content.includes('lodash') || content.includes('_underscore')) {
            libraries.push('Lodash/Underscore');
        }
        if (content.includes('moment')) {
            libraries.push('Moment.js');
        }

        if (libraries.length > 0) {
            results.issues.push({
                severity: 'info',
                title: 'Large Utility Libraries Detected',
                description: 'Detected: ' + libraries.join(', ') + fileInfo + '. These can be large.',
                file: file.name,
                suggestion: 'Consider smaller alternatives or use native APIs when possible.'
            });
        }

        var eventListeners = content.match(/addEventListener\s*\(/g) || [];
        if (eventListeners.length > 20) {
            results.issues.push({
                severity: 'info',
                title: 'Many Event Listeners',
                description: 'Found ' + eventListeners.length + ' addEventListener calls' + fileInfo + '.',
                file: file.name,
                suggestion: 'Consider using event delegation to reduce memory usage.'
            });
        }

        var intervals = content.match(/setInterval\s*\(/g) || [];
        var clearIntervals = content.match(/clearInterval\s*\(/g) || [];
        if (intervals.length > clearIntervals.length) {
            results.issues.push({
                severity: 'warning',
                title: 'Potential Memory Leak',
                description: intervals.length + ' setInterval calls but only ' + clearIntervals.length + ' clearInterval' + fileInfo + '. May cause memory leaks.',
                file: file.name,
                suggestion: 'Ensure all intervals are cleared when no longer needed.'
            });
        }
    });
}

function generateRecommendations(files, results) {
    var totalSize = files.reduce(function(sum, f) { return sum + f.content.length; }, 0);
    var jsSize = files.filter(function(f) { return f.type === 'js'; }).reduce(function(sum, f) { return sum + f.content.length; }, 0);
    var cssSize = files.filter(function(f) { return f.type === 'css'; }).reduce(function(sum, f) { return sum + f.content.length; }, 0);

    if (jsSize > totalSize * 0.5) {
        results.recommendations.push({
            priority: 'high',
            title: 'Reduce JavaScript Execution Time',
            description: 'JavaScript makes up over 50% of your bundle. Consider code splitting, tree shaking, and lazy loading non-critical scripts.',
            impact: 'High - Can significantly improve Time to Interactive (TTI)'
        });
    }

    if (cssSize > totalSize * 0.3) {
        results.recommendations.push({
            priority: 'medium',
            title: 'Optimize CSS Delivery',
            description: 'Extract and inline critical CSS, defer non-critical styles, and remove unused CSS rules.',
            impact: 'Medium - Improves First Contentful Paint (FCP)'
        });
    }

    results.recommendations.push({
        priority: 'high',
        title: 'Enable Text Compression',
        description: 'Ensure your server compresses text-based resources (HTML, CSS, JS) with gzip or Brotli.',
        impact: 'High - Can reduce transfer size by 70-80%'
    });

    results.recommendations.push({
        priority: 'medium',
        title: 'Implement Resource Hints',
        description: 'Use &lt;link rel="preload"&gt; for critical resources and &lt;link rel="prefetch"&gt; for future navigation.',
        impact: 'Medium - Reduces perceived load time'
    });

    if (files.some(function(f) { return f.type === 'html' && !f.content.includes('cache-control'); })) {
        results.recommendations.push({
            priority: 'medium',
            title: 'Leverage Browser Caching',
            description: 'Set appropriate cache headers for static resources to avoid redundant downloads.',
            impact: 'Medium - Improves repeat visit performance'
        });
    }

    results.recommendations.push({
        priority: 'high',
        title: 'Minimize Main-Thread Work',
        description: 'Break up long tasks, use Web Workers for heavy computations, and defer non-critical JavaScript.',
        impact: 'High - Improves responsiveness and TTI'
    });

    results.recommendations.push({
        priority: 'low',
        title: 'Optimize Images',
        description: 'Use modern formats (WebP, AVIF), implement lazy loading, and serve responsive images.',
        impact: 'Variable - Depends on image usage'
    });
}
