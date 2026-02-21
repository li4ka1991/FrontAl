/**
 * FrontAl - Frontend Performance & Bundle Analyzer
 * Main application logic
 */

// State
let currentFiles = [];
let currentMode = 'paste';
let lastAuditUrl = '';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const modeButtons = document.querySelectorAll('.mode-btn');
const pasteMode = document.querySelector('.paste-mode');
const uploadMode = document.querySelector('.upload-mode');
const urlMode = document.querySelector('.url-mode');
const urlInput = document.getElementById('urlInput');
const lighthouseScoresCard = document.getElementById('lighthouseScoresCard');
const coreVitalsCard = document.getElementById('coreVitalsCard');
const errorCard = document.getElementById('errorCard');

// Text input elements
const htmlInput = document.getElementById('htmlInput');
const cssInput = document.getElementById('cssInput');
const jsInput = document.getElementById('jsInput');

function setupEventListeners() {
    // Mode switching
    modeButtons.forEach(button => {
        button.addEventListener('click', () => switchMode(button.dataset.mode));
    });

    // File upload
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Analyze button
    analyzeBtn.addEventListener('click', runAnalysis);

    // URL input
    urlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runAnalysis();
        }
    });
}

setupEventListeners();

function switchMode(mode) {
    currentMode = mode;

    // Toggle input areas
    pasteMode.classList.toggle('hidden', mode !== 'paste');
    uploadMode.classList.toggle('hidden', mode !== 'upload');
    urlMode.classList.toggle('hidden', mode !== 'url');

    modeButtons.forEach(button => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (mode === 'upload') {
        htmlInput.value = '';
        cssInput.value = '';
        jsInput.value = '';
        dropZone.focus();
    }

    if (mode === 'paste') {
        currentFiles = [];
        fileInput.value = '';
        renderFileList();
        htmlInput.focus();
    }

    if (mode === 'url') {
        currentFiles = [];
        fileInput.value = '';
        renderFileList();
        htmlInput.value = '';
        cssInput.value = '';
        jsInput.value = '';
        urlInput.focus();
    }

    setAnalyzeButtonLabel();

    // Clear results
    resultsSection.classList.add('hidden');
    resultsSection.setAttribute('aria-busy', 'false');
    clearErrorCard();
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

async function processFiles(files) {
    currentFiles = [];

    for (const file of files) {
        const content = await readFileContent(file);
        const type = getFileType(file.name);
        
        currentFiles.push({
            name: file.name,
            type,
            content,
            size: file.size
        });
    }

    renderFileList();
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'js') return 'js';
    return 'unknown';
}

function renderFileList() {
    if (currentFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = currentFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-item-info">
                <span class="file-type-badge ${file.type}">${file.type.toUpperCase()}</span>
                <span class="file-item-name">${file.name}</span>
                <span class="file-item-size">${formatBytes(file.size)}</span>
            </div>
            <button class="remove-file-btn" onclick="removeFile(event, ${index})">✕</button>
        </div>
    `).join('');
}

window.removeFile = function(event, index) {
    event.stopPropagation();
    currentFiles.splice(index, 1);
    renderFileList();
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runAnalysis() {
    clearErrorCard();

    if (currentMode === 'url') {
        await runLighthouseAnalysis();
        return;
    }

    await runStaticAnalysis();
}

async function runStaticAnalysis() {
    let filesToAnalyze = [];

    if (currentMode === 'upload') {
        filesToAnalyze = currentFiles;
    } else {
        if (htmlInput.value.trim()) {
            filesToAnalyze.push({
                name: 'pasted.html',
                type: 'html',
                content: htmlInput.value,
                size: htmlInput.value.length
            });
        }
        if (cssInput.value.trim()) {
            filesToAnalyze.push({
                name: 'pasted.css',
                type: 'css',
                content: cssInput.value,
                size: cssInput.value.length
            });
        }
        if (jsInput.value.trim()) {
            filesToAnalyze.push({
                name: 'pasted.js',
                type: 'js',
                content: jsInput.value,
                size: jsInput.value.length
            });
        }
    }

    if (filesToAnalyze.length === 0) {
        alert('Please provide some code to analyze!');
        return;
    }

    setResultsMode('static');
    setLoadingState(true, 'Analyzing...');

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const sizeResults = analyzeSizes(filesToAnalyze);
        const duplicationResults = detectDuplication(filesToAnalyze);
        const performanceResults = analyzePerformance(filesToAnalyze);
        const scoreResults = calculateScore(sizeResults, duplicationResults, performanceResults);

        renderResults({ sizeResults, duplicationResults, performanceResults, scoreResults });
        showResultsSection();
    } catch (error) {
        console.error('Analysis error:', error);
        alert('An error occurred during analysis. Please check the console for details.');
    } finally {
        setLoadingState(false);
    }
}

async function runLighthouseAnalysis() {
    setResultsMode('lighthouse');
    const url = getUrlToAudit();
    if (!url) {
        renderErrorCard('Please enter a valid URL starting with http or https.');
        showResultsSection();
        return;
    }

    lastAuditUrl = url;
    setLoadingState(true, 'Running Lighthouse...');

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const rawResults = await fetchLighthouseAudit(url);
        const adapted = adaptLighthouseResults(rawResults);

        renderResults({
            performanceResults: adapted.performanceResults,
            scoreResults: adapted.scoreResults,
            lighthouseResults: adapted.lighthouseResults
        });

        showResultsSection();
    } catch (error) {
        console.error('Audit error:', error);
        renderErrorCard(getUserFriendlyError(error));
        showResultsSection();
    } finally {
        setLoadingState(false);
    }
}

function getUrlToAudit() {
    const value = urlInput.value.trim();
    if (!value) {
        return '';
    }

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }
        return parsed.toString();
    } catch (error) {
        return '';
    }
}

function setAnalyzeButtonLabel() {
    const label = currentMode === 'url' ? 'Analyze URL' : 'Analyze Code';
    analyzeBtn.innerHTML = `<span class="btn-text">${label}</span><span class="btn-icon">🔍</span>`;
}

function setLoadingState(isLoading, text = 'Analyzing...') {
    analyzeBtn.classList.toggle('loading', isLoading);
    analyzeBtn.disabled = isLoading;
    resultsSection.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    if (isLoading) {
        analyzeBtn.innerHTML = `<span class="btn-text">${text}</span><span class="btn-icon">⏳</span>`;
        return;
    }

    setAnalyzeButtonLabel();
}

function setResultsMode(mode) {
    const sizeCard = document.getElementById('sizeResults').closest('.result-card');
    const duplicationCard = document.getElementById('duplicationResults').closest('.result-card');

    const isLighthouse = mode === 'lighthouse';
    sizeCard.classList.toggle('hidden', isLighthouse);
    duplicationCard.classList.toggle('hidden', isLighthouse);
    lighthouseScoresCard.classList.toggle('hidden', !isLighthouse);
    coreVitalsCard.classList.toggle('hidden', !isLighthouse);
}

function showResultsSection() {
    resultsSection.classList.remove('hidden');
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function getUserFriendlyError(error) {
    if (!error) return 'Audit failed. Please try again.';
    if (error.code === 'timeout') return 'Audit timed out. Please try again with a faster page or later.';
    if (error.code === 'http_error') return error.message || 'Audit failed. Please verify the URL.';
    return 'Audit failed. Please check that the backend server is running.';
}

function renderErrorCard(message) {
    const container = document.getElementById('errorResults');
    const safeMessage = escapeHtml(message || 'Audit failed. Please try again.');

    container.innerHTML = `
        <p>${safeMessage}</p>
        <button class="retry-btn" id="retryAuditBtn" type="button">Retry audit</button>
    `;

    errorCard.classList.remove('hidden');
    const retryBtn = document.getElementById('retryAuditBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            if (lastAuditUrl) {
                urlInput.value = lastAuditUrl;
            }
            runAnalysis();
        });
    }
}

function clearErrorCard() {
    const container = document.getElementById('errorResults');
    if (container) {
        container.innerHTML = '';
    }
    if (errorCard) {
        errorCard.classList.add('hidden');
    }
}

function renderResults({ sizeResults, duplicationResults, performanceResults, scoreResults, lighthouseResults }) {
    if (scoreResults) {
        renderOverallScore(scoreResults);
    }

    if (sizeResults) {
        renderSizeResults(sizeResults);
    }

    if (duplicationResults) {
        renderDuplicationResults(duplicationResults);
    }

    if (performanceResults) {
        renderPerformanceResults(performanceResults);
        renderRecommendations(performanceResults, scoreResults);
    }

    if (lighthouseResults) {
        renderLighthouseScores(lighthouseResults);
        renderCoreVitals(lighthouseResults);
    }
}

function renderLighthouseScores(lighthouseResults) {
    const container = document.getElementById('lighthouseScoresResults');
    if (!lighthouseResults.categoryScores || lighthouseResults.categoryScores.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No Lighthouse scores available.</p>';
        return;
    }

    let html = '<div class="lighthouse-scores">';
    lighthouseResults.categoryScores.forEach(category => {
        const statusClass = category.status === 'good' ? 'score-good' : category.status === 'warning' ? 'score-warning' : 'score-danger';
        html += `
            <div class="lighthouse-score">
                <div class="score-ring ${statusClass}" style="--score:${category.score}">
                    <span>${category.score}</span>
                </div>
                <div class="score-labels">
                    <span>${escapeHtml(category.title)}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function renderCoreVitals(lighthouseResults) {
    const container = document.getElementById('coreVitalsResults');
    if (!lighthouseResults.coreVitals || lighthouseResults.coreVitals.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Core Web Vitals data is unavailable.</p>';
        return;
    }

    let html = '<div class="vitals-list">';
    lighthouseResults.coreVitals.forEach(metric => {
        const ratingClass = metric.rating === 'good' ? 'vital-good' : metric.rating === 'warning' ? 'vital-warning' : 'vital-danger';
        html += `
            <div class="vital-item">
                <span class="vital-label">${escapeHtml(metric.label)}</span>
                <span class="vital-value">${escapeHtml(metric.value)}</span>
                <span class="vital-badge ${ratingClass}">${escapeHtml(metric.rating)}</span>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function renderOverallScore(scoreResults) {
    const scoreElement = document.getElementById('overallScore');
    const scoreCircle = scoreElement.querySelector('.score-circle');
    const scoreValue = scoreElement.querySelector('.score-value');

    const score = typeof scoreResults.score === 'number' ? scoreResults.score : 0;
    scoreValue.textContent = score;
    scoreCircle.className = `score-circle ${scoreResults.category || 'warning'}`;
}

function renderSizeResults(sizeResults) {
    const container = document.getElementById('sizeResults');
    
    let html = '<div class="metrics-list">';
    
    // Add metrics
    sizeResults.metrics.forEach(metric => {
        html += `
            <div class="metric">
                <span class="metric-label">${metric.label}</span>
                <span class="metric-value">${metric.value}</span>
            </div>
        `;
    });
    
    html += '</div>';

    // Add visual breakdown
    if (sizeResults.totalSize > 0) {
        html += `
            <div class="size-breakdown">
                <div class="size-bar">
                    ${sizeResults.percentages.html > 0 ? `<div class="size-segment html" style="width: ${sizeResults.percentages.html}%">${sizeResults.percentages.html}%</div>` : ''}
                    ${sizeResults.percentages.css > 0 ? `<div class="size-segment css" style="width: ${sizeResults.percentages.css}%">${sizeResults.percentages.css}%</div>` : ''}
                    ${sizeResults.percentages.js > 0 ? `<div class="size-segment js" style="width: ${sizeResults.percentages.js}%">${sizeResults.percentages.js}%</div>` : ''}
                </div>
            </div>
            <div class="legend">
                ${sizeResults.percentages.html > 0 ? '<div class="legend-item"><div class="legend-color" style="background: var(--html-color)"></div><span class="legend-label">HTML</span></div>' : ''}
                ${sizeResults.percentages.css > 0 ? '<div class="legend-item"><div class="legend-color" style="background: var(--css-color)"></div><span class="legend-label">CSS</span></div>' : ''}
                ${sizeResults.percentages.js > 0 ? '<div class="legend-item"><div class="legend-color" style="background: var(--js-color)"></div><span class="legend-label">JavaScript</span></div>' : ''}
            </div>
        `;
    }

    // Add issues
    if (sizeResults.issues && sizeResults.issues.length > 0) {
        html += '<div class="issues-list" style="margin-top: 1.5rem;">';
        sizeResults.issues.forEach(issue => {
            html += renderIssue(issue);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function renderDuplicationResults(duplicationResults) {
    const container = document.getElementById('duplicationResults');
    
    if (duplicationResults.duplicates.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary); font-weight: 600;">✓ No significant duplication detected!</p>';
        return;
    }

    let html = `<p style="margin-bottom: 1rem; color: var(--text-secondary);">Found ${duplicationResults.duplicates.length} duplication issue(s)</p>`;
    html += '<div class="issues-list">';
    
    duplicationResults.duplicates.forEach(dup => {
        html += `
            <div class="issue ${dup.severity}">
                <div class="issue-header">
                    <span class="issue-severity ${dup.severity}">${escapeHtml(dup.severity)}</span>
                    <span class="issue-title">${escapeHtml(dup.title)}</span>
                </div>
                <div class="issue-description">
                    ${escapeHtml(dup.description)}
                    ${dup.file ? `<br><small style="opacity: 0.8;">File: ${escapeHtml(dup.file)}</small>` : ''}
                </div>
                ${dup.code ? `<div class="issue-code">${escapeHtml(dup.code)}</div>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderPerformanceResults(performanceResults) {
    const container = document.getElementById('performanceResults');

    if (!performanceResults || performanceResults.issues.length === 0) {
        const message = performanceResults && performanceResults.mode === 'lighthouse'
            ? '✓ No critical Lighthouse performance issues detected!'
            : '✓ No critical performance issues detected!';
        container.innerHTML = `<p style="color: var(--secondary); font-weight: 600;">${message}</p>`;
        return;
    }

    let html = `<p style="margin-bottom: 1rem; color: var(--text-secondary);">Found ${performanceResults.issues.length} performance issue(s)</p>`;
    html += '<div class="issues-list">';
    
    performanceResults.issues.forEach(issue => {
        html += renderIssue(issue);
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderIssue(issue) {
    const severity = issue.severity || 'info';
    const title = escapeHtml(issue.title || 'Issue');
    const description = escapeHtml(issue.description || '');
    const suggestion = issue.suggestion ? escapeHtml(issue.suggestion) : '';
    const file = issue.file ? escapeHtml(issue.file) : '';
    return `
        <div class="issue ${severity}">
            <div class="issue-header">
                <span class="issue-severity ${severity}">${escapeHtml(severity)}</span>
                <span class="issue-title">${title}</span>
            </div>
            <div class="issue-description">
                ${description}
                ${file ? `<br><small style="opacity: 0.8;">File: ${file}</small>` : ''}
            </div>
            ${suggestion ? `<div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 6px; font-size: 0.9rem;"><strong>💡 Suggestion:</strong> ${suggestion}</div>` : ''}
            ${issue.code ? `<div class="issue-code">${escapeHtml(issue.code)}</div>` : ''}
        </div>
    `;
}

function renderRecommendations(performanceResults, scoreResults) {
    const container = document.getElementById('recommendationsResults');
    
    let html = '';

    // Add score summary
    if (scoreResults && scoreResults.summary) {
        html += '<div style="margin-bottom: 1.5rem;">';
        scoreResults.summary.forEach(msg => {
            html += `<p style="margin-bottom: 0.5rem; color: var(--text-secondary);">${escapeHtml(msg)}</p>`;
        });
        html += '</div>';
    }

    // Add PageSpeed recommendations
    if (performanceResults && performanceResults.recommendations && performanceResults.recommendations.length > 0) {
        performanceResults.recommendations.forEach(rec => {
            const priorityClass = rec.priority === 'high' ? 'recommendation-high' : rec.priority === 'medium' ? 'recommendation-medium' : 'recommendation-variable';
            html += `
                <div class="recommendation ${priorityClass}">
                    <div class="recommendation-title">
                        ${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                        ${escapeHtml(rec.title)}
                    </div>
                    <div class="recommendation-description">
                        ${escapeHtml(rec.description)}
                        <br><br>
                        <strong>Impact:</strong> ${escapeHtml(rec.impact)}
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p style="color: var(--secondary); font-weight: 600;">✓ Following best practices!</p>';
    }

    container.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
