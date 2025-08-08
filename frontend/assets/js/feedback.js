// Feedback page state
let gameResults = {};
let currentGame = '';

// Initialize feedback page
document.addEventListener('DOMContentLoaded', function() {
    // Load results from session storage
    const resultsData = sessionStorage.getItem('gameResults');
    currentGame = sessionStorage.getItem('currentGame');
    
    if (!resultsData || !currentGame) {
        window.location.href = 'index.html';
        return;
    }
    
    gameResults = JSON.parse(resultsData);
    
    // Create feedback screen
    createFeedbackScreen();
});

function createFeedbackScreen() {
    // Calculate results
    const currentTimer = parseInt(sessionStorage.getItem('currentTimer')) || 30;
    const averageTime = Math.round((currentTimer * gameResults.completed) / gameResults.total);
    const stuckPrompts = gameResults.total - gameResults.completed;
    
    let feedbackHTML = `
        <div class="feedback-screen">
            <div class="feedback-header">
                <h1 class="feedback-title">Game Complete!</h1>
            </div>
            
            <div class="results-summary">
                <div class="result-item">
                    <span class="result-label">Completed Prompts</span>
                    <span class="result-value">${gameResults.completed} / ${gameResults.total}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Average Response Time</span>
                    <span class="result-value">${averageTime} seconds</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Skipped Prompts</span>
                    <span class="result-value">${stuckPrompts}</span>
                </div>
            </div>
    `;
    
    // Add evaluation summary for rapid-fire game
    if (currentGame === 'rapid-fire' && gameResults.evaluations.length > 0) {
        const avgResponseRate = Math.round(gameResults.evaluations.reduce((sum, eval) => sum + eval.responseRate.score, 0) / gameResults.evaluations.length);
        const avgPace = Math.round(gameResults.evaluations.reduce((sum, eval) => sum + eval.pace.score, 0) / gameResults.evaluations.length);
        const avgEnergy = Math.round(gameResults.evaluations.reduce((sum, eval) => sum + eval.energy.score, 0) / gameResults.evaluations.length);
        
        feedbackHTML += `
            <div class="evaluation-summary">
                <h3>Speech Performance Summary</h3>
                <div class="evaluation-stats">
                    <div class="eval-stat">
                        <span class="eval-label">Avg Response Rate</span>
                        <span class="eval-score">${avgResponseRate}/10</span>
                    </div>
                    <div class="eval-stat">
                        <span class="eval-label">Avg Pace & Flow</span>
                        <span class="eval-score">${avgPace}/10</span>
                    </div>
                    <div class="eval-stat">
                        <span class="eval-label">Avg Energy & Confidence</span>
                        <span class="eval-score">${avgEnergy}/10</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    feedbackHTML += `
            <div class="feedback-buttons">
                <button class="try-again-btn" onclick="restartGame()">Try Again</button>
                <button class="next-game-btn" onclick="goHome()">Next Game</button>
            </div>
        </div>
    `;
    
    document.querySelector('.container').innerHTML = feedbackHTML;
}

function restartGame() {
    // Clear session storage
    sessionStorage.removeItem('gameResults');
    
    // Navigate back to setup page
    window.location.href = `setup.html?game=${currentGame}`;
}

function goHome() {
    // Clear all session storage
    sessionStorage.clear();
    
    // Navigate to home page
    window.location.href = 'index.html';
}
