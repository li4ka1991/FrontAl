/**
 * Performance Analyzer Module
 * Detects performance anti-patterns and provides PageSpeed-inspired recommendations
 */

export function analyzePerformance(files) {
    const results = {
        issues: [],
        recommendations: []
    };

    // Group files by type
    const htmlFiles = files.filter(f => f.type === 'html');
    const cssFiles = files.filter(f => f.type === 'css');
    const jsFiles = files.filter(f => f.type === 'js');

    // Analyze each type
    if (htmlFiles.length > 0) {
        analyzeHtmlPerformance(htmlFiles, results);
    }

    if (cssFiles.length > 0) {
        analyzeCssPerformance(cssFiles, results);
    }

    if (jsFiles.length > 0) {
        analyzeJsPerformance(jsFiles, results);
    }

    // Generate PageSpeed-style recommendations
    generateRecommendations(files, results);

    return results;
}

function analyzeHtmlPerformance(files, results) {
    files.forEach(file => {
        const content = file.content;

        // Check for inline scripts blocking rendering
        const inlineScripts = content.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
        const blockingScripts = inlineScripts.filter(script => 
            !script.includes('async') && 
            !script.includes('defer') &&
            script.includes('<script>')
        );

        if (blockingScripts.length > 0) {
            results.issues.push({
                severity: 'error',
                title: 'Render-Blocking Scripts',
                description: `Found ${blockingScripts.length} inline script(s) without async/defer. These block page rendering.`,
                file: file.name,
                suggestion: 'Add defer or async attributes, or move scripts to bottom of body.'
            });
        }

        // Check for missing defer/async on external scripts
        const externalScripts = content.match(/<script[^>]+src=[^>]*>/g) || [];
        const syncExternalScripts = externalScripts.filter(script => 
            !script.includes('async') && !script.includes('defer')
        );

        if (syncExternalScripts.length > 0) {
            results.issues.push({
                severity: 'warning',
                title: 'Synchronous External Scripts',
                description: `${syncExternalScripts.length} external script(s) load synchronously, blocking page rendering.`,
                file: file.name,
                suggestion: 'Add defer attribute for scripts that don\'t need to run immediately.'
            });
        }

        // Check for excessive inline styles
        const inlineStyles = content.match(/style\s*=\s*["'][^"']{50,}["']/g) || [];
        if (inlineStyles.length > 5) {
            results.issues.push({
                severity: 'warning',
                title: 'Excessive Inline Styles',
                description: `Found ${inlineStyles.length} elements with large inline styles.`,
                file: file.name,
                suggestion: 'Move styles to external CSS file for better caching and maintainability.'
            });
        }

        // Check DOM size
        const elementCount = (content.match(/<[a-z][\s\S]*?>/gi) || []).length;
        if (elementCount > 1500) {
            results.issues.push({
                severity: 'warning',
                title: 'Large DOM Size',
                description: `Document contains approximately ${elementCount} elements. Large DOMs slow down rendering.`,
                file: file.name,
                suggestion: 'Simplify DOM structure, use virtualization for large lists.'
            });
        }

        // Check for missing meta viewport
        if (!content.includes('viewport')) {
            results.issues.push({
                severity: 'info',
                title: 'Missing Viewport Meta Tag',
                description: 'No viewport meta tag found.',
                file: file.name,
                suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile optimization.'
            });
        }

        // Check for long inline scripts
        const longInlineScripts = inlineScripts.filter(script => script.length > 1000);
        if (longInlineScripts.length > 0) {
            results.issues.push({
                severity: 'warning',
                title: 'Long Inline Scripts',
                description: `Found ${longInlineScripts.length} inline script(s) larger than 1KB.`,
                file: file.name,
                suggestion: 'Move large scripts to external files for better caching.'
            });
        }

        // Check for render-blocking CSS
        const cssLinks = content.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/g) || [];
        const blockingCss = cssLinks.filter(link => !link.includes('media='));
        
        if (blockingCss.length > 3) {
            results.issues.push({
                severity: 'warning',
                title: 'Multiple Render-Blocking CSS Files',
                description: `${blockingCss.length} CSS files block initial render.`,
                file: file.name,
                suggestion: 'Consider inlining critical CSS and lazy-loading non-critical styles.'
            });
        }
    });
}

