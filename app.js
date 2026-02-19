/**
 * FrontAl - Frontend Performance & Bundle Analyzer
 * Main application logic
 */

import { analyzeSizes } from './modules/sizeAnalyzer.js';
import { detectDuplication } from './modules/duplicationDetector.js';
import { analyzePerformance } from './modules/performanceAnalyzer.js';
import { calculateScore } from './modules/scorer.js';

// State
let currentFiles = [];
let currentMode = 'upload';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const modeBtns = document.querySelectorAll('.mode-btn');

// Text input elements
const htmlInput = document.getElementById('htmlInput');
const cssInput = document.getElementById('cssInput');
const jsInput = document.getElementById('jsInput');

// Initialize
init();

function init() {
    setupEventListeners();
}

function setupEventListeners() {
    // Mode switching
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });

    // File upload
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Analyze button
    analyzeBtn.addEventListener('click', runAnalysis);
}

function switchMode(mode) {
    currentMode = mode;
    
    // Update buttons
    modeBtns.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle input areas
    const uploadMode = document.querySelector('.upload-mode');
    const pasteMode = document.querySelector('.paste-mode');

    if (mode === 'upload') {
        uploadMode.classList.remove('hidden');
        pasteMode.classList.add('hidden');
    } else {
        uploadMode.classList.add('hidden');
        pasteMode.classList.remove('hidden');
    }

    // Clear results
    resultsSection.classList.add('hidden');
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
            <button class="remove-file-btn" onclick="removeFile(${index})">✕</button>
        </div>
    `).join('');
}

window.removeFile = function(index) {
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
    // Prepare files based on mode
    let filesToAnalyze = [];

    if (currentMode === 'upload') {
        filesToAnalyze = currentFiles;
    } else {
        // Paste mode - collect from textareas
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

    // Show loading state
    analyzeBtn.classList.add('loading');
    analyzeBtn.innerHTML = '<span class="btn-text">Analyzing...</span><span class="btn-icon">⏳</span>';

    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        // Run all analyses
        const sizeResults = analyzeSizes(filesToAnalyze);
        const duplicationResults = detectDuplication(filesToAnalyze);
        const performanceResults = analyzePerformance(filesToAnalyze);
        const scoreResults = calculateScore(sizeResults, duplicationResults, performanceResults);

        // Render results
        renderResults(sizeResults, duplicationResults, performanceResults, scoreResults);

        // Show results section
        resultsSection.classList.remove('hidden');

        // Scroll to results
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } catch (error) {
        console.error('Analysis error:', error);
        alert('An error occurred during analysis. Please check the console for details.');
    } finally {
        // Reset button
        analyzeBtn.classList.remove('loading');
        analyzeBtn.innerHTML = '<span class="btn-text">Analyze Code</span><span class="btn-icon">🔍</span>';
    }
}

function renderResults(sizeResults, duplicationResults, performanceResults, scoreResults) {
    // Render overall score
    renderOverallScore(scoreResults);

    // Render size results
    renderSizeResults(sizeResults);

    // Render duplication results
    renderDuplicationResults(duplicationResults);

    // Render performance results
    renderPerformanceResults(performanceResults);

    // Render recommendations
    renderRecommendations(performanceResults, scoreResults);
}

function renderOverallScore(scoreResults) {
    const scoreElement = document.getElementById('overallScore');
    const scoreCircle = scoreElement.querySelector('.score-circle');
    const scoreValue = scoreElement.querySelector('.score-value');

    scoreValue.textContent = scoreResults.score;
    scoreCircle.className = `score-circle ${scoreResults.category}`;
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
                    <span class="issue-severity ${dup.severity}">${dup.severity}</span>
                    <span class="issue-title">${dup.title}</span>
                </div>
                <div class="issue-description">${dup.description}</div>
                ${dup.code ? `<div class="issue-code">${escapeHtml(dup.code)}</div>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderPerformanceResults(performanceResults) {
    const container = document.getElementById('performanceResults');
    
    if (performanceResults.issues.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary); font-weight: 600;">✓ No critical performance issues detected!</p>';
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
    return `
        <div class="issue ${issue.severity}">
            <div class="issue-header">
                <span class="issue-severity ${issue.severity}">${issue.severity}</span>
                <span class="issue-title">${issue.title}</span>
            </div>
            <div class="issue-description">
                ${issue.description}
                ${issue.file ? `<br><small style="opacity: 0.8;">File: ${issue.file}</small>` : ''}
            </div>
            ${issue.suggestion ? `<div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 6px; font-size: 0.9rem;"><strong>💡 Suggestion:</strong> ${issue.suggestion}</div>` : ''}
            ${issue.code ? `<div class="issue-code">${escapeHtml(issue.code)}</div>` : ''}
        </div>
    `;
}

function renderRecommendations(performanceResults, scoreResults) {
    const container = document.getElementById('recommendationsResults');
    
    let html = '';

    // Add score summary
    if (scoreResults.summary) {
        html += '<div style="margin-bottom: 1.5rem;">';
        scoreResults.summary.forEach(msg => {
            html += `<p style="margin-bottom: 0.5rem; color: var(--text-secondary);">${msg}</p>`;
        });
        html += '</div>';
    }

    // Add PageSpeed recommendations
    if (performanceResults.recommendations && performanceResults.recommendations.length > 0) {
        performanceResults.recommendations.forEach(rec => {
            html += `
                <div class="recommendation">
                    <div class="recommendation-title">
                        ${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                        ${rec.title}
                    </div>
                    <div class="recommendation-description">
                        ${rec.description}
                        <br><br>
                        <strong>Impact:</strong> ${rec.impact}
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
