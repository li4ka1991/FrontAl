/**
 * Scoring Module
 * Calculates overall performance score based on analysis results
 */

function calculateScore(sizeResults, duplicationResults, performanceResults) {
    let score = 100;
    const details = {
        sizeScore: 100,
        duplicationScore: 100,
        performanceScore: 100,
        deductions: []
    };

    // Size-based scoring (max -30 points)
    const totalSize = sizeResults.totalSize;
    
    if (totalSize > 1024 * 1024) { // > 1MB
        details.sizeScore -= 30;
        details.deductions.push({ reason: 'Bundle size > 1MB', points: 30 });
    } else if (totalSize > 500 * 1024) { // > 500KB
        details.sizeScore -= 20;
        details.deductions.push({ reason: 'Bundle size > 500KB', points: 20 });
    } else if (totalSize > 250 * 1024) { // > 250KB
        details.sizeScore -= 10;
        details.deductions.push({ reason: 'Bundle size > 250KB', points: 10 });
    }

    // Deduct for JS-heavy bundles
    if (sizeResults.percentages.js > 80) {
        details.sizeScore -= 10;
        details.deductions.push({ reason: 'JavaScript > 80% of bundle', points: 10 });
    } else if (sizeResults.percentages.js > 70) {
        details.sizeScore -= 5;
        details.deductions.push({ reason: 'JavaScript > 70% of bundle', points: 5 });
    }

    // Duplication-based scoring (max -25 points)
    const duplicateCount = duplicationResults.duplicates.length;
    
    if (duplicateCount > 20) {
        details.duplicationScore -= 25;
        details.deductions.push({ reason: '20+ duplication issues', points: 25 });
    } else if (duplicateCount > 10) {
        details.duplicationScore -= 15;
        details.deductions.push({ reason: '10+ duplication issues', points: 15 });
    } else if (duplicateCount > 5) {
        details.duplicationScore -= 10;
        details.deductions.push({ reason: '5+ duplication issues', points: 10 });
    } else if (duplicateCount > 0) {
        details.duplicationScore -= 5;
        details.deductions.push({ reason: 'Some duplication detected', points: 5 });
    }

    // Performance-based scoring (max -45 points)
    const errorIssues = performanceResults.issues.filter(i => i.severity === 'error');
    const warningIssues = performanceResults.issues.filter(i => i.severity === 'warning');
    const infoIssues = performanceResults.issues.filter(i => i.severity === 'info');

    // Errors: 5 points each (max 25)
    const errorDeduction = Math.min(errorIssues.length * 5, 25);
    if (errorDeduction > 0) {
        details.performanceScore -= errorDeduction;
        details.deductions.push({ reason: `${errorIssues.length} critical performance issue(s)`, points: errorDeduction });
    }

    // Warnings: 2 points each (max 15)
    const warningDeduction = Math.min(warningIssues.length * 2, 15);
    if (warningDeduction > 0) {
        details.performanceScore -= warningDeduction;
        details.deductions.push({ reason: `${warningIssues.length} performance warning(s)`, points: warningDeduction });
    }

    // Info: 1 point each (max 5)
    const infoDeduction = Math.min(infoIssues.length * 1, 5);
    if (infoDeduction > 0) {
        details.performanceScore -= infoDeduction;
        details.deductions.push({ reason: `${infoIssues.length} performance suggestion(s)`, points: infoDeduction });
    }

    // Calculate final score
    score = Math.max(0, details.sizeScore + details.duplicationScore + details.performanceScore - 200);
    score = Math.round(score);

    const grading = getGradeAndCategory(score);

    return {
        score,
        grade: grading.grade,
        category: grading.category,
        details,
        summary: generateSummary(score, details)
    };
}

function calculateCombinedUrlScore(staticScoreResults, lighthouseScoreResults) {
    const staticScore = Number.isFinite(staticScoreResults && staticScoreResults.score)
        ? Math.max(0, Math.min(100, Math.round(staticScoreResults.score)))
        : null;
    const lighthouseScore = Number.isFinite(lighthouseScoreResults && lighthouseScoreResults.score)
        ? Math.max(0, Math.min(100, Math.round(lighthouseScoreResults.score)))
        : null;

    let staticWeight = 0;
    let lighthouseWeight = 0;

    if (staticScore !== null && lighthouseScore !== null) {
        staticWeight = 0.5;
        lighthouseWeight = 0.5;
    } else if (staticScore !== null) {
        staticWeight = 1;
    } else if (lighthouseScore !== null) {
        lighthouseWeight = 1;
    }

    const combinedScore = Math.round((staticScore || 0) * staticWeight + (lighthouseScore || 0) * lighthouseWeight);

    const baseDetails = staticScoreResults && staticScoreResults.details
        ? {
            sizeScore: staticScoreResults.details.sizeScore,
            duplicationScore: staticScoreResults.details.duplicationScore,
            performanceScore: staticScoreResults.details.performanceScore,
            deductions: Array.isArray(staticScoreResults.details.deductions) ? staticScoreResults.details.deductions.slice() : []
        }
        : {
            sizeScore: 100,
            duplicationScore: 100,
            performanceScore: 100,
            deductions: []
        };

    if (staticScore !== null && lighthouseScore !== null) {
        const targetPerformanceScore = Math.max(0, Math.min(100, baseDetails.performanceScore + (combinedScore - staticScore)));
        baseDetails.performanceScore = Math.round(targetPerformanceScore);

        if (lighthouseScore < 90) {
            baseDetails.deductions.push({
                reason: 'Lighthouse performance score impact',
                points: Math.max(1, Math.round((100 - lighthouseScore) * 0.1))
            });
        }
    } else if (staticScore === null && lighthouseScore !== null) {
        baseDetails.performanceScore = lighthouseScore;
        if (lighthouseScore < 90) {
            baseDetails.deductions.push({
                reason: 'Lighthouse score below optimal range',
                points: Math.max(1, Math.round((100 - lighthouseScore) * 0.1))
            });
        }
    }

    const grading = getGradeAndCategory(combinedScore);

    return {
        score: combinedScore,
        grade: grading.grade,
        category: grading.category,
        details: baseDetails,
        summary: generateSummary(combinedScore, baseDetails),
        mode: 'combined',
        sourceScores: {
            staticScore,
            lighthouseScore,
            staticWeight,
            lighthouseWeight
        }
    };
}

function getGradeAndCategory(score) {
    if (score >= 90) {
        return { grade: 'A', category: 'good' };
    }
    if (score >= 75) {
        return { grade: 'B', category: 'good' };
    }
    if (score >= 60) {
        return { grade: 'C', category: 'warning' };
    }
    if (score >= 40) {
        return { grade: 'D', category: 'warning' };
    }
    return { grade: 'F', category: 'danger' };
}

function generateSummary(score, details) {
    const messages = [];

    if (score >= 90) {
        messages.push('Excellent! Your code follows performance best practices.');
    } else if (score >= 75) {
        messages.push('Good job! Minor optimizations could improve performance.');
    } else if (score >= 60) {
        messages.push('Decent, but there\'s room for improvement.');
    } else if (score >= 40) {
        messages.push('Several performance issues detected. Review recommendations.');
    } else {
        messages.push('Significant performance problems found. Immediate action recommended.');
    }

    // Add specific advice
    if (details.sizeScore < 80) {
        messages.push('Focus on reducing bundle size through code splitting and minification.');
    }
    if (details.duplicationScore < 80) {
        messages.push('Eliminate duplicate code to improve maintainability and reduce size.');
    }
    if (details.performanceScore < 80) {
        messages.push('Address critical performance anti-patterns identified in the analysis.');
    }

    return messages;
}
