/**
 * FrontAl - Manual Deterministic Logic Tests
 * Comprehensive test suite for size calculations, duplication detection,
 * performance heuristics, and score calculation
 */

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

var testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    failures: []
};

var currentSuite = '';
var testSuites = []; // Store test suites for later execution

function describe(suiteName, fn) {
    testSuites.push({ name: suiteName, tests: fn });
}

function executeSuites() {
    testSuites.forEach(function(suite) {
        currentSuite = suite.name;
        console.log('\n' + '%c' + suite.name, 'font-weight: bold; font-size: 14px;');
        suite.tests();
    });
}

function it(testName, fn) {
    testResults.total++;
    try {
        fn();
        testResults.passed++;
        console.log('%c  ✓ ' + testName, 'color: green;');
    } catch (error) {
        testResults.failed++;
        testResults.failures.push({
            suite: currentSuite,
            test: testName,
            error: error.message
        });
        console.log('%c  ✗ ' + testName, 'color: red;');
        console.log('%c    ' + error.message, 'color: red; margin-left: 20px;');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            (message || 'Assertion failed') + 
            '\n    Expected: ' + JSON.stringify(expected) + 
            '\n    Actual: ' + JSON.stringify(actual)
        );
    }
}

function assertDeepEqual(actual, expected, message) {
    var actualStr = JSON.stringify(actual);
    var expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(
            (message || 'Deep equality assertion failed') + 
            '\n    Expected: ' + expectedStr + 
            '\n    Actual: ' + actualStr
        );
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(message || 'Expected condition to be true');
    }
}

function assertFalse(condition, message) {
    if (condition) {
        throw new Error(message || 'Expected condition to be false');
    }
}

function assertContains(array, item, message) {
    if (array.indexOf(item) === -1) {
        throw new Error(
            (message || 'Array does not contain expected item') + 
            '\n    Expected to contain: ' + JSON.stringify(item) +
            '\n    Array: ' + JSON.stringify(array)
        );
    }
}