function analyzeCssPerformance(files, results) {
    files.forEach(file => {
        const content = file.content;

        // Check for expensive selectors
        const expensiveSelectors = content.match(/\*[^{]*\{|\[.*?\^.*?\]|:nth-child\([^)]*\)/g) || [];
        if (expensiveSelectors.length > 5) {
            results.issues.push({
                severity: 'warning',
                title: 'Expensive CSS Selectors',
                description: `Found ${expensiveSelectors.length} potentially expensive selector(s) (universal, attribute, nth-child).`,
                file: file.name,
                suggestion: 'Use simpler, class-based selectors for better performance.'
            });
        }

        // Check for @import (blocks parallel downloads)
        const imports = content.match(/@import/g) || [];
        if (imports.length > 0) {
            results.issues.push({
                severity: 'error',
                title: 'CSS @import Usage',
                description: `Found ${imports.length} @import statement(s). These prevent parallel downloads.`,
                file: file.name,
                suggestion: 'Use <link> tags instead of @import for better performance.'
            });
        }

        // Check for large number of rules
        const rules = content.match(/\{[^}]+\}/g) || [];
        if (rules.length > 1000) {
            results.issues.push({
                severity: 'warning',
                title: 'Large CSS File',
                description: `CSS file contains ${rules.length} rules. Large stylesheets slow down parsing.`,
                file: file.name,
                suggestion: 'Split into smaller files, remove unused CSS, or use critical CSS.'
            });
        }

        // Check for complex animations
        const animations = content.match(/@keyframes[^}]+\{[^}]+\}/g) || [];
        const complexAnimations = animations.filter(anim => 
            anim.includes('width') || 
            anim.includes('height') || 
            anim.includes('top') || 
            anim.includes('left')
        );

        if (complexAnimations.length > 0) {
            results.issues.push({
                severity: 'info',
                title: 'Layout-Triggering Animations',
                description: `Found ${complexAnimations.length} animation(s) that may trigger layout.`,
                file: file.name,
                suggestion: 'Use transform and opacity for animations to leverage GPU acceleration.'
            });
        }
    });
}

function analyzeJsPerformance(files, results) {
    files.forEach(file => {
        const content = file.content;

        // Check for synchronous XHR
        const syncXHR = content.match(/\.open\s*\(\s*["'][^"']+["']\s*,\s*["'][^"']+["']\s*,\s*false\s*\)/g) || [];
        if (syncXHR.length > 0) {
            results.issues.push({
                severity: 'error',
                title: 'Synchronous XMLHttpRequest',
                description: `Found ${syncXHR.length} synchronous XHR call(s). These block the main thread.`,
                file: file.name,
                suggestion: 'Use async XHR or fetch API instead.'
            });
        }

        // Check for forced reflows
        const reflowTriggers = content.match(/(offsetHeight|offsetWidth|clientHeight|clientWidth|scrollHeight|scrollWidth|getComputedStyle|getBoundingClientRect)/g) || [];
        if (reflowTriggers.length > 20) {
            results.issues.push({
                severity: 'warning',
                title: 'Potential Forced Reflows',
                description: `Found ${reflowTriggers.length} property access(es) that may trigger reflow.`,
                file: file.name,
                suggestion: 'Batch DOM reads, cache layout properties, avoid layout thrashing.'
            });
        }

        // Check for console.log in production code
        const consoleLogs = content.match(/console\.(log|warn|error|debug)/g) || [];
        if (consoleLogs.length > 5) {
            results.issues.push({
                severity: 'info',
                title: 'Console Statements',
                description: `Found ${consoleLogs.length} console statement(s).`,
                file: file.name,
                suggestion: 'Remove console statements from production code.'
            });
        }

        // Check for large libraries (simple signature detection)
        const libraries = [];
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
                description: `Detected: ${libraries.join(', ')}. These can be large.`,
                file: file.name,
                suggestion: 'Consider smaller alternatives or use native APIs when possible.'
            });
        }

        // Check for event delegation opportunities
        const eventListeners = content.match(/addEventListener\s*\(/g) || [];
        if (eventListeners.length > 20) {
            results.issues.push({
                severity: 'info',
                title: 'Many Event Listeners',
                description: `Found ${eventListeners.length} addEventListener calls.`,
                file: file.name,
                suggestion: 'Consider using event delegation to reduce memory usage.'
            });
        }

        // Check for memory leak patterns
        const intervals = content.match(/setInterval\s*\(/g) || [];
        const clearIntervals = content.match(/clearInterval\s*\(/g) || [];
        if (intervals.length > clearIntervals.length) {
            results.issues.push({
                severity: 'warning',
                title: 'Potential Memory Leak',
                description: `${intervals.length} setInterval calls but only ${clearIntervals.length} clearInterval. May cause memory leaks.`,
                file: file.name,
                suggestion: 'Ensure all intervals are cleared when no longer needed.'
            });
        }
    });
}

function generateRecommendations(files, results) {
    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    const jsSize = files.filter(f => f.type === 'js').reduce((sum, f) => sum + f.content.length, 0);
    const cssSize = files.filter(f => f.type === 'css').reduce((sum, f) => sum + f.content.length, 0);

    // PageSpeed-style recommendations
    if (jsSize > totalSize * 0.5) {
        results.recommendations.push({
            priority: 'high',
            title: 'Reduce JavaScript Execution Time',
            description: 'JavaScript makes up over 50% of your bundle. Consider code splitting, tree shaking, and lazy loading non-critical scripts.',
            impact: 'High - Can significantly improve Time to Interactive (TTI)'
        });
    }

    if (cssSize > 50000) {
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
        description: 'Use <link rel="preload"> for critical resources and <link rel="prefetch"> for future navigation.',
        impact: 'Medium - Reduces perceived load time'
    });

    if (files.some(f => f.type === 'html' && !f.content.includes('cache-control'))) {
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
