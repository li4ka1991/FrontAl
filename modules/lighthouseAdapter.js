/**
 * This file was generated with the help of Backend NodeJS Expert AI assistant. 
 */

(() => {
    function getScoreCategory(score) {
        if (score >= 90) return 'good';
        if (score >= 70) return 'warning';
        return 'danger';
    }

    function stripMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1');
    }

    function formatMs(value) {
        if (typeof value !== 'number') return '--';
        return `${Math.round(value)} ms`;
    }

    function formatBytes(value) {
        if (typeof value !== 'number') return '--';
        if (value < 1024) return `${Math.round(value)} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    function buildMetric(audits, id, label, thresholds, fallbackId) {
        const audit = audits[id] || (fallbackId ? audits[fallbackId] : null);
        if (!audit) return null;

        const numericValue = typeof audit.numericValue === 'number' ? audit.numericValue : null;
        const displayValue = audit.displayValue || (numericValue !== null ? formatMs(numericValue) : '--');
        const rating = getRating(numericValue, thresholds);

        return {
            id,
            label,
            value: displayValue,
            rating
        };
    }

    function getRating(value, thresholds) {
        if (typeof value !== 'number') return 'warning';
        if (value <= thresholds.good) return 'good';
        if (value <= thresholds.warn) return 'warning';
        return 'danger';
    }

    function buildIssues(audits) {
        const auditList = Object.values(audits)
            .filter(audit => audit && audit.scoreDisplayMode === 'numeric' && typeof audit.score === 'number')
            .filter(audit => audit.score < 0.9)
            .sort((a, b) => a.score - b.score)
            .slice(0, 8);

        return auditList.map(audit => {
            const severity = audit.score < 0.5 ? 'error' : audit.score < 0.9 ? 'warning' : 'info';
            const description = stripMarkdown(audit.description || '');
            return {
                severity,
                title: audit.title,
                description: `${description}${audit.displayValue ? ` (${audit.displayValue})` : ''}`.trim(),
                suggestion: 'Review this audit in Lighthouse for detailed guidance.'
            };
        });
    }

    function buildRecommendations(audits) {
        const opportunities = Object.values(audits)
            .filter(audit => audit && audit.details && audit.details.type === 'opportunity')
            .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
            .slice(0, 8);

        return opportunities.map(audit => {
            const savingsMs = audit.details.overallSavingsMs || 0;
            const savingsBytes = audit.details.overallSavingsBytes || 0;
            const priority = savingsMs > 1200 ? 'high' : savingsMs > 300 ? 'medium' : 'low';

            const impactParts = [];
            if (savingsMs) {
                impactParts.push(`Estimated savings: ${formatMs(savingsMs)}`);
            }
            if (savingsBytes) {
                impactParts.push(`Transfer savings: ${formatBytes(savingsBytes)}`);
            }

            return {
                priority,
                title: audit.title,
                description: stripMarkdown(audit.description || ''),
                impact: impactParts.join(' | ') || 'Review this opportunity in Lighthouse.'
            };
        });
    }

    function buildCategoryScores(categories) {
        return Object.keys(categories).map(key => {
            const category = categories[key];
            const score = typeof category.score === 'number' ? Math.round(category.score * 100) : 0;
            return {
                id: key,
                title: category.title,
                score,
                status: getScoreCategory(score)
            };
        });
    }

    function adaptLighthouseResults(rawData) {
        const lhr = rawData && (rawData.lighthouse || rawData.lhr || rawData);
        if (!lhr || !lhr.categories || !lhr.audits) {
            throw new Error('Invalid Lighthouse data.');
        }

        const categoryScores = buildCategoryScores(lhr.categories);
        const performanceScore = categoryScores.find(item => item.id === 'performance');

        const scoreResults = {
            score: performanceScore ? performanceScore.score : 0,
            category: getScoreCategory(performanceScore ? performanceScore.score : 0),
            summary: [
                'Lighthouse audit complete. Review category scores and top opportunities.',
                'Focus on the lowest-scoring category to prioritize improvements.'
            ],
            mode: 'lighthouse'
        };

        const audits = lhr.audits;
        const performanceResults = {
            issues: buildIssues(audits),
            recommendations: buildRecommendations(audits),
            mode: 'lighthouse'
        };

        const coreVitals = [
            buildMetric(audits, 'first-contentful-paint', 'First Contentful Paint', { good: 1800, warn: 3000 }),
            buildMetric(audits, 'largest-contentful-paint', 'Largest Contentful Paint', { good: 2500, warn: 4000 }),
            buildMetric(audits, 'total-blocking-time', 'Total Blocking Time', { good: 200, warn: 600 }),
            buildMetric(audits, 'cumulative-layout-shift', 'Cumulative Layout Shift', { good: 0.1, warn: 0.25 }),
            buildMetric(audits, 'speed-index', 'Speed Index', { good: 3400, warn: 5800 }),
            buildMetric(audits, 'interactive', 'Time to Interactive', { good: 3800, warn: 7300 }),
            buildMetric(audits, 'interaction-to-next-paint', 'Interaction to Next Paint', { good: 200, warn: 500 }, 'first-input-delay')
        ].filter(Boolean);

        const lighthouseResults = {
            categoryScores,
            coreVitals
        };

        return {
            performanceResults,
            scoreResults,
            lighthouseResults
        };
    }

    window.adaptLighthouseResults = adaptLighthouseResults;
})();