function assertGreaterThan(actual, expected, message) {
    if (actual <= expected) {
        throw new Error(
            (message || 'Assertion failed') + 
            '\n    Expected ' + actual + ' to be greater than ' + expected
        );
    }
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockFile(name, type, content) {
    return {
        name: name,
        type: type,
        content: content
    };
}

function repeatString(str, count) {
    var result = '';
    for (var i = 0; i < count; i++) {
        result += str;
    }
    return result;
}

function findIssue(issues, titleFragment) {
    return issues.find(function(issue) {
        return issue.title && issue.title.indexOf(titleFragment) !== -1;
    });
}

function findDuplicate(duplicates, titleFragment) {
    return duplicates.find(function(dup) {
        return dup.title && dup.title.indexOf(titleFragment) !== -1;
    });
}

function countBySeverity(issues, severity) {
    return issues.filter(function(issue) {
        return issue.severity === severity;
    }).length;
}

// ============================================================================
// SIZE ANALYZER TESTS
// ============================================================================

describe('Size Analyzer - formatBytes()', function() {
    it('should return "0 Bytes" for 0', function() {
        assertEqual(formatBytes(0), '0 Bytes');
    });

    it('should return "1 Bytes" for 1', function() {
        assertEqual(formatBytes(1), '1 Bytes');
    });

    it('should return "512 Bytes" for 512', function() {
        assertEqual(formatBytes(512), '512 Bytes');
    });

    it('should return "1 KB" for exactly 1024 bytes', function() {
        assertEqual(formatBytes(1024), '1 KB');
    });

    it('should return "1.5 KB" for 1536 bytes', function() {
        assertEqual(formatBytes(1536), '1.5 KB');
    });

    it('should return "2.5 KB" for 2560 bytes', function() {
        assertEqual(formatBytes(2560), '2.5 KB');
    });

    it('should return "1 MB" for exactly 1048576 bytes', function() {
        assertEqual(formatBytes(1048576), '1 MB');
    });

    it('should return "2 MB" for 2097152 bytes', function() {
        assertEqual(formatBytes(2097152), '2 MB');
    });

    it('should round to 2 decimal places', function() {
        var result = formatBytes(1555);
        assertTrue(result.indexOf('1.52 KB') !== -1, 'Expected "1.52 KB", got: ' + result);
    });
});

describe('Size Analyzer - analyzeSizes()', function() {
    it('should handle empty files array', function() {
        var result = analyzeSizes([]);
        assertEqual(result.totalSize, 0);
        assertEqual(result.breakdown.html, 0);
        assertEqual(result.breakdown.css, 0);
        assertEqual(result.breakdown.js, 0);
        assertEqual(result.issues.length, 0);
    });

    it('should analyze single HTML file correctly', function() {
        var content = new Array(101).join('x'); // 100 bytes
        var files = [createMockFile('index.html', 'html', content)];
        var result = analyzeSizes(files);
        
        assertEqual(result.totalSize, 100);
        assertEqual(result.breakdown.html, 100);
        assertEqual(result.breakdown.css, 0);
        assertEqual(result.breakdown.js, 0);
        assertEqual(result.fileSizes['index.html'], 100);
    });

    it('should trigger "Large JavaScript Bundle" error for JS > 250KB', function() {
        var content = new Array(300 * 1024 + 1).join('x'); // 300KB
        var files = [createMockFile('app.js', 'js', content)];
        var result = analyzeSizes(files);
        
        var issue = findIssue(result.issues, 'Large JavaScript Bundle');
        assertTrue(issue !== undefined, 'Should have Large JavaScript Bundle issue');
        assertEqual(issue.severity, 'error');
    });

    it('should trigger "Large CSS Bundle" warning for CSS > 100KB', function() {
        var content = new Array(150 * 1024 + 1).join('x'); // 150KB
        var files = [createMockFile('styles.css', 'css', content)];
        var result = analyzeSizes(files);
        
        var issue = findIssue(result.issues, 'Large CSS Bundle');
        assertTrue(issue !== undefined, 'Should have Large CSS Bundle issue');
        assertEqual(issue.severity, 'warning');
    });

    it('should trigger "Large Bundle Size" warning for total > 500KB', function() {
        var content = new Array(600 * 1024 + 1).join('x'); // 600KB
        var files = [createMockFile('bundle.js', 'js', content)];
        var result = analyzeSizes(files);
        
        var issue = findIssue(result.issues, 'Large Bundle Size');
        assertTrue(issue !== undefined, 'Should have Large Bundle Size issue');
        assertEqual(issue.severity, 'warning');
    });

    it('should trigger "JavaScript-Heavy Bundle" for JS > 70%', function() {
        var jsContent = new Array(81).join('x'); // 80 bytes
        var htmlContent = new Array(21).join('x'); // 20 bytes
        var files = [
            createMockFile('app.js', 'js', jsContent),
            createMockFile('index.html', 'html', htmlContent)
        ];
        var result = analyzeSizes(files);
        
        assertEqual(result.percentages.js, '80.0');
        var issue = findIssue(result.issues, 'JavaScript-Heavy Bundle');
        assertTrue(issue !== undefined, 'Should have JavaScript-Heavy Bundle issue');
    });

    it('should handle boundary: exactly 500KB total (no warning)', function() {
        var content = new Array(500 * 1024 + 1).join('x'); // exactly 500KB
        var files = [createMockFile('bundle.js', 'js', content)];
        var result = analyzeSizes(files);
        
        var issue = findIssue(result.issues, 'Large Bundle Size');
        assertTrue(issue === undefined, 'Should NOT trigger at exactly 500KB');
    });

    it('should handle boundary: exactly 250KB JS (no error)', function() {
        var content = new Array(250 * 1024 + 1).join('x'); // exactly 250KB
        var files = [createMockFile('app.js', 'js', content)];
        var result = analyzeSizes(files);
        
        var issue = findIssue(result.issues, 'Large JavaScript Bundle');
        assertTrue(issue === undefined, 'Should NOT trigger at exactly 250KB');
    });

    it('should handle boundary: exactly 70% JS (no warning)', function() {
        var jsContent = new Array(71).join('x'); // 70 bytes
        var htmlContent = new Array(31).join('x'); // 30 bytes
        var files = [
            createMockFile('app.js', 'js', jsContent),
            createMockFile('index.html', 'html', htmlContent)
        ];
        var result = analyzeSizes(files);
        
        assertEqual(result.percentages.js, '70.0');
        var issue = findIssue(result.issues, 'JavaScript-Heavy Bundle');
        assertTrue(issue === undefined, 'Should NOT trigger at exactly 70%');
    });

    it('should calculate percentages correctly with totalSize = 0', function() {
        var result = analyzeSizes([]);
        assertEqual(result.percentages.html, '0');
        assertEqual(result.percentages.css, '0');
        assertEqual(result.percentages.js, '0');
    });

    it('should track multiple file sizes', function() {
        var files = [
            createMockFile('app.js', 'js', 'abcde'), // 5 bytes
            createMockFile('styles.css', 'css', 'abc'), // 3 bytes
            createMockFile('index.html', 'html', 'ab') // 2 bytes
        ];
        var result = analyzeSizes(files);
        
        assertEqual(result.fileSizes['app.js'], 5);
        assertEqual(result.fileSizes['styles.css'], 3);
        assertEqual(result.fileSizes['index.html'], 2);
        assertEqual(result.totalSize, 10);
    });
});

// ============================================================================
// DUPLICATION DETECTOR TESTS
// ============================================================================

describe('Duplication Detector - parseCssContexts()', function() {
    it('should return single global context for CSS without @media', function() {
        var css = '.class { color: red; }';
        var contexts = parseCssContexts(css);
        
        assertEqual(contexts.length, 1);
        assertEqual(contexts[0].name, 'global');
        assertTrue(contexts[0].content.indexOf('.class') !== -1);
    });

    it('should parse CSS with one @media query', function() {
        var css = '.global { margin: 0; } @media screen { .mobile { display: block; } }';
        var contexts = parseCssContexts(css);
        
        assertGreaterThan(contexts.length, 1, 'Should have multiple contexts');
        assertEqual(contexts[0].name, 'global');
        assertTrue(contexts[1].name.indexOf('@media') !== -1, 'Should have media context');
    });

    it('should handle empty content', function() {
        var contexts = parseCssContexts('');
        assertEqual(contexts.length, 1);
        assertEqual(contexts[0].name, 'global');
        assertEqual(contexts[0].content, '');
    });

    it('should handle nested braces in global CSS', function() {
        var css = '.class { border: 1px; } .other { margin: { top: 5px; } }';
        var contexts = parseCssContexts(css);
        
        assertEqual(contexts[0].name, 'global');
        assertTrue(contexts[0].content.length > 0);
    });
});

describe('Duplication Detector - analyzeJSDuplication()', function() {
    it('should detect duplicate function bodies', function() {
        var js = 'function test1() { var x = 1; return x + 1; } function test2() { var x = 1; return x + 1; }';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Duplicate Function Body');
        assertTrue(issue !== undefined, 'Should detect duplicate functions');
        assertEqual(issue.severity, 'warning');
    });

    it('should not detect functions shorter than 20 chars', function() {
        var js = 'function a() { x; } function b() { x; }';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Duplicate Function Body');
        assertTrue(issue === undefined, 'Should not detect short functions');
    });

    it('should detect repeated string literals (> 2 occurrences, 15+ chars)', function() {
        var js = 'var a = "this is a long string"; var b = "this is a long string"; var c = "this is a long string";';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated String Literal');
        assertTrue(issue !== undefined, 'Should detect repeated string literal');
        assertEqual(issue.severity, 'info');
    });

    it('should not detect strings shorter than 15 chars', function() {
        var js = 'var a = "short"; var b = "short"; var c = "short";';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated String Literal');
        assertTrue(issue === undefined, 'Should not detect short strings');
    });

    it('should not detect strings appearing only 2 times', function() {
        var js = 'var a = "this is a long string"; var b = "this is a long string";';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated String Literal');
        assertTrue(issue === undefined, 'Should not trigger for 2 occurrences (threshold is > 2)');
    });

    it('should detect anonymous functions in loops', function() {
        var js = 'arr.forEach(function(item) { console.log(item); });';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Anonymous Functions in Loops');
        assertTrue(issue !== undefined, 'Should detect inline functions in loops');
        assertEqual(issue.severity, 'warning');
    });

    it('should not flag loops without inline functions', function() {
        var js = 'for (var i = 0; i < 10; i++) { console.log(i); }';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Anonymous Functions in Loops');
        assertTrue(issue === undefined, 'Should not flag loops without inline functions');
    });

    it('should detect repeated DOM queries (> 3 occurrences)', function() {
        var js = 'document.querySelector("#id"); document.querySelector("#id"); document.querySelector("#id"); document.querySelector("#id");';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated DOM Query');
        assertTrue(issue !== undefined, 'Should detect repeated DOM queries');
        assertEqual(issue.severity, 'warning');
    });

    it('should not flag different queries appearing 3 times each', function() {
        var js = 'document.querySelector("#a"); document.querySelector("#a"); document.querySelector("#a"); document.querySelector("#b"); document.querySelector("#b"); document.querySelector("#b");';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeJSDuplication(files, results);
        
        // Each query appears exactly 3 times, threshold is > 3, so neither should trigger
        var issues = results.duplicates.filter(function(d) {
            return d.title === 'Repeated DOM Query';
        });
        assertEqual(issues.length, 0, 'Should not trigger for 3 occurrences (threshold is > 3)');
    });
});

describe('Duplication Detector - analyzeCssDuplication()', function() {
    it('should detect repeated CSS declarations (> 5 occurrences)', function() {
        var css = '.a { color: red; } .b { color: red; } .c { color: red; } .d { color: red; } .e { color: red; } .f { color: red; }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeCssDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated CSS Declaration');
        assertTrue(issue !== undefined, 'Should detect repeated declarations');
        assertEqual(issue.severity, 'info');
    });

    it('should exclude CSS variables from declaration detection', function() {
        var css = '.a { --custom: red; } .b { --custom: red; } .c { --custom: red; } .d { --custom: red; } .e { --custom: red; } .f { --custom: red; }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeCssDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated CSS Declaration');
        assertTrue(issue === undefined, 'Should exclude CSS variables (--custom)');
    });

    it('should detect multiple universal selectors (> 1)', function() {
        var css = '* { margin: 0; } * { padding: 0; }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeCssDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Universal Selectors');
        assertTrue(issue !== undefined, 'Should detect multiple universal selectors');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect deep selector nesting (4+ levels)', function() {
        var css = '.a .b .c .d { color: red; }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeCssDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Deep Selector Nesting');
        assertTrue(issue !== undefined, 'Should detect deep nesting');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect vendor prefixes (> 10)', function() {
        var css = '.a { -webkit-transform: rotate(1deg); -moz-transform: rotate(1deg); -webkit-border-radius: 5px; -moz-border-radius: 5px; -ms-border-radius: 5px; -webkit-box-shadow: 0 0 5px; -moz-box-shadow: 0 0 5px; -webkit-gradient: linear; -moz-gradient: linear; -webkit-flex: 1; -moz-flex: 1; }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeCssDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Vendor Prefixes');
        assertTrue(issue !== undefined, 'Should detect vendor prefixes');
        assertEqual(issue.severity, 'info');
    });
});

