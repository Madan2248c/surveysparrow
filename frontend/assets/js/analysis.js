// Analysis page state
let sessionId = null;
let currentGame = '';
let totalPrompts = 0;
let difficulty = '';
let sessionData = null;
let pollInterval = null;

// Initialize analysis page
document.addEventListener('DOMContentLoaded', function() {
    // Get session data from storage
    sessionId = sessionStorage.getItem('sessionId');
    currentGame = sessionStorage.getItem('currentGame');
    totalPrompts = parseInt(sessionStorage.getItem('totalPrompts')) || 0;
    difficulty = sessionStorage.getItem('difficulty') || 'medium';
    
    if (!sessionId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Create analysis screen
    createAnalysisScreen();
    
    // Start polling for session status
    startPolling();
});

function createAnalysisScreen() {
    const analysisHTML = `
        <div class="analysis-screen">
            <div class="analysis-header">
                <h2>Game Analysis</h2>
                <p class="analysis-subtitle">Analyzing your rapid-fire performance...</p>
            </div>
            
            <div class="loading-state" id="loading-state">
                <div class="loading-spinner"></div>
                <p class="loading-text">Processing your evaluations...</p>
                <p class="processing-status" id="processing-status">Checking status...</p>
            </div>
            
            <div class="summary-section" id="summary-section" style="display: none;">
                <h3>Performance Summary</h3>
                <div class="summary-grid" id="summary-grid">
                    <!-- Summary items will be populated here -->
                </div>
            </div>
            
            <div class="prompts-section" id="prompts-section" style="display: none;">
                <h3>Individual Prompts</h3>
                <div class="prompts-grid" id="prompts-grid">
                    <!-- Prompt cards will be populated here -->
                </div>
            </div>
            
            <div class="action-buttons" id="action-buttons" style="display: none;">
                <button class="action-btn play-again-btn" onclick="playAgain()">Try Again</button>
                <button class="action-btn home-btn" onclick="goHome()">Next Game</button>
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
        const response = await fetch(`/api/v1/games/rapid-fire/session/${sessionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to get session status');
        }
        
        const data = await response.json();
        sessionData = data;
        
        console.log('Session status:', data);
        
        updateProcessingStatus(data);
        
        if (data.status === 'completed') {
            console.log('Session completed, showing results');
            clearInterval(pollInterval);
            showResults(data);
        }
        
    } catch (error) {
        console.error('Error checking session status:', error);
        updateProcessingStatus({ status: 'error', queueLength: 0, isProcessing: false });
    }
}

function updateProcessingStatus(data) {
    const processingStatus = document.getElementById('processing-status');
    
    if (data.status === 'error') {
        processingStatus.textContent = 'Error loading results. Please try again.';
        return;
    }
    
    if (data.status === 'completed') {
        processingStatus.textContent = 'Analysis complete!';
        return;
    }
    
    let statusText = `Completed: ${data.completed}/${data.totalPrompts} evaluations`;
    
    if (data.queueLength > 0) {
        statusText += ` | Queue: ${data.queueLength} pending`;
    }
    
    if (data.isProcessing) {
        statusText += ' | Processing...';
    }
    
    processingStatus.textContent = statusText;
}

function showResults(data) {
    // Hide loading state
    document.getElementById('loading-state').style.display = 'none';
    
    // Show summary and prompts sections
    document.getElementById('summary-section').style.display = 'block';
    document.getElementById('prompts-section').style.display = 'block';
    document.getElementById('action-buttons').style.display = 'flex';
    
    // Populate summary
    populateSummary(data);
    
    // Populate prompts grid
    populatePromptsGrid(data);
}

