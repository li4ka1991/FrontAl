/**
 * Duplication Detector Module
 * Detects duplicate code patterns across HTML, CSS, and JavaScript files
 */

export function detectDuplication(files) {
    const results = {
        duplicates: [],
        stats: {
            duplicateLines: 0,
            duplicateBlocks: 0
        }
    };

    // Group files by type
    const htmlFiles = files.filter(f => f.type === 'html');
    const cssFiles = files.filter(f => f.type === 'css');
    const jsFiles = files.filter(f => f.type === 'js');

    // Analyze each type
    if (jsFiles.length > 0) {
        analyzeJSDuplication(jsFiles, results);
    }

    if (cssFiles.length > 0) {
        analyzeCssDuplication(cssFiles, results);
    }

    if (htmlFiles.length > 0) {
        analyzeHtmlDuplication(htmlFiles, results);
    }

    return results;
}

function analyzeJSDuplication(files, results) {
    const allContent = files.map(f => f.content).join('\n');

    // Detect repeated function bodies
    const functionPattern = /function\s+\w+\s*\([^)]*\)\s*\{[^}]{20,}\}/g;
    const functions = allContent.match(functionPattern) || [];
    const functionCounts = {};
    
    functions.forEach(func => {
        const normalized = func.replace(/\s+/g, ' ').trim();
        functionCounts[normalized] = (functionCounts[normalized] || 0) + 1;
    });

    Object.entries(functionCounts).forEach(([func, count]) => {
        if (count > 1) {
            results.duplicates.push({
                type: 'JavaScript',
                severity: 'warning',
                title: 'Duplicate Function Body',
                description: `Found ${count} identical or very similar function bodies. Consider extracting to a shared utility.`,
                code: func.substring(0, 100) + '...'
            });
            results.stats.duplicateBlocks++;
        }
    });

    // Detect repeated string literals
    const stringLiterals = allContent.match(/["'`][^"'`]{15,}["'`]/g) || [];
    const stringCounts = {};
    
    stringLiterals.forEach(str => {
        stringCounts[str] = (stringCounts[str] || 0) + 1;
    });

    Object.entries(stringCounts).forEach(([str, count]) => {
        if (count > 2) {
            results.duplicates.push({
                type: 'JavaScript',
                severity: 'info',
                title: 'Repeated String Literal',
                description: `String literal appears ${count} times. Consider using a constant.`,
                code: str
            });
        }
    });

    // Detect inline functions in loops
    const loopWithInlineFunction = /(for|while|forEach|map|filter)\s*\([^)]*\)\s*\{[^}]*function\s*\(/g;
    const loopFunctions = allContent.match(loopWithInlineFunction) || [];
    
    if (loopFunctions.length > 0) {
        results.duplicates.push({
            type: 'JavaScript',
            severity: 'warning',
            title: 'Anonymous Functions in Loops',
            description: `Found ${loopFunctions.length} inline function(s) created inside loops. Define functions outside loops to avoid recreation on each iteration.`,
            code: loopFunctions[0]
        });
    }

    // Detect excessive DOM queries (same selector multiple times)
    const domQueries = allContent.match(/(?:document\.querySelector|document\.getElementById|document\.getElementsBy)\s*\([^)]+\)/g) || [];
    const queryCounts = {};
    
    domQueries.forEach(query => {
        queryCounts[query] = (queryCounts[query] || 0) + 1;
    });

    Object.entries(queryCounts).forEach(([query, count]) => {
        if (count > 3) {
            results.duplicates.push({
                type: 'JavaScript',
                severity: 'warning',
                title: 'Repeated DOM Query',
                description: `Same DOM query executed ${count} times. Cache the result in a variable.`,
                code: query
            });
        }
    });
}

function analyzeCssDuplication(files, results) {
    const allContent = files.map(f => f.content).join('\n');

    // Detect duplicate selectors
    const selectorPattern = /([.#]?[\w-]+(?:\s*[>+~]\s*[\w-]+)*)\s*\{[^}]+\}/g;
    const selectors = {};
    let match;
    
    while ((match = selectorPattern.exec(allContent)) !== null) {
        const selector = match[1].trim();
        if (!selectors[selector]) {
            selectors[selector] = [];
        }
        selectors[selector].push(match[0]);
    }

    Object.entries(selectors).forEach(([selector, declarations]) => {
        if (declarations.length > 1) {
            results.duplicates.push({
                type: 'CSS',
                severity: 'warning',
                title: 'Duplicate Selector',
                description: `Selector "${selector}" appears ${declarations.length} times. Consolidate into a single rule.`,
                code: selector
            });
            results.stats.duplicateBlocks++;
        }
    });

    // Detect duplicate property-value pairs
    const propertyPattern = /([a-z-]+)\s*:\s*([^;]+);/g;
    const properties = {};
    
    while ((match = propertyPattern.exec(allContent)) !== null) {
        const prop = `${match[1]}: ${match[2]}`.trim();
        properties[prop] = (properties[prop] || 0) + 1;
    }

    Object.entries(properties).forEach(([prop, count]) => {
        if (count > 5) {
            results.duplicates.push({
                type: 'CSS',
                severity: 'info',
                title: 'Repeated CSS Declaration',
                description: `"${prop}" appears ${count} times. Consider creating a utility class.`,
                code: prop
            });
        }
    });

    // Detect universal selector overuse
    const universalSelectors = (allContent.match(/\*\s*\{/g) || []).length;
    if (universalSelectors > 1) {
        results.duplicates.push({
            type: 'CSS',
            severity: 'warning',
            title: 'Multiple Universal Selectors',
            description: `Found ${universalSelectors} universal selectors (*). These can impact performance.`,
            code: '* { ... }'
        });
    }

    // Detect deep selector nesting (4+ levels)
    const deepNesting = allContent.match(/(\s+\S+){4,}\s*\{/g) || [];
    if (deepNesting.length > 0) {
        results.duplicates.push({
            type: 'CSS',
            severity: 'warning',
            title: 'Deep Selector Nesting',
            description: `Found ${deepNesting.length} deeply nested selector(s). Keep selectors flat for better performance.`,
            code: deepNesting[0]
        });
    }

    // Detect redundant vendor prefixes
    const vendorPrefixes = allContent.match(/-(?:webkit|moz|ms|o)-[a-z-]+/g) || [];
    if (vendorPrefixes.length > 10) {
        results.duplicates.push({
            type: 'CSS',
            severity: 'info',
            title: 'Vendor Prefixes Detected',
            description: `Found ${vendorPrefixes.length} vendor-prefixed properties. Consider using autoprefixer instead.`,
            code: vendorPrefixes.slice(0, 3).join(', ') + '...'
        });
    }
}

function analyzeHtmlDuplication(files, results) {
    const allContent = files.map(f => f.content).join('\n');

    // Detect repeated HTML structures
    const elementPattern = /<(\w+)[^>]*>.*?<\/\1>/g;
    const elements = allContent.match(elementPattern) || [];
    const elementCounts = {};
    
    elements.forEach(elem => {
        // Normalize by removing content but keeping structure
        const normalized = elem.replace(/>.*?</g, '><').replace(/\s+/g, ' ');
        if (normalized.length > 30) { // Only check substantial elements
            elementCounts[normalized] = (elementCounts[normalized] || 0) + 1;
        }
    });

    Object.entries(elementCounts).forEach(([elem, count]) => {
        if (count > 2) {
            results.duplicates.push({
                type: 'HTML',
                severity: 'info',
                title: 'Repeated HTML Structure',
                description: `Similar HTML structure appears ${count} times. Consider componentizing or using templates.`,
                code: elem.substring(0, 100) + '...'
            });
            results.stats.duplicateBlocks++;
        }
    });

    // Detect excessive inline styles
    const inlineStyles = allContent.match(/style\s*=\s*["'][^"']+["']/g) || [];
    if (inlineStyles.length > 10) {
        results.duplicates.push({
            type: 'HTML',
            severity: 'warning',
            title: 'Excessive Inline Styles',
            description: `Found ${inlineStyles.length} inline style attributes. Move to CSS for better maintainability.`,
            code: inlineStyles[0]
        });
    }
}