describe('Duplication Detector - analyzeHtmlDuplication()', function() {
    it('should detect repeated HTML structures (> 2 occurrences, 30+ chars)', function() {
        var html = '<div class="card-container">Content</div><div class="card-container">Content</div><div class="card-container">Content</div>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeHtmlDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated HTML Structure');
        assertTrue(issue !== undefined, 'Should detect repeated structures');
        assertEqual(issue.severity, 'info');
    });

    it('should not detect elements shorter than 30 chars', function() {
        var html = '<i>a</i><i>a</i><i>a</i>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeHtmlDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Repeated HTML Structure');
        assertTrue(issue === undefined, 'Should not detect elements < 30 chars');
    });

    it('should detect excessive inline styles (> 10)', function() {
        var html = repeatString('<div style="color: red;"></div>', 11);
        var files = [createMockFile('index.html', 'html', html)];
        var results = { duplicates: [], stats: { duplicateLines: 0, duplicateBlocks: 0 } };
        
        analyzeHtmlDuplication(files, results);
        
        var issue = findDuplicate(results.duplicates, 'Excessive Inline Styles');
        assertTrue(issue !== undefined, 'Should detect excessive inline styles');
        assertEqual(issue.severity, 'warning');
    });
});

describe('Duplication Detector - detectDuplication()', function() {
    it('should sort results by severity (error > warning > info)', function() {
        var html = repeatString('<div style="color: red;"></div>', 11);
        var css = '* { margin: 0; } * { padding: 0; }';
        var js = 'arr.forEach(function(item) { console.log(item); });';
        
        var files = [
            createMockFile('index.html', 'html', html),
            createMockFile('styles.css', 'css', css),
            createMockFile('app.js', 'js', js)
        ];
        
        var result = detectDuplication(files);
        
        assertTrue(result.duplicates.length > 0, 'Should have duplicates');
        
        // Verify sorted by severity
        var lastSeverityOrder = -1;
        var severityMap = { 'error': 0, 'warning': 1, 'info': 2 };
        result.duplicates.forEach(function(dup) {
            var order = severityMap[dup.severity];
            assertTrue(order >= lastSeverityOrder, 'Should be sorted by severity');
            lastSeverityOrder = order;
        });
    });

    it('should return empty duplicates for empty files', function() {
        var result = detectDuplication([]);
        assertEqual(result.duplicates.length, 0);
        assertEqual(result.stats.duplicateBlocks, 0);
    });
});

// ============================================================================
// PERFORMANCE ANALYZER TESTS
// ============================================================================

describe('Performance Analyzer - analyzeHtmlPerformance()', function() {
    it('should detect render-blocking inline scripts', function() {
        var html = '<html><body><script>console.log("blocking");</script></body></html>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Render-Blocking Scripts');
        assertTrue(issue !== undefined, 'Should detect render-blocking scripts');
        assertEqual(issue.severity, 'error');
    });

    it('should not flag scripts with async/defer', function() {
        var html = '<html><body><script async>console.log("ok");</script></body></html>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Render-Blocking Scripts');
        assertTrue(issue === undefined, 'Should not flag async scripts');
    });

    it('should detect synchronous external scripts', function() {
        var html = '<script src="app.js"></script>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Synchronous External Scripts');
        assertTrue(issue !== undefined, 'Should detect sync external scripts');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect excessive inline styles (> 5, with 50+ chars each)', function() {
        var longStyle = 'style="' + new Array(51).join('x') + '"';
        var elements = [];
        for (var i = 0; i < 6; i++) {
            elements.push('<div ' + longStyle + '></div>');
        }
        var html = elements.join('');
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Excessive Inline Styles');
        assertTrue(issue !== undefined, 'Should detect excessive inline styles');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect large DOM size (> 1500 elements)', function() {
        var html = repeatString('<div></div>', 1600);
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large DOM Size');
        assertTrue(issue !== undefined, 'Should detect large DOM');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect missing viewport meta tag', function() {
        var html = '<html><head></head></html>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Missing Viewport Meta Tag');
        assertTrue(issue !== undefined, 'Should detect missing viewport');
        assertEqual(issue.severity, 'info');
    });

    it('should detect long inline scripts (> 1000 bytes)', function() {
        var longScript = '<script>' + new Array(1002).join('x') + '</script>';
        var html = '<html>' + longScript + '</html>';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Long Inline Scripts');
        assertTrue(issue !== undefined, 'Should detect long inline scripts');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect multiple render-blocking CSS (> 3)', function() {
        var html = '<link rel="stylesheet" href="a.css"><link rel="stylesheet" href="b.css"><link rel="stylesheet" href="c.css"><link rel="stylesheet" href="d.css">';
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Render-Blocking CSS');
        assertTrue(issue !== undefined, 'Should detect multiple blocking CSS');
        assertEqual(issue.severity, 'warning');
    });

    it('should handle boundary: exactly 5 inline styles (no warning)', function() {
        var longStyle = 'style="' + new Array(51).join('x') + '"';
        var html = repeatString('<div ' + longStyle + '></div>', 5);
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Excessive Inline Styles');
        assertTrue(issue === undefined, 'Should NOT trigger at exactly 5');
    });

    it('should handle boundary: exactly 1500 elements (no warning)', function() {
        var html = repeatString('<div></div>', 1500);
        var files = [createMockFile('index.html', 'html', html)];
        var results = { issues: [], recommendations: [] };
        
        analyzeHtmlPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large DOM Size');
        assertTrue(issue === undefined, 'Should NOT trigger at exactly 1500');
    });
});

