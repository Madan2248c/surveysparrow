class ConductorGame {
    constructor() {
        this.currentScreen = 'setup';
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            currentEnergy: 5,
            timeRemaining: 0,
            totalTime: 0,
            actualTimeSpent: 0,
            energyChanges: 0,
            breathCount: 0,
            topic: '',
            duration: 3,
            sessionId: null,
            sessionStartTime: null
        };
        
        this.timers = {
            gameTimer: null,
            energyTimer: null,
            breathTimer: null
        };
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.energyDescriptions = {
            1: 'Whisper',
            2: 'Very Calm',
            3: 'Calm',
            4: 'Low Normal',
            5: 'Normal',
            6: 'High Normal',
            7: 'Energetic',
            8: 'High Energy',
            9: 'Very High Energy'
        };
        
        this.energyColors = {
            1: '#28a745',
            2: '#28a745',
            3: '#28a745',
            4: '#ffc107',
            5: '#ffc107',
            6: '#ffc107',
            7: '#dc3545',
            8: '#dc3545',
            9: '#dc3545'
        };
        
        this.currentUserId = null;
        this.currentSessionId = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupCustomTopicHandling();
    }
    
    bindEvents() {
        // Setup screen events
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        
        // Game screen events
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('end-game-btn').addEventListener('click', () => this.endGame());
        
        // Results screen events
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        document.getElementById('back-to-setup-btn').addEventListener('click', () => this.backToSetup());
    }
    
    setupCustomTopicHandling() {
        const topicSelect = document.getElementById('topic-select');
        const customTopicGroup = document.getElementById('custom-topic-group');
        
        topicSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customTopicGroup.classList.remove('hidden');
                document.getElementById('custom-topic').focus();
            } else {
                customTopicGroup.classList.add('hidden');
            }
        });
    }
    
    async startGame() {
        try {
            // Get user from localStorage (if logged in)
            const user = JSON.parse(localStorage.getItem('user'));
            this.currentUserId = user ? user.id : null;

            // Get game settings
            const topic = document.getElementById('topic-select').value;
            const customTopic = document.getElementById('custom-topic')?.value;
            const duration = parseInt(document.getElementById('duration-select').value);
            
            const selectedTopic = topic === 'custom' ? customTopic : topic;

            // Generate session ID
            const sessionId = `conductor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Start game session
            const sessionResponse = await fetch('/api/v1/games/conductor/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    userId: this.currentUserId,
                    topic: selectedTopic,
                    duration: duration
                })
            });

            const sessionData = await sessionResponse.json();
            if (!sessionData.message) {
                throw new Error('Failed to start session');
            }

            this.currentSessionId = sessionId;

            // Initialize game state
            this.gameState.sessionId = sessionId;
            this.gameState.sessionStartTime = Date.now();
            this.gameState.isPlaying = true;
            this.gameState.isPaused = false;
            this.gameState.timeRemaining = duration * 60; // Convert to seconds
            this.gameState.totalTime = duration * 60;
            this.gameState.topic = selectedTopic;
            this.gameState.duration = duration;
            this.gameState.currentEnergy = 5;
            this.gameState.energyChanges = 0;
            this.gameState.breathCount = 0;

            // Start recording
            await this.startRecording();

            // Continue with existing game logic
            this.showScreen('game');
            this.startGameTimer();
            this.scheduleEnergyChange();
            this.scheduleBreathPrompt();
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Failed to start game. Please try again.');
        }
    }
    
    startGameTimer() {
        this.timers.gameTimer = setInterval(() => {
            if (!this.gameState.isPaused) {
                this.gameState.timeRemaining--;
                this.updateTimer();
                
                if (this.gameState.timeRemaining <= 0) {
                    this.endGame();
                }
            }
        }, 1000);
    }
    
    scheduleEnergyChange() {
        const minInterval = 15; // 15 seconds
        const maxInterval = 30; // 30 seconds
        const interval = Math.random() * (maxInterval - minInterval) + minInterval;
        
        this.timers.energyTimer = setTimeout(() => {
            if (this.gameState.isPlaying && !this.gameState.isPaused) {
                this.changeEnergy();
                this.scheduleEnergyChange(); // Schedule next change
            }
        }, interval * 1000);
    }
    
    scheduleBreathPrompt() {
        const minInterval = 45; // 45 seconds
        const maxInterval = 90; // 90 seconds
        const interval = Math.random() * (maxInterval - minInterval) + minInterval;
        
        this.timers.breathTimer = setTimeout(() => {
            if (this.gameState.isPlaying && !this.gameState.isPaused) {
                this.showBreathPrompt();
                this.scheduleBreathPrompt(); // Schedule next breath prompt
            }
        }, interval * 1000);
    }
    
    async changeEnergy() {
        // Generate new energy level (1-9)
        let newEnergy;
        do {
            newEnergy = Math.floor(Math.random() * 9) + 1;
        } while (newEnergy === this.gameState.currentEnergy);
        
        this.gameState.currentEnergy = newEnergy;
        this.gameState.energyChanges++;
        
        this.updateEnergyDisplay();
        
        // Add visual feedback
        this.addEnergyChangeEffect();
        
        // Record energy change on backend
        if (this.gameState.sessionId) {
            try {
                const timestamp = Date.now() - this.gameState.sessionStartTime;
                await fetch('/api/v1/games/conductor/energy-change', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: this.gameState.sessionId,
                        energyLevel: newEnergy,
                        timestamp: timestamp
                    })
                });
            } catch (error) {
                console.error('Error recording energy change:', error);
            }
        }
    }
    
    async showBreathPrompt() {
        this.gameState.breathCount++;
        const breathOverlay = document.getElementById('breath-overlay');
        
        breathOverlay.classList.add('active');
        
        // Record breath moment on backend
        if (this.gameState.sessionId) {
            try {
                const timestamp = Date.now() - this.gameState.sessionStartTime;
                await fetch('/api/v1/games/conductor/breath-moment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: this.gameState.sessionId,
                        timestamp: timestamp
                    })
                });
            } catch (error) {
                console.error('Error recording breath moment:', error);
            }
        }
        
        // Hide breath prompt after 3 seconds
        setTimeout(() => {
            breathOverlay.classList.remove('active');
        }, 3000);
    }
    
    addEnergyChangeEffect() {
        const energyNumber = document.getElementById('energy-number');
        energyNumber.style.transform = 'scale(1.2)';
        energyNumber.style.color = this.energyColors[this.gameState.currentEnergy];
        
        setTimeout(() => {
            energyNumber.style.transform = 'scale(1)';
        }, 300);
    }
    
    updateEnergyDisplay() {
        const energyNumber = document.getElementById('energy-number');
        const energyDescription = document.getElementById('energy-description');
        const meterFill = document.getElementById('meter-fill');
        
        energyNumber.textContent = this.gameState.currentEnergy;
        energyDescription.textContent = this.energyDescriptions[this.gameState.currentEnergy];
        
        // Update meter fill (1-9 maps to 0-100%)
        const meterPercentage = ((this.gameState.currentEnergy - 1) / 8) * 100;
        meterFill.style.width = `${meterPercentage}%`;
        
        // Update color based on energy level
        energyNumber.style.color = this.energyColors[this.gameState.currentEnergy];
    }
    
    updateTimer() {
        const minutes = Math.floor(this.gameState.timeRemaining / 60);
        const seconds = this.gameState.timeRemaining % 60;
        const timerDisplay = document.getElementById('timer');
        
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateTopicDisplay() {
        document.getElementById('current-topic').textContent = this.gameState.topic;
    }
    
    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.gameState.isPaused) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.classList.remove('btn-secondary');
            pauseBtn.classList.add('btn-primary');
        } else {
            pauseBtn.textContent = 'Pause';
            pauseBtn.classList.remove('btn-primary');
            pauseBtn.classList.add('btn-secondary');
        }
    }
    
    async endGame() {
        // Stop recording and timers
        if (this.isRecording) {
            await this.stopRecording();
        }
        
        // Clear all timers
        if (this.timers.gameTimer) {
            clearInterval(this.timers.gameTimer);
        }
        if (this.timers.energyTimer) {
            clearTimeout(this.timers.energyTimer);
        }
        if (this.timers.breathTimer) {
            clearTimeout(this.timers.breathTimer);
        }
        
        // Calculate actual time spent
        this.gameState.actualTimeSpent = this.gameState.totalTime - this.gameState.timeRemaining;
        this.gameState.isPlaying = false;
        
        // Update the session on the backend
        try {
            if (this.currentSessionId) {
                // Create FormData for audio upload
                const formData = new FormData();
                formData.append('sessionId', this.currentSessionId);
                formData.append('duration', this.gameState.actualTimeSpent);
                formData.append('finalEnergyLevels', JSON.stringify([this.gameState.currentEnergy]));
                formData.append('sessionData', JSON.stringify({
                    topic: this.gameState.topic,
                    energyChanges: this.gameState.energyChanges,
                    breathCount: this.gameState.breathCount
                }));
                
                // Add audio file if available
                if (this.audioChunks.length > 0) {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    formData.append('audio', audioBlob, 'conductor_audio.wav');
                    console.log('[ConductorGame] Audio blob created:', {
                        size: audioBlob.size,
                        type: audioBlob.type,
                        chunksLength: this.audioChunks.length
                    });
                } else {
                    console.log('[ConductorGame] No audio chunks available');
                }
                
                console.log('[ConductorGame] Sending session end request with sessionId:', this.currentSessionId);
                const response = await fetch('/api/v1/games/conductor/end', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[ConductorGame] Session end failed:', response.status, errorText);
                    throw new Error(`Session end failed: ${response.status} - ${errorText}`);
                }
                
                const result = await response.json();
                console.log('[ConductorGame] Session end successful:', result);
            }
        } catch (error) {
            console.error('Error ending game session:', error);
        }

        // Show results screen
        this.showResults();
    }
    
    showResults() {
        this.showScreen('results');
        
        // Clear any previously added dynamic content
        this.clearResultsDisplay();

        // Update initial stats display - use actual time spent instead of total time
        const actualTimeSpent = this.gameState.actualTimeSpent || (this.gameState.totalTime - this.gameState.timeRemaining);
        const actualMinutes = Math.floor(actualTimeSpent / 60);
        const actualSeconds = actualTimeSpent % 60;
        const durationDisplay = `${actualMinutes}:${actualSeconds.toString().padStart(2, '0')}`;
        
        document.getElementById('final-duration').textContent = durationDisplay;
        document.getElementById('energy-changes').textContent = this.gameState.energyChanges;
        document.getElementById('breath-count').textContent = this.gameState.breathCount;

        // Show loading indicator
        document.getElementById('evaluation-loading').classList.remove('hidden');

        // Update View Analysis button link
        const viewAnalysisBtn = document.getElementById('view-analysis-btn');
        if (this.gameState.sessionId) {
            viewAnalysisBtn.href = `conductor-analysis.html?sessionId=${this.gameState.sessionId}&gameType=conductor`;
        } else {
            viewAnalysisBtn.href = `conductor-analysis.html`; // Fallback
        }
        
        // Start checking for evaluation completion
        if (this.gameState.sessionId) {
            this.checkEvaluationStatus();
        }
    }
    
    async checkEvaluationStatus() {
        if (!this.gameState.sessionId) return;
        
        console.log(`[ConductorGame] Checking evaluation status for session: ${this.gameState.sessionId}`);
        try {
            const response = await fetch(`/api/v1/games/conductor/session/${this.gameState.sessionId}`);
            if (!response.ok) {
                throw new Error('Failed to get session status');
            }
            
            const sessionData = await response.json();
            console.log(`[ConductorGame] Session status received:`, sessionData.status, sessionData.evaluation ? 'with evaluation' : 'no evaluation');
            
            if (sessionData.status === 'evaluated' && sessionData.evaluation) {
                // Evaluation is complete, hide loading indicator and show results
                document.getElementById('evaluation-loading').classList.add('hidden');
                
                // Display evaluation results
                this.displayEvaluationResults(sessionData);
            } else if (sessionData.status === 'completed' || sessionData.status === 'recording') {
                // Still waiting for evaluation, check again in 2 seconds
                console.log(`[ConductorGame] Evaluation not ready, re-checking in 2 seconds...`);
                setTimeout(() => this.checkEvaluationStatus(), 2000);
            } else if (sessionData.status === 'evaluation_failed') {
                // Evaluation failed
                document.getElementById('evaluation-loading').innerHTML = '<p style="color: red;">Evaluation failed. Please try again.</p>';
            } else {
                console.warn(`[ConductorGame] Unexpected session status: ${sessionData.status}`);
                document.getElementById('evaluation-loading').innerHTML = '<p style="color: orange;">Evaluation status unknown. Please check console for errors.</p>';
            }
        } catch (error) {
            console.error('[ConductorGame] Error checking evaluation status:', error);
            document.getElementById('evaluation-loading').innerHTML = '<p style="color: red;">Failed to load evaluation results. Please try again later.</p>';
        }
    }
    
    displayEvaluationResults(sessionData) {
        const resultsContainer = document.querySelector('.results-container');
        
        // Create evaluation results section
        const evaluationSection = document.createElement('div');
        evaluationSection.className = 'evaluation-results';
        evaluationSection.innerHTML = `
            <h3>Performance Analysis</h3>
            <div class="evaluation-grid">
                <div class="evaluation-item">
                    <div class="evaluation-score">${sessionData.evaluation?.overallPerformance?.score || 'N/A'}/10</div>
                    <div class="evaluation-label">Overall Performance</div>
                    <div class="evaluation-feedback">${sessionData.evaluation?.overallPerformance?.feedback || 'No feedback available'}</div>
                </div>
                <div class="evaluation-item">
                    <div class="evaluation-score">${sessionData.evaluation?.responseSpeed?.score || 'N/A'}/10</div>
                    <div class="evaluation-label">Response Speed</div>
                    <div class="evaluation-feedback">${sessionData.evaluation?.responseSpeed?.feedback || 'No feedback available'}</div>
                </div>
                <div class="evaluation-item">
                    <div class="evaluation-score">${sessionData.evaluation?.energyRange?.score || 'N/A'}/10</div>
                    <div class="evaluation-label">Energy Range</div>
                    <div class="evaluation-feedback">${sessionData.evaluation?.energyRange?.feedback || 'No feedback available'}</div>
                </div>
                <div class="evaluation-item">
                    <div class="evaluation-score">${sessionData.evaluation?.contentContinuity?.score || 'N/A'}/10</div>
                    <div class="evaluation-label">Content Continuity</div>
                    <div class="evaluation-feedback">${sessionData.evaluation?.contentContinuity?.feedback || 'No feedback available'}</div>
                </div>
                <div class="evaluation-item">
                    <div class="evaluation-score">${sessionData.evaluation?.breathRecovery?.score || 'N/A'}/10</div>
                    <div class="evaluation-label">Breath Recovery</div>
                    <div class="evaluation-feedback">${sessionData.evaluation?.breathRecovery?.feedback || 'No feedback available'}</div>
                </div>
            </div>
        `;
        
        // Insert evaluation results before the action buttons
        const actionButtons = document.querySelector('.results-actions');
        resultsContainer.insertBefore(evaluationSection, actionButtons);
    }
    

    
    clearResultsDisplay() {
        // Remove any previously added evaluation results
        const existingEvaluation = document.querySelector('.evaluation-results');
        if (existingEvaluation) {
            existingEvaluation.remove();
        }
        
        // Reset loading indicator
        const loadingIndicator = document.getElementById('evaluation-loading');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <p>Analyzing your performance...</p>
                <div class="spinner"></div>
            `;
            loadingIndicator.classList.remove('hidden');
        }
    }
    
    playAgain() {
        // Clear any dynamic content from previous game
        this.clearResultsDisplay();
        
        // Reset to same topic and duration
        this.showScreen('setup');
        
        // Pre-select the same topic and duration
        const topicSelect = document.getElementById('topic-select');
        const durationSelect = document.getElementById('duration-select');
        
        if (this.gameState.topic) {
            // Check if topic exists in options
            let found = false;
            for (let option of topicSelect.options) {
                if (option.value === this.gameState.topic) {
                    topicSelect.value = this.gameState.topic;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                topicSelect.value = 'custom';
                document.getElementById('custom-topic').value = this.gameState.topic;
                document.getElementById('custom-topic-group').classList.remove('hidden');
            }
        }
        
        durationSelect.value = this.gameState.duration;
    }
    
    backToSetup() {
        // Clear any dynamic content from previous game
        this.clearResultsDisplay();
        
        this.showScreen('setup');
        
        // Reset form
        document.getElementById('topic-select').value = 'If money didn\'t exist...';
        document.getElementById('custom-topic').value = '';
        document.getElementById('custom-topic-group').classList.add('hidden');
        document.getElementById('duration-select').value = '3';
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }
    
    // Audio recording methods
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            console.log('Audio recording started');
        } catch (error) {
            console.error('Error starting audio recording:', error);
            alert('Failed to start audio recording. Please allow microphone access.');
        }
    }
    
    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            return new Promise((resolve) => {
                this.mediaRecorder.onstop = () => {
                    this.isRecording = false;
                    console.log('Audio recording stopped');
                    resolve();
                };
                this.mediaRecorder.stop();
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            });
        }
    }
    
    // Utility method to format time
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.conductorGameInstance = new ConductorGame();
});

// Add some additional utility functions for better user experience
document.addEventListener('DOMContentLoaded', () => {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (window.conductorGameInstance && window.conductorGameInstance.currentScreen === 'game') {
                window.conductorGameInstance.togglePause();
            }
        }
        
        if (e.code === 'Escape') {
            if (window.conductorGameInstance && window.conductorGameInstance.currentScreen === 'game') {
                window.conductorGameInstance.endGame();
            }
        }
    });
    
    // Add visual feedback for energy changes
    const energyNumber = document.getElementById('energy-number');
    if (energyNumber) {
        energyNumber.addEventListener('animationend', () => {
            energyNumber.style.animation = '';
        });
    }
    
    // Add smooth transitions for screen changes
    const gameScreens = document.querySelectorAll('.game-screen');
    gameScreens.forEach(screen => {
        screen.addEventListener('transitionend', () => {
            if (screen.classList.contains('active')) {
                screen.style.opacity = '1';
            }
        });
    });
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConductorGame;
}
