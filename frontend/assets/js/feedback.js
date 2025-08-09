// Feedback page state
let gameResults = {};
let currentGame = '';

// Initialize feedback page
document.addEventListener('DOMContentLoaded', function() {
    // Load results from session storage
    let resultsData = sessionStorage.getItem('gameResults');
    currentGame = sessionStorage.getItem('currentGame');
    
    // Check for Triple Step specific results
    if (currentGame === 'triple-step') {
        resultsData = sessionStorage.getItem('tripleStepResults');
    }
    
    if (!resultsData || !currentGame) {
        window.location.href = 'index.html';
        return;
    }
    
    gameResults = JSON.parse(resultsData);
    
    // Create feedback screen
    createFeedbackScreen();
});

function createFeedbackScreen() {
    let feedbackHTML = '';
    
    if (currentGame === 'triple-step') {
        feedbackHTML = createTripleStepFeedback();
    } else {
        // Calculate results for other games
        const currentTimer = parseInt(sessionStorage.getItem('currentTimer')) || 30;
        const averageTime = Math.round((currentTimer * gameResults.completed) / gameResults.total);
        const stuckPrompts = gameResults.total - gameResults.completed;
        
        feedbackHTML = `
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
    }
    
    document.querySelector('.container').innerHTML = feedbackHTML;
}

function createTripleStepFeedback() {
    const { topic, totalWords, integratedWords, missedWords, successRate, transcription, totalTime, actualTime, completedEarly, evaluation } = gameResults;
    
    let feedbackHTML = `
        <div class="feedback-screen">
            <div class="feedback-header">
                <h1 class="feedback-title">Triple Step Complete!</h1>
                <p class="feedback-subtitle">Topic: "${topic}"</p>
            </div>
            
            <div class="results-summary">
                <div class="result-item">
                    <span class="result-label">Words Integrated</span>
                    <span class="result-value">${integratedWords.length} / ${totalWords}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Success Rate</span>
                    <span class="result-value">${successRate}%</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Words Missed</span>
                    <span class="result-value">${missedWords.length}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Time Spent</span>
                    <span class="result-value">${formatTime(actualTime || totalTime)}</span>
                </div>
                ${completedEarly ? `
                <div class="result-item">
                    <span class="result-label">Completion Status</span>
                    <span class="result-value warning">Ended Early</span>
                </div>
                ` : ''}
            </div>
            
            <div class="word-analysis">
                <h3>Word Integration Analysis</h3>
                <div class="word-lists">
                    <div class="integrated-words">
                        <h4>✅ Successfully Integrated (${integratedWords.length})</h4>
                        <div class="word-tags">
                            ${integratedWords.map(word => `<span class="word-tag integrated">${word}</span>`).join('')}
                        </div>
                    </div>
                    ${missedWords.length > 0 ? `
                    <div class="missed-words">
                        <h4>❌ Missed Words (${missedWords.length})</h4>
                        <div class="word-tags">
                            ${missedWords.map(word => `<span class="word-tag missed">${word}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${transcription ? `
            <div class="transcription-review">
                <h3>Your Speech</h3>
                <div class="transcription-text">
                    <p>${transcription}</p>
                </div>
            </div>
            ` : ''}
            
            ${evaluation ? `
            <div class="ai-evaluation">
                <h3>AI Speech Analysis</h3>
                
                <div class="evaluation-criteria">
                    <div class="criterion">
                        <h4>🎯 Word Integration Success (${evaluation.primary.score}/10)</h4>
                        <p>${evaluation.primary.feedback}</p>
                        <div class="criterion-stats">
                            <span>Words Integrated: ${evaluation.primary.wordsIntegrated}</span>
                            <span>Words Missed: ${evaluation.primary.wordsMissed}</span>
                        </div>
                    </div>
                    
                    <div class="criterion">
                        <h4>🔄 Integration Smoothness (${evaluation.secondary.score}/10)</h4>
                        <p>${evaluation.secondary.feedback}</p>
                        ${evaluation.secondary.smoothIntegrations.length > 0 ? `
                        <div class="smooth-words">
                            <strong>Smooth Integrations:</strong> ${evaluation.secondary.smoothIntegrations.join(', ')}
                        </div>
                        ` : ''}
                        ${evaluation.secondary.awkwardIntegrations.length > 0 ? `
                        <div class="awkward-words">
                            <strong>Awkward Integrations:</strong> ${evaluation.secondary.awkwardIntegrations.join(', ')}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="criterion">
                        <h4>🎭 Topic Coherence (${evaluation.tertiary.score}/10)</h4>
                        <p>${evaluation.tertiary.feedback}</p>
                        <div class="coherence-level">
                            <strong>Coherence Level:</strong> ${evaluation.tertiary.coherenceLevel}
                        </div>
                    </div>
                    
                    <div class="criterion">
                        <h4>⚡ Recovery & Adaptability (${evaluation.recovery.score}/10)</h4>
                        <p>${evaluation.recovery.feedback}</p>
                        ${evaluation.recovery.recoveryStrategies.length > 0 ? `
                        <div class="recovery-strategies">
                            <strong>Recovery Strategies Used:</strong>
                            <ul>
                                ${evaluation.recovery.recoveryStrategies.map(strategy => `<li>${strategy}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="overall-assessment">
                    <h4>Overall Performance (${evaluation.overall.score}/10)</h4>
                    <p>${evaluation.overall.feedback}</p>
                    
                    <div class="strengths-weaknesses">
                        <div class="strengths">
                            <h5>Key Strengths:</h5>
                            <ul>
                                ${evaluation.overall.strengths.map(strength => `<li>${strength}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="improvements">
                            <h5>Areas for Improvement:</h5>
                            <ul>
                                ${evaluation.overall.areasForImprovement.map(area => `<li>${area}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                ${evaluation.wordVerification ? `
                <div class="word-verification">
                    <h4>Word Verification</h4>
                    <div class="verification-summary">
                        <div><strong>Detected Integrated:</strong> ${(evaluation.wordVerification.integratedWordsDetected || []).join(', ') || 'None'}</div>
                        <div><strong>Likely Missed:</strong> ${(evaluation.wordVerification.missedWordsDetected || []).join(', ') || 'None'}</div>
                    </div>
                    <div class="per-word-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Word</th>
                                    <th>In Transcript</th>
                                    <th>Likely In Audio</th>
                                    <th>Confidence</th>
                                    <th>Example</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(evaluation.wordVerification.perWord || []).map(w => `
                                    <tr>
                                        <td>${w.word}</td>
                                        <td>${w.presentInTranscript ? 'Yes' : 'No'}</td>
                                        <td>${w.presentInAudioLikely ? 'Yes' : 'No'}</td>
                                        <td>${Math.round((w.matchConfidence || 0) * 100)}%</td>
                                        <td>${w.exampleSentence ? w.exampleSentence : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}
            </div>
            ` : `
            <div class="performance-tips">
                <h3>Performance Tips</h3>
                <ul>
                    ${successRate >= 80 ? '<li>🎯 Excellent! You maintained strong focus on your topic while integrating distractions.</li>' : ''}
                    ${successRate >= 60 && successRate < 80 ? '<li>👍 Good work! Try to be more flexible with word integration.</li>' : ''}
                    ${successRate < 60 ? '<li>💡 Practice integrating words more naturally into your speech flow.</li>' : ''}
                    <li>🎭 Keep your main message as the throughline, even with distractions.</li>
                    <li>⚡ Stay confident and keep speaking, even if you miss a word.</li>
                    <li>🔄 Practice with different topics to improve adaptability.</li>
                </ul>
            </div>
            `}
            
            <div class="feedback-buttons">
                <button class="try-again-btn" onclick="restartGame()">Try Again</button>
                <button class="next-game-btn" onclick="goHome()">Next Game</button>
            </div>
        </div>
    `;
    
    return feedbackHTML;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function restartGame() {
    // Clear session storage
    sessionStorage.removeItem('gameResults');
    sessionStorage.removeItem('tripleStepResults');
    
    // Navigate back to setup page
    if (currentGame === 'triple-step') {
        window.location.href = 'setup.html?game=triple-step';
    } else {
        window.location.href = `setup.html?game=${currentGame}`;
    }
}

function goHome() {
    // Clear all session storage
    sessionStorage.clear();
    
    // Navigate to home page
    window.location.href = 'index.html';
}