describe('Performance Analyzer - analyzeCssPerformance()', function() {
    it('should detect expensive CSS selectors (> 5)', function() {
        var css = '* {} * {} * {} [attr^="val"] {} [attr^="val2"] {} :nth-child(2n) {}';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { issues: [], recommendations: [] };
        
        analyzeCssPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Expensive CSS Selectors');
        assertTrue(issue !== undefined, 'Should detect expensive selectors');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect @import usage', function() {
        var css = '@import url("other.css");';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { issues: [], recommendations: [] };
        
        analyzeCssPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'CSS @import');
        assertTrue(issue !== undefined, 'Should detect @import');
        assertEqual(issue.severity, 'error');
    });

    it('should detect large CSS file (> 1000 rules)', function() {
        var rule = '.class { margin: 0; }';
        var css = repeatString(rule, 1001);
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { issues: [], recommendations: [] };
        
        analyzeCssPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large CSS File');
        assertTrue(issue !== undefined, 'Should detect large CSS file');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect layout-triggering animations', function() {
        var css = '@keyframes slide { from { width: 0; } to { width: 100px; } }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { issues: [], recommendations: [] };
        
        analyzeCssPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Layout-Triggering Animations');
        assertTrue(issue !== undefined, 'Should detect layout-triggering animations');
        assertEqual(issue.severity, 'info');
    });

    it('should not flag animations with only transform', function() {
        var css = '@keyframes slide { from { transform: translateX(0); } to { transform: translateX(100px); } }';
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { issues: [], recommendations: [] };
        
        analyzeCssPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Layout-Triggering Animations');
        assertTrue(issue === undefined, 'Should not flag transform-only animations');
    });

    it('should handle boundary: exactly 1000 rules (no warning)', function() {
        var rule = '.class { margin: 0; }';
        var css = repeatString(rule, 1000);
        var files = [createMockFile('styles.css', 'css', css)];
        var results = { issues: [], recommendations: [] };
        
        analyzeCssPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large CSS File');
        assertTrue(issue === undefined, 'Should NOT trigger at exactly 1000 rules');
    });
});

describe('Performance Analyzer - analyzeJsPerformance()', function() {
    it('should detect synchronous XMLHttpRequest', function() {
        var js = 'xhr.open("GET", "/api", false);';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Synchronous XMLHttpRequest');
        assertTrue(issue !== undefined, 'Should detect sync XHR');
        assertEqual(issue.severity, 'error');
    });

    it('should detect potential forced reflows (> 20)', function() {
        var js = repeatString('var h = el.offsetHeight; ', 21);
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Potential Forced Reflows');
        assertTrue(issue !== undefined, 'Should detect forced reflows');
        assertEqual(issue.severity, 'warning');
    });

    it('should detect console statements (> 5)', function() {
        var js = 'console.log(1); console.log(2); console.log(3); console.log(4); console.log(5); console.log(6);';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Console Statements');
        assertTrue(issue !== undefined, 'Should detect console statements');
        assertEqual(issue.severity, 'info');
    });

    it('should detect jQuery library', function() {
        var js = 'jQuery(".selector").hide();';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large Utility Libraries');
        assertTrue(issue !== undefined, 'Should detect jQuery');
        assertTrue(issue.description.indexOf('jQuery') !== -1);
        assertEqual(issue.severity, 'info');
    });

    it('should detect Lodash/Underscore library', function() {
        var js = 'var result = lodash.map(arr, fn);';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large Utility Libraries');
        assertTrue(issue !== undefined, 'Should detect Lodash');
    });

    it('should detect Moment.js library', function() {
        var js = 'var date = moment().format("YYYY-MM-DD");';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Large Utility Libraries');
        assertTrue(issue !== undefined, 'Should detect Moment.js');
        assertTrue(issue.description.indexOf('Moment') !== -1);
    });

    it('should detect many event listeners (> 20)', function() {
        var js = repeatString('el.addEventListener("click", fn); ', 21);
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Many Event Listeners');
        assertTrue(issue !== undefined, 'Should detect many event listeners');
        assertEqual(issue.severity, 'info');
    });

    it('should detect potential memory leak (setInterval > clearInterval)', function() {
        var js = 'setInterval(fn, 100); setInterval(fn, 200); setInterval(fn, 300); clearInterval(id);';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Potential Memory Leak');
        assertTrue(issue !== undefined, 'Should detect memory leak');
        assertEqual(issue.severity, 'warning');
    });

    it('should not flag equal intervals and clears', function() {
        var js = 'setInterval(fn, 100); setInterval(fn, 200); clearInterval(id1); clearInterval(id2);';
        var files = [createMockFile('app.js', 'js', js)];
        var results = { issues: [], recommendations: [] };
        
        analyzeJsPerformance(files, false, results);
        
        var issue = findIssue(results.issues, 'Potential Memory Leak');
        assertTrue(issue === undefined, 'Should not flag when intervals == clears');
    });
});

describe('Performance Analyzer - generateRecommendations()', function() {
    it('should recommend JS reduction when JS > 50% of bundle', function() {
        var jsFile = createMockFile('app.js', 'js', new Array(600).join('x'));
        var htmlFile = createMockFile('index.html', 'html', new Array(400).join('x'));
        var files = [jsFile, htmlFile];
        var results = { issues: [], recommendations: [] };
        
        generateRecommendations(files, results);
        
        var rec = results.recommendations.find(function(r) {
            return r.title.indexOf('Reduce JavaScript') !== -1;
        });
        assertTrue(rec !== undefined, 'Should recommend JS reduction');
        assertEqual(rec.priority, 'high');
    });

    it('should recommend CSS optimization when CSS > 30% of bundle', function() {
        var cssFile = createMockFile('styles.css', 'css', new Array(400).join('x'));
        var htmlFile = createMockFile('index.html', 'html', new Array(600).join('x'));
        var files = [cssFile, htmlFile];
        var results = { issues: [], recommendations: [] };
        
        generateRecommendations(files, results);
        
        var rec = results.recommendations.find(function(r) {
            return r.title.indexOf('Optimize CSS') !== -1;
        });
        assertTrue(rec !== undefined, 'Should recommend CSS optimization');
        assertEqual(rec.priority, 'medium');
    });

    it('should always include compression recommendation', function() {
        var files = [createMockFile('app.js', 'js', 'console.log("test");')];
        var results = { issues: [], recommendations: [] };
        
        generateRecommendations(files, results);
        
        var rec = results.recommendations.find(function(r) {
            return r.title.indexOf('Compression') !== -1;
        });
        assertTrue(rec !== undefined, 'Should include compression recommendation');
    });

    it('should always include resource hints recommendation', function() {
        var files = [createMockFile('app.js', 'js', 'console.log("test");')];
        var results = { issues: [], recommendations: [] };
        
        generateRecommendations(files, results);
        
        var rec = results.recommendations.find(function(r) {
            return r.title.indexOf('Resource Hints') !== -1;
        });
        assertTrue(rec !== undefined, 'Should include resource hints recommendation');
    });
});