function populateSummary(data) {
    const summaryGrid = document.getElementById('summary-grid');
    
    // Calculate summary statistics
    const evaluations = data.evaluations.filter(eval => eval !== null);
    const responseTimes = data.responseTimes.filter(time => time !== null);
    
    // Calculate scores
    const totalScore = evaluations.reduce((sum, eval) => {
        return sum + eval.evaluation.responseRate.score + 
               eval.evaluation.pace.score + 
               eval.evaluation.energy.score;
    }, 0);
    
    const averageScore = evaluations.length > 0 ? (totalScore / (evaluations.length * 3)).toFixed(1) : 0;
    const responseRateAvg = evaluations.length > 0 ? 
        (evaluations.reduce((sum, eval) => sum + eval.evaluation.responseRate.score, 0) / evaluations.length).toFixed(1) : 0;
    
    // Calculate response rate percentage (convert from 0-10 scale to 0-100%)
    const responseRatePercentage = Math.round((responseRateAvg / 10) * 100);
    
    // Calculate average response time
    const avgResponseTime = responseTimes.length > 0 ? 
        (responseTimes.reduce((sum, time) => sum + time.responseTime, 0) / responseTimes.length).toFixed(1) : 0;
    
    // Find stuck prompt (no speech detected - score = 0)
    const stuckPrompt = evaluations.find(eval => 
        eval.evaluation.responseRate.score === 0 && 
        eval.evaluation.pace.score === 0 && 
        eval.evaluation.energy.score === 0
    );
    
    // Find best and worst moments
    let bestMoment = null;
    let worstMoment = null;
    let bestScore = -1;
    let worstScore = 11;
    
    evaluations.forEach((eval, index) => {
        const avgScore = (eval.evaluation.responseRate.score + 
                         eval.evaluation.pace.score + 
                         eval.evaluation.energy.score) / 3;
        
        if (avgScore > bestScore) {
            bestScore = avgScore;
            bestMoment = { index, eval, score: avgScore };
        }
        
        if (avgScore < worstScore) {
            worstScore = avgScore;
            worstMoment = { index, eval, score: avgScore };
        }
    });
    
    const summaryHTML = `
        <div class="summary-content">
            <div class="performance-summary">
                <div class="completion-header">
                    <h3>You completed ${data.completed}/${data.totalPrompts} prompts!</h3>
                </div>
                <h4>Performance Summary</h4>
                <div class="summary-breakdown">
                    <div class="breakdown-item">
                        <div class="breakdown-label">Response Rate</div>
                        <div class="breakdown-value">${responseRatePercentage}%</div>
                    </div>
                    <div class="breakdown-item">
                        <div class="breakdown-label">Average Response Time</div>
                        <div class="breakdown-value">${avgResponseTime}s</div>
                    </div>
                    ${stuckPrompt ? `
                        <div class="breakdown-item stuck">
                            <div class="breakdown-label">Stuck on</div>
                            <div class="breakdown-value">"${stuckPrompt.prompt}"</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="audio-playback-section">
                <h4>Audio Playback</h4>
                <div class="audio-controls">
                    ${bestMoment ? `
                        <div class="audio-item">
                            <div class="audio-label">Best Moment (${bestMoment.score.toFixed(1)}/10)</div>
                            <div class="audio-prompt">"${bestMoment.eval.prompt}"</div>
                            <audio controls>
                                <source src="/api/v1/audio/${data.sessionId}/${bestMoment.index + 1}" type="audio/wav">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    ` : ''}
                    ${worstMoment ? `
                        <div class="audio-item">
                            <div class="audio-label">Worst Moment (${worstMoment.score.toFixed(1)}/10)</div>
                            <div class="audio-prompt">"${worstMoment.eval.prompt}"</div>
                            <audio controls>
                                <source src="/api/v1/audio/${data.sessionId}/${worstMoment.index + 1}" type="audio/wav">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    summaryGrid.innerHTML = summaryHTML;
}

function populatePromptsGrid(data) {
    const promptsGrid = document.getElementById('prompts-grid');
    
    const promptsHTML = data.evaluations.map((evaluation, index) => {
        const promptNumber = index + 1;
        
        if (evaluation === null) {
            return `
                <div class="prompt-card processing">
                    <div class="prompt-number">${promptNumber}</div>
                    <div class="prompt-text">Processing...</div>
                    <div class="prompt-status processing">Processing</div>
                </div>
            `;
        }
        
        const avgScore = ((evaluation.evaluation.responseRate.score + 
                          evaluation.evaluation.pace.score + 
                          evaluation.evaluation.energy.score) / 3).toFixed(1);
        
        return `
            <div class="prompt-card completed" onclick="showEvaluationModal(${index})">
                <div class="prompt-number">${promptNumber}</div>
                <div class="prompt-text">${evaluation.prompt}</div>
                <div class="prompt-status completed">Score: ${avgScore}/10</div>
            </div>
        `;
    }).join('');
    
    promptsGrid.innerHTML = promptsHTML;
}

function showEvaluationModal(promptIndex) {
    const evaluation = sessionData.evaluations[promptIndex];
    
    if (!evaluation) {
        return;
    }
    
    const modalHTML = `
        <div class="evaluation-modal" id="evaluation-modal">
            <div class="evaluation-modal-content">
                <h3>Prompt ${promptIndex + 1} Analysis</h3>
                <button class="close-btn" onclick="closeEvaluationModal()">×</button>
                
                <div class="prompt-context">
                    <p class="prompt-label">Prompt:</p>
                    <p class="prompt-text-modal">"${evaluation.prompt}"</p>
                </div>
                
                <div class="evaluation-scores">
                    <div class="score-item">
                        <span class="score-label">Response Rate</span>
                        <span class="score-value">${evaluation.evaluation.responseRate.score}/10</span>
                        <p class="score-feedback">${evaluation.evaluation.responseRate.feedback}</p>
                    </div>
                    <div class="score-item">
                        <span class="score-label">Pace & Flow</span>
                        <span class="score-value">${evaluation.evaluation.pace.score}/10</span>
                        <p class="score-feedback">${evaluation.evaluation.pace.feedback}</p>
                    </div>
                    <div class="score-item">
                        <span class="score-label">Energy & Confidence</span>
                        <span class="score-value">${evaluation.evaluation.energy.score}/10</span>
                        <p class="score-feedback">${evaluation.evaluation.energy.feedback}</p>
                    </div>
                </div>
                
                <button class="close-modal-btn" onclick="closeEvaluationModal()">Close</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add click outside to close functionality
    const modal = document.getElementById('evaluation-modal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeEvaluationModal();
        }
    });
    
    // Add keyboard support (Escape key to close)
    const handleEscape = function(e) {
        if (e.key === 'Escape') {
            closeEvaluationModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function closeEvaluationModal() {
    const modal = document.getElementById('evaluation-modal');
    if (modal) {
        modal.remove();
    }
}

function playAgain() {
    // Clear session data
    sessionStorage.removeItem('sessionId');
    
    // Navigate to setup page
    window.location.href = 'setup.html?game=rapid-fire';
}

function goHome() {
    // Clear session data
    sessionStorage.removeItem('sessionId');
    
    // Navigate to home page
    window.location.href = 'index.html';
}
