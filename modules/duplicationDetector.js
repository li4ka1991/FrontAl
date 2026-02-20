/**
 * Duplication Detector Module
 * Detects duplicate code patterns across HTML, CSS, and JavaScript files
 */

function detectDuplication(files) {
    var results = {
        duplicates: [],
        stats: {
            duplicateLines: 0,
            duplicateBlocks: 0
        }
    };

    var htmlFiles = files.filter(function(f) { return f.type === 'html'; });
    var cssFiles = files.filter(function(f) { return f.type === 'css'; });
    var jsFiles = files.filter(function(f) { return f.type === 'js'; });

    if (jsFiles.length > 0) analyzeJSDuplication(jsFiles, results);
    if (cssFiles.length > 0) analyzeCssDuplication(cssFiles, results);
    if (htmlFiles.length > 0) analyzeHtmlDuplication(htmlFiles, results);

    return results;
}

function analyzeJSDuplication(files, results) {
    var isMultiFile = files.length > 1;
    var fileMap = {};
    var functionCounts = {};
    
    files.forEach(function(file) {
        var functionPattern = /function\s+\w+\s*\([^)]*\)\s*\{[^}]{20,}\}/g;
        var functions = file.content.match(functionPattern) || [];
        
        functions.forEach(function(func) {
            var normalized = func.replace(/\s+/g, ' ').trim();
            if (!functionCounts[normalized]) {
                functionCounts[normalized] = { count: 0, files: [] };
            }
            functionCounts[normalized].count++;
            if (functionCounts[normalized].files.indexOf(file.name) === -1) {
                functionCounts[normalized].files.push(file.name);
            }
        });
    });

    Object.keys(functionCounts).forEach(function(func) {
        var data = functionCounts[func];
        if (data.count > 1) {
            results.duplicates.push({
                type: 'JavaScript',
                severity: 'warning',
                title: 'Duplicate Function Body',
                description: 'Found ' + data.count + ' identical or very similar function bodies. Consider extracting to a shared utility.',
                code: func.substring(0, 100) + '...',
                file: data.files.join(', ')
            });
            results.stats.duplicateBlocks++;
        }
    });

    var stringCounts = {};
    files.forEach(function(file) {
        var stringLiterals = file.content.match(/["'`][^"'`]{15,}["'`]/g) || [];
        stringLiterals.forEach(function(str) {
            if (!stringCounts[str]) {
                stringCounts[str] = { count: 0, files: [] };
            }
            stringCounts[str].count++;
            if (stringCounts[str].files.indexOf(file.name) === -1) {
                stringCounts[str].files.push(file.name);
            }
        });
    });

    Object.keys(stringCounts).forEach(function(str) {
        var data = stringCounts[str];
        if (data.count > 2) {
            results.duplicates.push({
                type: 'JavaScript',
                severity: 'info',
                title: 'Repeated String Literal',
                description: 'String literal appears ' + data.count + ' times. Consider using a constant.',
                code: str,
                file: data.files.join(', ')
            });
        }
    });

    var loopFunctions = [];
    var loopFiles = [];
    files.forEach(function(file) {
        var loopWithInlineFunction = /(for|while|forEach|map|filter)\s*\([^)]*\)\s*\{[^}]*function\s*\(/g;
        var matches = file.content.match(loopWithInlineFunction) || [];
        if (matches.length > 0) {
            loopFunctions = loopFunctions.concat(matches);
            loopFiles.push(file.name);
        }
    });
    
    if (loopFunctions.length > 0) {
        results.duplicates.push({
            type: 'JavaScript',
            severity: 'warning',
            title: 'Anonymous Functions in Loops',
            description: 'Found ' + loopFunctions.length + ' inline function(s) created inside loops. Define functions outside loops to avoid recreation on each iteration.',
            code: loopFunctions[0],
            file: loopFiles.length > 0 ? loopFiles.join(', ') : undefined
        });
    }

    var queryCounts = {};
    files.forEach(function(file) {
        var domQueries = file.content.match(/(?:document\.querySelector|document\.getElementById|document\.getElementsBy)\s*\([^)]+\)/g) || [];
        domQueries.forEach(function(query) {
            if (!queryCounts[query]) {
                queryCounts[query] = { count: 0, files: [] };
            }
            queryCounts[query].count++;
            if (queryCounts[query].files.indexOf(file.name) === -1) {
                queryCounts[query].files.push(file.name);
            }
        });
    });

    Object.keys(queryCounts).forEach(function(query) {
        var data = queryCounts[query];
        if (data.count > 3) {
            results.duplicates.push({
                type: 'JavaScript',
                severity: 'warning',
                title: 'Repeated DOM Query',
                description: 'Same DOM query executed ' + data.count + ' times. Cache the result in a variable.',
                code: query,
                file: data.files.join(', ')
            });
        }
    });
}

function analyzeCssDuplication(files, results) {
    var isMultiFile = files.length > 1;
    
    // Process each file separately to track file origins
    files.forEach(function(file) {
        var contexts = parseCssContexts(file.content);
        contexts.forEach(function(context) {
            checkDuplicateSelectors(context.content, context.name, file.name, isMultiFile, results);
        });
    });

    // Detect duplicate property-value pairs (excluding CSS variables)
    var properties = {};
    files.forEach(function(file) {
        var propertyPattern = /([a-z-]+)\s*:\s*([^;]+);/gi;
        var match;
        
        while ((match = propertyPattern.exec(file.content)) !== null) {
            var propName = match[1].trim();
            if (propName.indexOf('--') === 0) continue;
            
            var prop = propName + ': ' + match[2].trim();
            if (!properties[prop]) {
                properties[prop] = { count: 0, files: [] };
            }
            properties[prop].count++;
            if (properties[prop].files.indexOf(file.name) === -1) {
                properties[prop].files.push(file.name);
            }
        }
    });

    Object.keys(properties).forEach(function(prop) {
        var data = properties[prop];
        if (data.count > 5) {
            results.duplicates.push({
                type: 'CSS',
                severity: 'info',
                title: 'Repeated CSS Declaration',
                description: '"' + prop + '" appears ' + data.count + ' times. Consider creating a utility class.',
                code: prop,
                file: data.files.join(', ')
            });
        }
    });

    // Detect universal selector overuse
    var universalCount = 0;
    var universalFiles = [];
    files.forEach(function(file) {
        var matches = (file.content.match(/\*\s*\{/g) || []).length;
        if (matches > 0) {
            universalCount += matches;
            if (universalFiles.indexOf(file.name) === -1) {
                universalFiles.push(file.name);
            }
        }
    });
    
    if (universalCount > 1) {
        results.duplicates.push({
            type: 'CSS',
            severity: 'warning',
            title: 'Multiple Universal Selectors',
            description: 'Found ' + universalCount + ' universal selectors (*). These can impact performance.',
            code: '* { ... }',
            file: universalFiles.length > 0 ? universalFiles.join(', ') : undefined
        });
    }

    // Detect deep selector nesting (4+ levels)
    var deepNesting = [];
    var deepFiles = [];
    files.forEach(function(file) {
        var matches = file.content.match(/(\s+\S+){4,}\s*\{/g) || [];
        if (matches.length > 0) {
            deepNesting = deepNesting.concat(matches);
            if (deepFiles.indexOf(file.name) === -1) {
                deepFiles.push(file.name);
            }
        }
    });
    
    if (deepNesting.length > 0) {
        results.duplicates.push({
            type: 'CSS',
            severity: 'warning',
            title: 'Deep Selector Nesting',
            description: 'Found ' + deepNesting.length + ' deeply nested selector(s). Keep selectors flat for better performance.',
            code: deepNesting[0],
            file: deepFiles.length > 0 ? deepFiles.join(', ') : undefined
        });
    }

    // Detect redundant vendor prefixes
    var vendorPrefixes = [];
    var vendorFiles = [];
    files.forEach(function(file) {
        var matches = file.content.match(/-(?:webkit|moz|ms|o)-[a-z-]+/g) || [];
        if (matches.length > 0) {
            vendorPrefixes = vendorPrefixes.concat(matches);
            if (vendorFiles.indexOf(file.name) === -1) {
                vendorFiles.push(file.name);
            }
        }
    });
    
    if (vendorPrefixes.length > 10) {
        results.duplicates.push({
            type: 'CSS',
            severity: 'info',
            title: 'Vendor Prefixes Detected',
            description: 'Found ' + vendorPrefixes.length + ' vendor-prefixed properties. Consider using autoprefixer instead.',
            code: vendorPrefixes.slice(0, 3).join(', ') + '...',
            file: vendorFiles.length > 0 ? vendorFiles.join(', ') : undefined
        });
    }
}

function parseCssContexts(content) {
    var contexts = [{ name: 'global', content: '' }];
    var i = 0, len = content.length, depth = 0, start = 0, mediaStart = -1, mediaQuery = '';
    
    while (i < len) {
        if (content.substr(i, 6) === '@media') {
            if (depth === 0) {
                // Save global content before media query
                if (i > start) {
                    contexts[0].content += content.substring(start, i);
                }
                mediaStart = i;
                // Extract media query condition
                var condEnd = content.indexOf('{', i);
                mediaQuery = content.substring(i + 6, condEnd).trim();
                i = condEnd;
            }
        }
        
        if (content[i] === '{') {
            depth++;
        } else if (content[i] === '}') {
            depth--;
            if (depth === 0 && mediaStart !== -1) {
                // End of media query
                contexts.push({
                    name: '@media ' + mediaQuery,
                    content: content.substring(content.indexOf('{', mediaStart) + 1, i)
                });
                start = i + 1;
                mediaStart = -1;
            }
        }
        i++;
    }
    
    // Add remaining global content
    if (start < len && depth === 0) {
        contexts[0].content += content.substring(start);
    }
    
    return contexts;
}

function checkDuplicateSelectors(content, contextName, fileName, isMultiFile, results) {
    var blocks = [];
    var currentPos = 0;
    
    // Extract all CSS blocks with their full selectors
    while (currentPos < content.length) {
        var openBrace = content.indexOf('{', currentPos);
        if (openBrace === -1) break;
        
        var closeBrace = content.indexOf('}', openBrace);
        if (closeBrace === -1) break;
        
        var selectorText = content.substring(currentPos, openBrace).trim();
        if (selectorText && selectorText.indexOf('@') !== 0) {
            // Split combined selectors but keep each one complete
            var individualSelectors = selectorText.split(',');
            individualSelectors.forEach(function(sel) {
                var cleanSel = sel.trim().replace(/\s+/g, ' ');
                if (cleanSel) {
                    blocks.push(cleanSel);
                }
            });
        }
        
        currentPos = closeBrace + 1;
    }
    
    // Count occurrences
    var selectors = {};
    blocks.forEach(function(selector) {
        selectors[selector] = (selectors[selector] || 0) + 1;
    });

    Object.keys(selectors).forEach(function(selector) {
        var count = selectors[selector];
        if (count > 1) {
            var contextMsg = contextName !== 'global' ? ' in ' + contextName : '';
            results.duplicates.push({
                type: 'CSS',
                severity: 'warning',
                title: 'Duplicate Selector',
                description: 'Selector "' + selector + '" appears ' + count + ' times' + contextMsg + '. Consolidate into a single rule.',
                code: selector,
                file: fileName
            });
            results.stats.duplicateBlocks++;
        }
    });
}

function analyzeHtmlDuplication(files, results) {
    var isMultiFile = files.length > 1;
    var elementCounts = {};
    
    files.forEach(function(file) {
        var elementPattern = /<(\w+)[^>]*>.*?<\/\1>/g;
        var elements = file.content.match(elementPattern) || [];
        
        elements.forEach(function(elem) {
            var normalized = elem.replace(/>.*?</g, '><').replace(/\s+/g, ' ');
            if (normalized.length > 30) {
                if (!elementCounts[normalized]) {
                    elementCounts[normalized] = { count: 0, files: [] };
                }
                elementCounts[normalized].count++;
                if (elementCounts[normalized].files.indexOf(file.name) === -1) {
                    elementCounts[normalized].files.push(file.name);
                }
            }
        });
    });

    Object.keys(elementCounts).forEach(function(elem) {
        var data = elementCounts[elem];
        if (data.count > 2) {
            results.duplicates.push({
                type: 'HTML',
                severity: 'info',
                title: 'Repeated HTML Structure',
                description: 'Similar HTML structure appears ' + data.count + ' times. Consider componentizing or using templates.',
                code: elem.substring(0, 100) + '...',
                file: data.files.join(', ')
            });
            results.stats.duplicateBlocks++;
        }
    });

    var inlineStyleCount = 0;
    var styleFiles = [];
    files.forEach(function(file) {
        var inlineStyles = file.content.match(/style\s*=\s*["'][^"']+["']/g) || [];
        if (inlineStyles.length > 0) {
            inlineStyleCount += inlineStyles.length;
            if (styleFiles.indexOf(file.name) === -1) {
                styleFiles.push(file.name);
            }
        }
    });
    
    if (inlineStyleCount > 10) {
        results.duplicates.push({
            type: 'HTML',
            severity: 'warning',
            title: 'Excessive Inline Styles',
            description: 'Found ' + inlineStyleCount + ' inline style attributes. Move to CSS for better maintainability.',
            file: styleFiles.length > 0 ? styleFiles.join(', ') : undefined
        });
    }
}