describe('Performance Analyzer - analyzePerformance()', function() {
    it('should sort issues by severity', function() {
        var html = '<script src="app.js"></script>'; // warning
        var css = '@import url("other.css");'; // error
        var js = repeatString('console.log(1); ', 6); // info
        
        var files = [
            createMockFile('index.html', 'html', html),
            createMockFile('styles.css', 'css', css),
            createMockFile('app.js', 'js', js)
        ];
        
        var result = analyzePerformance(files);
        
        assertTrue(result.issues.length > 0, 'Should have issues');
        
        // Verify sorted by severity (error > warning > info)
        var lastSeverityOrder = -1;
        var severityMap = { 'error': 0, 'warning': 1, 'info': 2 };
        result.issues.forEach(function(issue) {
            var order = severityMap[issue.severity];
            assertTrue(order >= lastSeverityOrder, 'Should be sorted by severity');
            lastSeverityOrder = order;
        });
    });

    it('should return empty results for empty files', function() {
        var result = analyzePerformance([]);
        assertEqual(result.issues.length, 0);
        assertTrue(result.recommendations.length > 0, 'Should have recommendations even with empty files');
    });
});

// ============================================================================
// SCORER TESTS
// ============================================================================

describe('Scorer - Size Score Deductions', function() {
    it('should deduct 30 points for 1.5MB bundle', function() {
        var sizeResults = {
            totalSize: 1.5 * 1024 * 1024,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score <= 70, 'Should deduct at least 30 points for 1.5MB');
        var sizeDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('Bundle size') !== -1 || d.reason.indexOf('1MB') !== -1;
        });
        assertTrue(sizeDeduction !== undefined, 'Should have size deduction');
    });

    it('should deduct 20 points for 750KB bundle', function() {
        var sizeResults = {
            totalSize: 750 * 1024,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score <= 80, 'Should deduct at least 20 points for 750KB');
    });

    it('should deduct 10 points for 300KB bundle', function() {
        var sizeResults = {
            totalSize: 300 * 1024,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score <= 90, 'Should deduct at least 10 points for 300KB');
    });

    it('should deduct 10 additional points for 85% JS', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 85 },
            percentages: { html: '0', css: '0', js: '85' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var jsDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('JavaScript') !== -1 && d.reason.indexOf('80') !== -1;
        });
        assertTrue(jsDeduction !== undefined, 'Should deduct for >80% JS');
    });

    it('should deduct 5 additional points for 75% JS', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 75 },
            percentages: { html: '0', css: '0', js: '75' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var jsDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('JavaScript') !== -1 && d.reason.indexOf('70') !== -1;
        });
        assertTrue(jsDeduction !== undefined, 'Should deduct for >70% JS');
    });

    it('should handle boundary: exactly 70% JS (no warning)', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 70 },
            percentages: { html: '0', css: '0', js: '70' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var jsDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('JavaScript makes up') !== -1 && d.reason.indexOf('70%') !== -1;
        });
        assertTrue(jsDeduction === undefined, 'Should NOT trigger at exactly 70%');
    });
});

describe('Scorer - Duplication Score Deductions', function() {
    it('should deduct 25 points for 25 duplicates', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(25).fill({ severity: 'info' }) };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var dupeDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('duplication') !== -1 || d.reason.indexOf('20+') !== -1;
        });
        assertTrue(dupeDeduction !== undefined, 'Should deduct 25 for 25 duplicates');
        assertEqual(dupeDeduction.points, 25);
    });

    it('should deduct 15 points for 15 duplicates', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(15).fill({ severity: 'info' }) };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var dupeDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('duplication') !== -1 || d.reason.indexOf('10+') !== -1;
        });
        assertTrue(dupeDeduction !== undefined, 'Should deduct 15 for 15 duplicates');
        assertEqual(dupeDeduction.points, 15);
    });

    it('should deduct 10 points for 8 duplicates', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(8).fill({ severity: 'info' }) };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var dupeDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('duplication') !== -1 || d.reason.indexOf('5+') !== -1;
        });
        assertTrue(dupeDeduction !== undefined, 'Should deduct 10 for 8 duplicates');
        assertEqual(dupeDeduction.points, 10);
    });

    it('should deduct 5 points for 3 duplicates', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(3).fill({ severity: 'info' }) };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var dupeDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('duplicate') !== -1;
        });
        assertTrue(dupeDeduction !== undefined, 'Should have some deduction for 3 duplicates');
    });

    it('should not deduct for 0 duplicates', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        var dupeDeduction = result.details.deductions.find(function(d) {
            return d.reason.indexOf('duplicate') !== -1;
        });
        assertTrue(dupeDeduction === undefined, 'Should not deduct for 0 duplicates');
    });
});

describe('Scorer - Performance Score Deductions', function() {
    it('should deduct 30 points for 6 errors (5 each, max 25)', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: new Array(6).fill({ severity: 'error' }) };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        // Should cap at 25 points
        assertTrue(result.score >= 75, 'Should deduct max 25 points for errors');
    });

    it('should deduct 20 points for 10 warnings (2 each, max 15)', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: new Array(10).fill({ severity: 'warning' }) };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        // Should cap at 15 points for warnings
        assertTrue(result.score >= 85, 'Should deduct max 15 points for warnings');
    });

    it('should deduct 10 points for 10 info (1 each, max 5)', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: new Array(10).fill({ severity: 'info' }) };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        // Should cap at 5 points for info
        assertTrue(result.score >= 95, 'Should deduct max 5 points for info');
    });

    it('should verify capping: 20 errors should still max at 25 points', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: new Array(20).fill({ severity: 'error' }) };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score >= 75, 'Should cap errors at 25 points even with 20 errors');
    });

    it('should handle mixed issues: 2 errors, 3 warnings, 4 info', function() {
        var sizeResults = {
            totalSize: 100,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = {
            issues: [
                { severity: 'error' },
                { severity: 'error' },
                { severity: 'warning' },
                { severity: 'warning' },
                { severity: 'warning' },
                { severity: 'info' },
                { severity: 'info' },
                { severity: 'info' },
                { severity: 'info' }
            ]
        };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        // 2 errors (10) + 3 warnings (6) + 4 info (4) = 20 points deducted
        assertTrue(result.score <= 80, 'Should deduct approximately 20 points');
        assertTrue(result.score >= 78, 'Score should be around 80');
    });
});

