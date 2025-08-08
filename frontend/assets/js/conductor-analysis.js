// Conductor Analysis page state
let sessionId = null;
let gameType = '';
let sessionData = null;
let pollInterval = null;

// Initialize conductor analysis page
document.addEventListener('DOMContentLoaded', function() {
    // Get session data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId');
    gameType = urlParams.get('gameType');
    
    if (!sessionId || gameType !== 'conductor') {
        console.error('Invalid session parameters');
        window.location.href = 'index.html';
        return;
    }
    
    console.log(`[ConductorAnalysis] Loading analysis for session: ${sessionId}`);
    
    // Create analysis screen
    createConductorAnalysisScreen();
    
    // Start polling for session status
    startPolling();
});

function createConductorAnalysisScreen() {
    const analysisHTML = `
        <div class="analysis-screen">
            <div class="analysis-header">
                <h2>Conductor Analysis</h2>
                <p class="analysis-subtitle">Analyzing your energy modulation performance...</p>
            </div>
            
            <div class="loading-state" id="loading-state">
                <div class="loading-spinner"></div>
                <p class="loading-text">Processing your evaluation...</p>
                <p class="processing-status" id="processing-status">Checking status...</p>
            </div>
            
            <div class="summary-section" id="summary-section" style="display: none;">
                <h3>Performance Summary</h3>
                <div class="summary-grid" id="summary-grid">
                    <!-- Summary items will be populated here -->
                </div>
            </div>
            
            <div class="session-details" id="session-details" style="display: none;">
                <h3>Session Details</h3>
                <div class="details-grid" id="details-grid">
                    <!-- Session details will be populated here -->
                </div>
            </div>
            
            <div class="evaluation-section" id="evaluation-section" style="display: none;">
                <h3>Detailed Evaluation</h3>
                <div class="evaluation-grid" id="evaluation-grid">
                    <!-- Evaluation details will be populated here -->
                </div>
            </div>
            
            <div class="action-buttons" id="action-buttons" style="display: none;">
                <button class="action-btn play-again-btn" onclick="playAgain()">Play Again</button>
                <button class="action-btn home-btn" onclick="goHome()">Back to Home</button>
            </div>
        </div>
    `;
    
    document.querySelector('.container').innerHTML = analysisHTML;
}

function startPolling() {
    // Poll immediately
    checkSessionStatus();
    
    // Then poll every 2 seconds
    pollInterval = setInterval(checkSessionStatus, 2000);
}

