// Conductor Analysis page state
let sessionId = null;
let dbSessionId = null;
let gameType = '';
let sessionData = null;
let pollInterval = null;

// Initialize conductor analysis page
document.addEventListener('DOMContentLoaded', function() {
    // Get session data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId');
    dbSessionId = urlParams.get('dbSessionId');
    gameType = urlParams.get('gameType');
    
    if ((!sessionId && !dbSessionId) || gameType !== 'conductor') {
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
            
            <div class="audio-section" id="audio-section" style="display: none;">
                <h3>Audio Playback</h3>
                <div class="audio-player" id="audio-player">
                    <!-- Audio player will be populated here -->
                </div>
            </div>
            
            <div class="energy-chart-section" id="energy-chart-section" style="display: none;">
                <h3>Energy Range Analysis</h3>
                <div class="energy-heatmap" id="energy-heatmap">
                    <!-- Energy heatmap will be populated here -->
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
        let response;
        if (dbSessionId) {
            response = await fetch(`/api/v1/games/conductor/session-db/${dbSessionId}`);
        } else {
            response = await fetch(`/api/v1/games/conductor/session/${sessionId}`);
        }
        
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
    document.getElementById('audio-section').style.display = 'block';
    document.getElementById('energy-chart-section').style.display = 'block';
    document.getElementById('evaluation-section').style.display = 'block';
    document.getElementById('action-buttons').style.display = 'flex';
    
    // Populate all sections
    populateSummary(data);
    populateSessionDetails(data);
    populateAudioPlayer(data);
    populateEnergyHeatmap(data);
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
            <div class="summary-value">${evaluation.overallPerformance?.score || 0}/10</div>
            <div class="summary-label">Overall Score</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.responseSpeed?.score || 0}/10</div>
            <div class="summary-label">Response Speed</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.energyRange?.score || 0}/10</div>
            <div class="summary-label">Energy Range</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.contentContinuity?.score || 0}/10</div>
            <div class="summary-label">Content Continuity</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${evaluation.breathRecovery?.score || 0}/10</div>
            <div class="summary-label">Breath Recovery</div>
        </div>
    `;
    
    summaryGrid.innerHTML = summaryHTML;
}

function populateAudioPlayer(data) {
    const audioPlayer = document.getElementById('audio-player');
    
    if (!data.evaluation || !data.evaluation.energyRange || !data.evaluation.energyRange.voiceAnalysis) {
        audioPlayer.innerHTML = '<p>No voice analysis data available</p>';
        return;
    }
    
    const voiceAnalysis = data.evaluation.energyRange.voiceAnalysis;
    
    const audioHTML = `
        <div class="audio-container">
            <div class="audio-controls">
                <button id="play-pause-btn" class="control-btn">
                    <i class="fas fa-play"></i>
                </button>
                <div class="time-display">
                    <span id="current-time">0:00</span>
                    <span>/</span>
                    <span id="total-time">0:00</span>
                </div>
                <div class="volume-control">
                    <i class="fas fa-volume-up"></i>
                    <input type="range" id="volume-slider" min="0" max="100" value="100">
                </div>
            </div>
            <div class="audio-timeline">
                <div class="timeline-container">
                    <div class="timeline-bar">
                        <div class="timeline-fill" id="timeline-fill"></div>
                        <div class="timeline-handle" id="timeline-handle"></div>
                    </div>
                    <div class="energy-markers" id="energy-markers">
                        <!-- Voice analysis markers will be added here -->
                    </div>
                </div>
            </div>
            <audio id="session-audio" preload="metadata">
                <source src="/api/v1/games/conductor/audio/${sessionId}" type="audio/webm">
                Your browser does not support the audio element.
            </audio>
        </div>
    `;
    
    audioPlayer.innerHTML = audioHTML;
    
    // Initialize custom audio player
    const audio = document.getElementById('session-audio');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const timelineFill = document.getElementById('timeline-fill');
    const timelineHandle = document.getElementById('timeline-handle');
    const currentTimeSpan = document.getElementById('current-time');
    const totalTimeSpan = document.getElementById('total-time');
    const volumeSlider = document.getElementById('volume-slider');
    const energyMarkers = document.getElementById('energy-markers');
    
    if (audio) {
        // Format time helper
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        // Update time display
        const updateTimeDisplay = () => {
            currentTimeSpan.textContent = formatTime(audio.currentTime);
            totalTimeSpan.textContent = formatTime(audio.duration);
        };
        
        // Update timeline
        const updateTimeline = () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            timelineFill.style.width = `${progress}%`;
            timelineHandle.style.left = `${progress}%`;
        };
        
        // Play/Pause functionality
        playPauseBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                audio.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
        
        // Timeline click to seek
        const timelineBar = document.querySelector('.timeline-bar');
        timelineBar.addEventListener('click', (e) => {
            const rect = timelineBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = (clickX / rect.width) * 100;
            const seekTime = (percentage / 100) * audio.duration;
            audio.currentTime = seekTime;
        });
        
        // Volume control
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value / 100;
        });
        
        // Audio event listeners
        audio.addEventListener('loadedmetadata', () => {
            updateTimeDisplay();
            
            // Add voice analysis markers
            voiceAnalysis.forEach((analysis, index) => {
                const position = (analysis.timestamp / 1000) / audio.duration * 100;
                const marker = document.createElement('div');
                marker.className = 'energy-marker';
                marker.style.left = `${position}%`;
                
                // Color based on accuracy
                const accuracy = analysis.accuracy || 0;
                let color;
                if (accuracy >= 0.8) color = '#4CAF50'; // Green for high accuracy
                else if (accuracy >= 0.6) color = '#FF9800'; // Orange for medium
                else color = '#F44336'; // Red for low accuracy
                
                marker.style.backgroundColor = color;
                marker.style.borderColor = color;
                
                // Tooltip with analysis details
                const tooltip = `
                    Time: ${Math.round(analysis.timestamp / 1000)}s
                    Detected: ${analysis.detectedEnergy}
                    Target: ${analysis.targetEnergy}
                    Accuracy: ${Math.round(accuracy * 100)}%
                    Volume: ${Math.round(analysis.volume * 100)}%
                    Pitch: ${Math.round(analysis.pitch * 100)}%
                `;
                marker.title = tooltip;
                
                energyMarkers.appendChild(marker);
            });
        });
        
        audio.addEventListener('timeupdate', () => {
            updateTimeDisplay();
            updateTimeline();
        });
        
        audio.addEventListener('ended', () => {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        // Add breath moment markers if available
        if (data.evaluation.breathRecovery && data.evaluation.breathRecovery.breathMoments) {
            data.evaluation.breathRecovery.breathMoments.forEach((moment, index) => {
                const position = (moment.timestamp / 1000) / audio.duration * 100;
                const marker = document.createElement('div');
                marker.className = 'breath-marker';
                marker.style.left = `${position}%`;
                marker.style.backgroundColor = '#2196F3'; // Blue for breath moments
                marker.style.borderColor = '#2196F3';
                
                const effectiveness = moment.effectiveness || 0;
                const tooltip = `
                    Breath Moment: ${Math.round(moment.timestamp / 1000)}s
                    Effectiveness: ${Math.round(effectiveness * 100)}%
                    Quality: ${moment.recoveryQuality || 'Good'}
                `;
                marker.title = tooltip;
                
                energyMarkers.appendChild(marker);
            });
        }
    }
}

function populateEnergyHeatmap(data) {
    const energyHeatmap = document.getElementById('energy-heatmap');
    
    // Use real evaluation data if available, otherwise fall back to analytics
    let energyDistribution = {};
    
    if (data.evaluation && data.evaluation.energyRange && data.evaluation.energyRange.energyDistribution) {
        energyDistribution = data.evaluation.energyRange.energyDistribution;
    } else if (data.analytics && data.analytics.energyRange && data.analytics.energyRange.distribution) {
        energyDistribution = data.analytics.energyRange.distribution;
    }
    
    const heatmapHTML = `
        <div class="heatmap-container">
            <div class="heatmap-header">
                <h4>Energy Level Distribution</h4>
                <p>Shows how much time you spent at each energy level based on voice analysis</p>
            </div>
            <div class="heatmap-grid">
                ${generateHeatmapCells(energyDistribution)}
            </div>
            <div class="heatmap-legend">
                <div class="legend-item">
                    <span class="legend-color low"></span>
                    <span>Low Energy (1-3)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color medium"></span>
                    <span>Medium Energy (4-6)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color high"></span>
                    <span>High Energy (7-9)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color breath"></span>
                    <span>Breath Moments</span>
                </div>
            </div>
        </div>
    `;
    
    energyHeatmap.innerHTML = heatmapHTML;
}

function generateHeatmapCells(distribution) {
    let cells = '';
    for (let level = 9; level >= 1; level--) {
        const count = distribution[level] || 0;
        const intensity = Math.min(count / 5, 1); // Normalize to 0-1
        const color = getEnergyHeatmapColor(level, intensity);
        
        cells += `
            <div class="heatmap-cell" style="background-color: ${color};">
                <span class="cell-level">${level}</span>
                <span class="cell-count">${count}</span>
            </div>
        `;
    }
    return cells;
}

function getEnergyColor(level) {
    if (level <= 3) return '#4ade80'; // Green for low energy
    if (level <= 6) return '#fbbf24'; // Yellow for medium energy
    return '#f87171'; // Red for high energy
}

function getEnergyHeatmapColor(level, intensity) {
    const baseColors = {
        1: '#dcfce7', 2: '#bbf7d0', 3: '#86efac', // Low energy (green shades)
        4: '#fef3c7', 5: '#fde68a', 6: '#fbbf24', // Medium energy (yellow shades)
        7: '#fecaca', 8: '#f87171', 9: '#dc2626'  // High energy (red shades)
    };
    
    const baseColor = baseColors[level] || '#6b7280';
    return intensity > 0 ? baseColor : '#374151';
}

function populateSessionDetails(data) {
    const sessionDetails = document.getElementById('session-details');
    
    // Calculate actual duration in minutes and seconds
    const actualDurationMs = data.actualDuration || 0;
    const actualMinutes = Math.floor(actualDurationMs / 60000);
    const actualSeconds = Math.floor((actualDurationMs % 60000) / 1000);
    const actualDurationText = `${actualMinutes}:${actualSeconds.toString().padStart(2, '0')}`;
    
    // Get energy transition success rate from real evaluation data
    let transitionSuccess = { total: 0, successful: 0, rate: 0 };
    let responseTime = { average: 0 };
    
    if (data.evaluation && data.evaluation.responseSpeed) {
        // Use real evaluation data
        const responseTimes = data.evaluation.responseSpeed.responseTimes || [];
        const successfulTransitions = responseTimes.filter(rt => rt.success).length;
        transitionSuccess = {
            total: responseTimes.length,
            successful: successfulTransitions,
            rate: responseTimes.length > 0 ? Math.round((successfulTransitions / responseTimes.length) * 100) : 0
        };
        responseTime.average = data.evaluation.responseSpeed.averageResponseTime || 0;
    } else if (data.analytics) {
        // Fall back to analytics data
        transitionSuccess = data.analytics.energyTransitionSuccess || { total: 0, successful: 0, rate: 0 };
        responseTime = data.analytics.responseTime || { average: 0 };
    }
    
    const detailsHTML = `
        <div class="details-grid">
            <div class="detail-item">
                <span class="detail-label">Topic:</span>
                <span class="detail-value">${data.topic}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Actual Duration:</span>
                <span class="detail-value">${actualDurationText}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Energy Changes:</span>
                <span class="detail-value">${data.energyChanges ? data.energyChanges.length : 0} transitions</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Breath Moments:</span>
                <span class="detail-value">${data.breathMoments ? data.breathMoments.length : 0} recovery points</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Energy Transition Success Rate:</span>
                <span class="detail-value">${transitionSuccess.successful}/${transitionSuccess.total} transitions successful (${transitionSuccess.rate}%)</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Response Time to Changes:</span>
                <span class="detail-value">Average: ${responseTime.average.toFixed(1)} seconds</span>
            </div>
        </div>
    `;
    
    sessionDetails.innerHTML = detailsHTML;
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
                <span class="score">${evaluation.responseSpeed?.score || 0}/10</span>
            </div>
            <p class="feedback">${evaluation.responseSpeed?.feedback || 'No feedback available'}</p>
        </div>
        
        <div class="evaluation-item">
            <h4>Actual Energy Range Demonstrated</h4>
            <div class="score-display">
                <span class="score">${evaluation.energyRange?.score || 0}/10</span>
            </div>
            <p class="feedback">${evaluation.energyRange?.feedback || 'No feedback available'}</p>
        </div>
        
        <div class="evaluation-item">
            <h4>Content Continuity</h4>
            <div class="score-display">
                <span class="score">${evaluation.contentContinuity?.score || 0}/10</span>
            </div>
            <p class="feedback">${evaluation.contentContinuity?.feedback || 'No feedback available'}</p>
        </div>
        
        <div class="evaluation-item">
            <h4>Breath Recovery</h4>
            <div class="score-display">
                <span class="score">${evaluation.breathRecovery?.score || 0}/10</span>
            </div>
            <p class="feedback">${evaluation.breathRecovery?.feedback || 'No feedback available'}</p>
        </div>
        
        <div class="evaluation-item overall">
            <h4>Overall Performance</h4>
            <div class="score-display">
                <span class="score">${evaluation.overallPerformance?.score || 0}/10</span>
            </div>
            <p class="feedback">${evaluation.overallPerformance?.summary || evaluation.overallPerformance?.feedback || 'No summary available'}</p>
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