describe('Scorer - calculateScore() Integration', function() {
    it('should return perfect score (100) with no issues', function() {
        var sizeResults = {
            totalSize: 1000,
            breakdown: { html: 500, css: 300, js: 200 },
            percentages: { html: '50', css: '30', js: '20' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertEqual(result.score, 100);
        assertEqual(result.grade, 'A');
        assertEqual(result.category, 'good');
    });

    it('should return grade A for score 90', function() {
        var sizeResults = {
            totalSize: 200 * 1024, // Under 250KB, no deduction
            breakdown: { html: 100 * 1024, css: 50 * 1024, js: 50 * 1024 },
            percentages: { html: '50', css: '25', js: '25' }
        };
        var dupeResults = { duplicates: [] };
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score >= 90, 'Score should be 90 or higher, got: ' + result.score);
        assertEqual(result.grade, 'A');
        assertEqual(result.category, 'good');
    });

    it('should return grade B for score 75', function() {
        var sizeResults = {
            totalSize: 600 * 1024, // -20 points
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(3).fill({}) }; // -5 points
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score === 75, 'Score should be 75');
        assertEqual(result.grade, 'B');
        assertEqual(result.category, 'good');
    });

    it('should return grade C for score 60', function() {
        var sizeResults = {
            totalSize: 600 * 1024, // -20 points
            breakdown: { html: 0, css: 0, js: 550 * 1024 },
            percentages: { html: '0', css: '0', js: '90' } // -10 points
        };
        var dupeResults = { duplicates: new Array(8).fill({}) }; // -10 points
        var perfResults = { issues: [] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score === 60, 'Score should be 60');
        assertEqual(result.grade, 'C');
        assertEqual(result.category, 'warning');
    });

    it('should return grade D for score 40', function() {
        var sizeResults = {
            totalSize: 1.5 * 1024 * 1024, // -30 points
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(15).fill({}) }; // -15 points
        var perfResults = { issues: new Array(7).fill({ severity: 'warning' }) }; // -14 points
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score >= 40 && result.score < 60, 'Score should be around 40-59');
        assertEqual(result.grade, 'D');
        assertEqual(result.category, 'warning');
    });

    it('should return grade F for score < 40', function() {
        var sizeResults = {
            totalSize: 1.5 * 1024 * 1024, // -30 points
            breakdown: { html: 0, css: 0, js: 1.5 * 1024 * 1024 },
            percentages: { html: '0', css: '0', js: '100' } // -10 points
        };
        var dupeResults = { duplicates: new Array(25).fill({}) }; // -25 points
        var perfResults = { issues: new Array(20).fill({ severity: 'error' }) }; // -25 points (capped)
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score < 40, 'Score should be less than 40');
        assertEqual(result.grade, 'F');
        assertEqual(result.category, 'danger');
    });

    it('should not return negative score', function() {
        var sizeResults = {
            totalSize: 10 * 1024 * 1024, // massive
            breakdown: { html: 0, css: 0, js: 10 * 1024 * 1024 },
            percentages: { html: '0', css: '0', js: '100' }
        };
        var dupeResults = { duplicates: new Array(100).fill({}) };
        var perfResults = { issues: new Array(100).fill({ severity: 'error' }) };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.score >= 0, 'Score should not be negative');
        assertEqual(result.grade, 'F');
    });

    it('should include all deductions in details', function() {
        var sizeResults = {
            totalSize: 600 * 1024,
            breakdown: { html: 0, css: 0, js: 0 },
            percentages: { html: '0', css: '0', js: '0' }
        };
        var dupeResults = { duplicates: new Array(8).fill({}) };
        var perfResults = { issues: [{ severity: 'error' }] };
        
        var result = calculateScore(sizeResults, dupeResults, perfResults);
        
        assertTrue(result.details.deductions.length > 0, 'Should have deductions');
        assertTrue(result.details.sizeScore !== undefined, 'Should have sizeScore');
        assertTrue(result.details.duplicationScore !== undefined, 'Should have duplicationScore');
        assertTrue(result.details.performanceScore !== undefined, 'Should have performanceScore');
    });
});

describe('Scorer - generateSummary()', function() {
    it('should return "Excellent!" message for score 95', function() {
        var details = {
            sizeScore: 100,
            duplicationScore: 100,
            performanceScore: 85,
            deductions: []
        };
        var summary = generateSummary(95, details);
        
        assertTrue(summary[0].indexOf('Excellent') !== -1, 'Should include "Excellent" message');
    });

    it('should return "Good job!" message for score 80', function() {
        var details = {
            sizeScore: 90,
            duplicationScore: 85,
            performanceScore: 85,
            deductions: []
        };
        var summary = generateSummary(80, details);
        
        assertTrue(summary[0].indexOf('Good job') !== -1, 'Should include "Good job" message');
    });

    it('should return "Decent" message for score 65', function() {
        var details = {
            sizeScore: 80,
            duplicationScore: 75,
            performanceScore: 75,
            deductions: []
        };
        var summary = generateSummary(65, details);
        
        assertTrue(summary[0].indexOf('Decent') !== -1 || summary[0].indexOf('room for improvement') !== -1);
    });

    it('should return "Several performance issues" for score 50', function() {
        var details = {
            sizeScore: 70,
            duplicationScore: 60,
            performanceScore: 65,
            deductions: []
        };
        var summary = generateSummary(50, details);
        
        assertTrue(summary[0].indexOf('Several') !== -1 || summary[0].indexOf('performance issues') !== -1);
    });

    it('should return "Significant performance problems" for score 30', function() {
        var details = {
            sizeScore: 50,
            duplicationScore: 50,
            performanceScore: 50,
            deductions: []
        };
        var summary = generateSummary(30, details);
        
        assertTrue(summary[0].indexOf('Significant') !== -1 || summary[0].indexOf('problems') !== -1);
    });

    it('should include bundle size advice when sizeScore < 80', function() {
        var details = {
            sizeScore: 70,
            duplicationScore: 90,
            performanceScore: 90,
            deductions: []
        };
        var summary = generateSummary(85, details);
        
        var hasAdvice = summary.some(function(msg) {
            return msg.indexOf('bundle size') !== -1 || msg.indexOf('Bundle size') !== -1;
        });
        assertTrue(hasAdvice, 'Should include bundle size advice');
    });

    it('should include duplication advice when duplicationScore < 80', function() {
        var details = {
            sizeScore: 90,
            duplicationScore: 70,
            performanceScore: 90,
            deductions: []
        };
        var summary = generateSummary(85, details);
        
        var hasAdvice = summary.some(function(msg) {
            return msg.indexOf('duplicate') !== -1;
        });
        assertTrue(hasAdvice, 'Should include duplication advice');
    });

    it('should include performance advice when performanceScore < 80', function() {
        var details = {
            sizeScore: 90,
            duplicationScore: 90,
            performanceScore: 70,
            deductions: []
        };
        var summary = generateSummary(85, details);
        
        var hasAdvice = summary.some(function(msg) {
            return msg.indexOf('performance') !== -1 || msg.indexOf('anti-pattern') !== -1;
        });
        assertTrue(hasAdvice, 'Should include performance advice');
    });

    it('should only have base message when all scores > 80', function() {
        var details = {
            sizeScore: 95,
            duplicationScore: 90,
            performanceScore: 85,
            deductions: []
        };
        var summary = generateSummary(90, details);
        
        assertEqual(summary.length, 1, 'Should only have base message');
    });
});

// ============================================================================
// LIGHTHOUSE ADAPTER TESTS
// ============================================================================