async function checkSessionStatus() {
    try {
        const response = await fetch(`/api/v1/games/conductor/session/${sessionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to get session status');
        }
        
        const data = await response.json();
        sessionData = data;
        
        console.log('[ConductorAnalysis] Session status:', data);
        
        updateProcessingStatus(data);
        
        if (data.status === 'evaluated' && data.evaluation) {
            console.log('[ConductorAnalysis] Session evaluated, showing results');
            clearInterval(pollInterval);
            showResults(data);
        } else if (data.status === 'error') {
            console.error('[ConductorAnalysis] Session error');
            clearInterval(pollInterval);
            showError('Session evaluation failed. Please try again.');
        }
        
    } catch (error) {
        console.error('[ConductorAnalysis] Error checking session status:', error);
        updateProcessingStatus({ status: 'error', queueLength: 0, isProcessing: false });
    }
}

function updateProcessingStatus(data) {
    const processingStatus = document.getElementById('processing-status');
    
    if (data.status === 'error') {
        processingStatus.textContent = 'Error loading results. Please try again.';
        return;
    }
    
    if (data.status === 'evaluated') {
        processingStatus.textContent = 'Analysis complete!';
        return;
    }
    
    if (data.status === 'completed') {
        processingStatus.textContent = 'Processing evaluation...';
        return;
    }
    
    if (data.status === 'recording') {
        processingStatus.textContent = 'Session completed, waiting for evaluation...';
        return;
    }
    
    processingStatus.textContent = 'Processing...';
}

function showResults(data) {
    // Hide loading state
    document.getElementById('loading-state').style.display = 'none';
    
    // Show all sections
    document.getElementById('summary-section').style.display = 'block';
    document.getElementById('session-details').style.display = 'block';
    document.getElementById('evaluation-section').style.display = 'block';
    document.getElementById('action-buttons').style.display = 'flex';
    
    // Populate all sections
    populateSummary(data);
    populateSessionDetails(data);
    populateEvaluationDetails(data);
}

function showError(message) {
    // Hide loading state
    document.getElementById('loading-state').style.display = 'none';
    
    // Show error message
    const errorHTML = `
        <div class="error-state">
            <h3>Error</h3>
            <p>${message}</p>
            <button class="action-btn home-btn" onclick="goHome()">Back to Home</button>
        </div>
    `;
    
    document.querySelector('.container').innerHTML = errorHTML;
}

function populateSummary(data) {
    const summaryGrid = document.getElementById('summary-grid');
    const evaluation = data.evaluation;
    
    if (!evaluation) {
        summaryGrid.innerHTML = '<p>No evaluation data available</p>';
        return;
    }
    
    const summaryHTML = `
        <div class="summary-item">
            <div class="summary-value">${evaluation.overallPerformance.score}/10</div>
            <div class="summary-label">Overall Score</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.responseSpeed.score}/10</div>
            <div class="summary-label">Response Speed</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.energyRange.score}/10</div>
            <div class="summary-label">Energy Range</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.contentContinuity.score}/10</div>
            <div class="summary-label">Content Continuity</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.breathRecovery.score}/10</div>
            <div class="summary-label">Breath Recovery</div>
        </div>
    `;
    
    summaryGrid.innerHTML = summaryHTML;
}

function populateSessionDetails(data) {
    const detailsGrid = document.getElementById('details-grid');
    
    const actualDuration = data.actualDuration ? Math.round(data.actualDuration / 1000) : 0;
    const minutes = Math.floor(actualDuration / 60);
    const seconds = actualDuration % 60;
    const durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const detailsHTML = `
        <div class="detail-item">
            <span class="detail-label">Topic:</span>
            <span class="detail-value">${data.topic || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${durationDisplay}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Energy Changes:</span>
            <span class="detail-value">${data.energyChanges ? data.energyChanges.length : 0}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Breath Moments:</span>
            <span class="detail-value">${data.breathMoments ? data.breathMoments.length : 0}</span>
        </div>
    `;
    
    detailsGrid.innerHTML = detailsHTML;
}

function populateEvaluationDetails(data) {
    const evaluationGrid = document.getElementById('evaluation-grid');
    const evaluation = data.evaluation;
    
    if (!evaluation) {
        evaluationGrid.innerHTML = '<p>No evaluation data available</p>';
        return;
    }
    
    const evaluationHTML = `
        <div class="evaluation-item">
            <h4>Response Speed to Energy Changes</h4>
            <div class="score-display">
                <span class="score">${evaluation.responseSpeed.score}/10</span>
            </div>
            <p class="feedback">${evaluation.responseSpeed.feedback}</p>
        </div>
        
        <div class="evaluation-item">
            <h4>Actual Energy Range Demonstrated</h4>
            <div class="score-display">
                <span class="score">${evaluation.energyRange.score}/10</span>
            </div>
            <p class="feedback">${evaluation.energyRange.feedback}</p>
        </div>
        
        <div class="evaluation-item">
            <h4>Content Continuity</h4>
            <div class="score-display">
                <span class="score">${evaluation.contentContinuity.score}/10</span>
            </div>
            <p class="feedback">${evaluation.contentContinuity.feedback}</p>
        </div>
        
        <div class="evaluation-item">
            <h4>Breath Recovery</h4>
            <div class="score-display">
                <span class="score">${evaluation.breathRecovery.score}/10</span>
            </div>
            <p class="feedback">${evaluation.breathRecovery.feedback}</p>
        </div>
        
        <div class="evaluation-item overall">
            <h4>Overall Performance</h4>
            <div class="score-display">
                <span class="score">${evaluation.overallPerformance.score}/10</span>
            </div>
            <p class="feedback">${evaluation.overallPerformance.summary}</p>
        </div>
    `;
    
    evaluationGrid.innerHTML = evaluationHTML;
}

function playAgain() {
    // Navigate to conductor game
    window.location.href = 'conductor.html';
}

function goHome() {
    // Navigate to home page
    window.location.href = 'index.html';
}