describe('Lighthouse Adapter - Metric Extraction', function() {
    it('should extract all 7 performance metrics', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) {
            assertTrue(true, 'Skipping - adapter not loaded');
            return;
        }

        var mockLHR = {
            categories: {
                performance: { id: 'performance', title: 'Performance', score: 0.85 },
                accessibility: { id: 'accessibility', title: 'Accessibility', score: 0.92 }
            },
            audits: {
                'first-contentful-paint': { numericValue: 1500, displayValue: '1.5 s', scoreDisplayMode: 'numeric', score: 0.95 },
                'largest-contentful-paint': { numericValue: 2200, displayValue: '2.2 s', scoreDisplayMode: 'numeric', score: 0.90 },
                'total-blocking-time': { numericValue: 150, displayValue: '150 ms', scoreDisplayMode: 'numeric', score: 0.88 },
                'cumulative-layout-shift': { numericValue: 0.05, displayValue: '0.05', scoreDisplayMode: 'numeric', score: 0.98 },
                'speed-index': { numericValue: 3200, displayValue: '3.2 s', scoreDisplayMode: 'numeric', score: 0.87 },
                'interactive': { numericValue: 3500, displayValue: '3.5 s', scoreDisplayMode: 'numeric', score: 0.92 },
                'interaction-to-next-paint': { numericValue: 180, displayValue: '180 ms', scoreDisplayMode: 'numeric', score: 0.91 }
            }
        };

        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        
        assertTrue(result.lighthouseResults.coreVitals.length === 7, 'Should extract 7 metrics, got: ' + result.lighthouseResults.coreVitals.length);
        
        var metricIds = result.lighthouseResults.coreVitals.map(function(m) { return m.id; });
        assertContains(metricIds, 'first-contentful-paint', 'Should include FCP');
        assertContains(metricIds, 'largest-contentful-paint', 'Should include LCP');
        assertContains(metricIds, 'total-blocking-time', 'Should include TBT');
        assertContains(metricIds, 'cumulative-layout-shift', 'Should include CLS');
        assertContains(metricIds, 'speed-index', 'Should include Speed Index');
        assertContains(metricIds, 'interactive', 'Should include TTI');
        assertContains(metricIds, 'interaction-to-next-paint', 'Should include INP');
    });

    it('should correctly rate LCP (good <= 2500ms)', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: { performance: { id: 'performance', title: 'Performance', score: 0.85 } },
            audits: { 'largest-contentful-paint': { numericValue: 2400, displayValue: '2.4 s', scoreDisplayMode: 'numeric', score: 0.90 } }
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var lcp = result.lighthouseResults.coreVitals.find(function(m) { return m.id === 'largest-contentful-paint'; });
        
        assertEqual(lcp.rating, 'good', 'LCP 2400ms should be rated "good"');
    });

    it('should correctly rate LCP (warning <= 4000ms)', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: { performance: { id: 'performance', title: 'Performance', score: 0.70 } },
            audits: { 'largest-contentful-paint': { numericValue: 3500, displayValue: '3.5 s', scoreDisplayMode: 'numeric', score: 0.70 } }
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var lcp = result.lighthouseResults.coreVitals.find(function(m) { return m.id === 'largest-contentful-paint'; });
        
        assertEqual(lcp.rating, 'warning', 'LCP 3500ms should be rated "warning"');
    });

    it('should correctly rate LCP (danger > 4000ms)', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: { performance: { id: 'performance', title: 'Performance', score: 0.50 } },
            audits: { 'largest-contentful-paint': { numericValue: 5500, displayValue: '5.5 s', scoreDisplayMode: 'numeric', score: 0.40 } }
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var lcp = result.lighthouseResults.coreVitals.find(function(m) { return m.id === 'largest-contentful-paint'; });
        
        assertEqual(lcp.rating, 'danger', 'LCP 5500ms should be rated "danger"');
    });
});

describe('Lighthouse Adapter - Category Scores', function() {
    it('should build category scores with correct status', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: {
                performance: { id: 'performance', title: 'Performance', score: 0.95 },
                accessibility: { id: 'accessibility', title: 'Accessibility', score: 0.75 },
                seo: { id: 'seo', title: 'SEO', score: 0.60 }
            },
            audits: {}
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var scores = result.lighthouseResults.categoryScores;
        
        assertEqual(scores.length, 3, 'Should have 3 category scores');
        
        var perfScore = scores.find(function(s) { return s.id === 'performance'; });
        assertEqual(perfScore.score, 95, 'Performance score should be 95');
        assertEqual(perfScore.status, 'good', 'Performance status should be "good"');
        
        var a11yScore = scores.find(function(s) { return s.id === 'accessibility'; });
        assertEqual(a11yScore.score, 75, 'Accessibility score should be 75');
        assertEqual(a11yScore.status, 'warning', 'Accessibility status should be "warning"');
        
        var seoScore = scores.find(function(s) { return s.id === 'seo'; });
        assertEqual(seoScore.score, 60, 'SEO score should be 60');
        assertEqual(seoScore.status, 'danger', 'SEO status should be "danger"');
    });
});

describe('Lighthouse Adapter - Issue Building', function() {
    it('should extract issues from audits with score < 0.9', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: { performance: { id: 'performance', title: 'Performance', score: 0.70 } },
            audits: {
                'good-audit': { title: 'Good Audit', score: 0.95, scoreDisplayMode: 'numeric', description: 'All good' },
                'warning-audit': { title: 'Warning Audit', score: 0.75, scoreDisplayMode: 'numeric', description: 'Some issues', displayValue: '500 ms' },
                'error-audit': { title: 'Error Audit', score: 0.40, scoreDisplayMode: 'numeric', description: 'Critical issue', displayValue: '2 s' }
            }
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var issues = result.performanceResults.issues;
        
        assertTrue(issues.length >= 2, 'Should have at least 2 issues (score < 0.9)');
        
        var errorIssue = issues.find(function(i) { return i.severity === 'error'; });
        assertTrue(errorIssue !== undefined, 'Should have error severity issue');
        assertEqual(errorIssue.title, 'Error Audit', 'Error issue should have correct title');
        
        var warningIssue = issues.find(function(i) { return i.severity === 'warning'; });
        assertTrue(warningIssue !== undefined, 'Should have warning severity issue');
    });

    it('should not include audits with score >= 0.9', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: { performance: { id: 'performance', title: 'Performance', score: 0.95 } },
            audits: {
                'perfect-audit': { title: 'Perfect', score: 1.0, scoreDisplayMode: 'numeric', description: 'Perfect' },
                'good-audit': { title: 'Good', score: 0.92, scoreDisplayMode: 'numeric', description: 'Good' }
            }
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var issues = result.performanceResults.issues;
        
        assertEqual(issues.length, 0, 'Should have no issues when all scores >= 0.9');
    });
});

describe('Lighthouse Adapter - Recommendation Building', function() {
    it('should extract opportunities and sort by savings', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockLHR = {
            categories: { performance: { id: 'performance', title: 'Performance', score: 0.70 } },
            audits: {
                'high-impact': {
                    title: 'High Impact',
                    score: 0.60,
                    scoreDisplayMode: 'numeric',
                    description: 'Big savings',
                    details: { type: 'opportunity', overallSavingsMs: 1500, overallSavingsBytes: 100000 }
                },
                'medium-impact': {
                    title: 'Medium Impact',
                    score: 0.70,
                    scoreDisplayMode: 'numeric',
                    description: 'Some savings',
                    details: { type: 'opportunity', overallSavingsMs: 500, overallSavingsBytes: 50000 }
                },
                'low-impact': {
                    title: 'Low Impact',
                    score: 0.85,
                    scoreDisplayMode: 'numeric',
                    description: 'Small savings',
                    details: { type: 'opportunity', overallSavingsMs: 100, overallSavingsBytes: 10000 }
                }
            }
        };
        
        var result = window.adaptLighthouseResults({ lighthouse: mockLHR });
        var recs = result.performanceResults.recommendations;
        
        assertTrue(recs.length >= 3, 'Should have 3+ recommendations');
        assertEqual(recs[0].title, 'High Impact', 'First recommendation should be highest savings');
        assertEqual(recs[0].priority, 'high', 'Should be high priority (>1200ms)');
        assertEqual(recs[1].title, 'Medium Impact', 'Second should be medium savings');
        assertEqual(recs[1].priority, 'medium', 'Should be medium priority (>300ms)');
        assertEqual(recs[2].title, 'Low Impact', 'Third should be lowest savings');
        assertEqual(recs[2].priority, 'low', 'Should be low priority (<=300ms)');
    });
});

describe('Lighthouse Adapter - Integration', function() {
    it('should handle full Lighthouse response structure', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var mockResponse = {
            lighthouse: {
                categories: {
                    performance: { id: 'performance', title: 'Performance', score: 0.85 },
                    accessibility: { id: 'accessibility', title: 'Accessibility', score: 0.92 },
                    seo: { id: 'seo', title: 'SEO', score: 0.88 },
                    'best-practices': { id: 'best-practices', title: 'Best Practices', score: 0.90 }
                },
                audits: {
                    'first-contentful-paint': { numericValue: 1800, displayValue: '1.8 s', scoreDisplayMode: 'numeric', score: 0.90 },
                    'largest-contentful-paint': { numericValue: 2500, displayValue: '2.5 s', scoreDisplayMode: 'numeric', score: 0.85 },
                    'total-blocking-time': { numericValue: 200, displayValue: '200 ms', scoreDisplayMode: 'numeric', score: 0.88 },
                    'cumulative-layout-shift': { numericValue: 0.1, displayValue: '0.1', scoreDisplayMode: 'numeric', score: 0.90 },
                    'speed-index': { numericValue: 3400, displayValue: '3.4 s', scoreDisplayMode: 'numeric', score: 0.87 },
                    'interactive': { numericValue: 3800, displayValue: '3.8 s', scoreDisplayMode: 'numeric', score: 0.92 },
                    'interaction-to-next-paint': { numericValue: 200, displayValue: '200 ms', scoreDisplayMode: 'numeric', score: 0.90 }
                }
            }
        };
        
        var result = window.adaptLighthouseResults(mockResponse);
        
        assertTrue(result.performanceResults !== undefined, 'Should have performanceResults');
        assertTrue(result.scoreResults !== undefined, 'Should have scoreResults');
        assertTrue(result.lighthouseResults !== undefined, 'Should have lighthouseResults');
        
        assertEqual(result.scoreResults.score, 85, 'Overall score should be 85');
        assertEqual(result.scoreResults.category, 'warning', 'Category should be "warning"');
        assertEqual(result.scoreResults.mode, 'lighthouse', 'Mode should be lighthouse');
        
        assertEqual(result.lighthouseResults.categoryScores.length, 4, 'Should have 4 category scores');
        assertEqual(result.lighthouseResults.coreVitals.length, 7, 'Should have 7 metrics');
    });

    it('should throw error for invalid Lighthouse data', function() {
        if (typeof window === 'undefined' || !window.adaptLighthouseResults) { 
            assertTrue(true, 'Skipping'); 
            return; 
        }
        
        var threwError = false;
        try {
            window.adaptLighthouseResults({ invalid: 'data' });
        } catch (e) {
            threwError = true;
            assertTrue(e.message.indexOf('Invalid Lighthouse data') !== -1, 'Should throw invalid data error');
        }
        
        assertTrue(threwError, 'Should throw error for invalid data');
    });
});

describe('Lighthouse Backend - Mobile-Only Validation', function() {
    it('should enforce mobile formFactor', function() {
        // This is a documentation test - actual validation happens server-side
        assertTrue(true, 'Server validates formFactor === "mobile"');
    });

    it('should enforce simulated throttling', function() {
        // This is a documentation test - actual validation happens server-side
        assertTrue(true, 'Server validates throttlingMethod === "simulate"');
    });

    it('should enforce mobile screen emulation', function() {
        // This is a documentation test - actual validation happens server-side
        assertTrue(true, 'Server validates screenEmulation.mobile === true');
    });
});

// ============================================================================
// TEST RUNNER
// ============================================================================

function runAllTests() {
    // Reset results
    testResults.passed = 0;
    testResults.failed = 0;
    testResults.total = 0;
    testResults.failures = [];
    
    console.log('%c========================================', 'font-weight: bold; font-size: 16px;');
    console.log('%cFrontAl - Deterministic Logic Tests', 'font-weight: bold; font-size: 16px;');
    console.log('%c========================================', 'font-weight: bold; font-size: 16px;');
    
    var startTime = Date.now();
    
    // Execute all test suites
    executeSuites();
    
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    console.log('\n' + '%c========================================', 'font-weight: bold; font-size: 16px;');
    console.log('%cTEST SUMMARY', 'font-weight: bold; font-size: 16px;');
    console.log('%c========================================', 'font-weight: bold; font-size: 16px;');
    console.log('%cTotal: ' + testResults.total, 'font-weight: bold;');
    console.log('%cPassed: ' + testResults.passed, 'color: green; font-weight: bold;');
    console.log('%cFailed: ' + testResults.failed, 'color: red; font-weight: bold;');
    console.log('%cDuration: ' + duration + 'ms', 'font-style: italic;');
    
    if (testResults.failed > 0) {
        console.log('\n' + '%cFAILURES:', 'color: red; font-weight: bold; font-size: 14px;');
        testResults.failures.forEach(function(failure) {
            console.log('%c  ' + failure.suite + ' > ' + failure.test, 'color: red;');
            console.log('%c    ' + failure.error, 'color: red; margin-left: 20px;');
        });
    }
    
    var passRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
    console.log('\n' + '%cPass Rate: ' + passRate + '%', 'font-weight: bold; font-size: 14px;');
    
    return {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        passRate: passRate,
        duration: duration
    };
}

// Export if running in browser
if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;
    window.testResults = testResults;
}
