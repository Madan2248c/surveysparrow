// Triple Step Game Logic
class TripleStepGame {
    constructor() {
        this.gameData = null;
        this.currentTopic = '';
        this.wordList = [];
        this.currentWordIndex = 0;
        this.integrationTimer = null;
        this.speechTimer = null;
        this.gameStartTime = null;
        this.totalTime = 0;
        this.integrationTime = 5; // 5 seconds to integrate each word
        this.wordInterval = 30; // seconds between words
        this.isListening = false;
        this.recognition = null;
        this.transcription = '';
        this.latestInterim = '';
        this.currentWordTranscriptStart = 0;
        this.wordResolved = false;
        this.integratedWords = [];
        this.missedWords = []; 
        this.gameState = 'setup'; // setup, playing, finished
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.finalAudioBlob = null;
        
        this.initializeSpeechRecognition();
        this.loadGameData();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateMicrophoneUI();
            };

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    // Normalize spacing when appending
                    const trimmed = finalTranscript.trim();
                    if (trimmed.length > 0) {
                        if (this.transcription.length > 0 && !this.transcription.endsWith(' ')) {
                            this.transcription += ' ';
                        }
                        this.transcription += trimmed + ' ';
                    }
                }

                this.latestInterim = interimTranscript;
                this.updateTranscription(interimTranscript);
                this.checkWordIntegration();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showManualInput();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateMicrophoneUI();
            };
        } else {
            console.warn('Speech recognition not supported');
            this.showManualInput();
        }
    }

    loadGameData() {
        // Get game data from session storage
        const gameType = sessionStorage.getItem('currentGame');
        if (gameType === 'triple-step') {
            // Import game data from main.js
            if (typeof gameData !== 'undefined' && gameData[gameType]) {
                this.gameData = gameData[gameType];
                this.setupGame();
            } else {
                console.error('Game data not found');
            }
        }
    }

    setupGame() {
        const difficulty = sessionStorage.getItem('selectedDifficulty') || 'medium';
        const difficultyData = this.gameData.difficulties[difficulty];
        
        // Use custom word interval if set, otherwise use difficulty default
        this.wordInterval = parseInt(sessionStorage.getItem('selectedWordInterval')) || difficultyData.interval;
        this.totalTime = parseInt(sessionStorage.getItem('currentTimer')) || this.gameData.defaultTimer;
        
        // Select random topic
        this.currentTopic = this.gameData.topics[Math.floor(Math.random() * this.gameData.topics.length)];
        
        // Generate word list based on difficulty
        this.generateWordList(difficultyData);
        
        this.createGameUI();
    }

    generateWordList(difficultyData) {
        this.wordList = [];
        // Use custom word count if set, otherwise use difficulty default
        const wordCount = parseInt(sessionStorage.getItem('selectedPromptCount')) || difficultyData.wordCount;
        const wordTypes = difficultyData.wordTypes;
        
        for (let i = 0; i < wordCount; i++) {
            const wordType = wordTypes[Math.floor(Math.random() * wordTypes.length)];
            const words = this.gameData.wordBank[wordType];
            const word = words[Math.floor(Math.random() * words.length)];
            
            // Ensure no duplicate words
            if (!this.wordList.includes(word)) {
                this.wordList.push(word);
            } else {
                i--; // Try again
            }
        }
    }

    createGameUI() {
        const container = document.querySelector('.game-content');
        container.innerHTML = `
            <div class="game-screen">
                <div class="game-header">
                    <h2>${this.gameData.title}</h2>
                </div>
                
                <div class="main-topic">
                    <h3>${this.currentTopic}</h3>
                </div>
                
                <div class="word-counter">
                    <h4>Word Progress</h4>
                    <div class="word-progress" id="wordProgress"></div>
                    <div class="word-stats">
                        <div class="word-stat">
                            <span class="number" id="integratedCount">0</span>
                            <span>Integrated</span>
                        </div>
                        <div class="word-stat">
                            <span class="number" id="missedCount">0</span>
                            <span>Missed</span>
                        </div>
                        <div class="word-stat">
                            <span class="number" id="remainingCount">${this.wordList.length}</span>
                            <span>Remaining</span>
                        </div>
                    </div>
                </div>
                
                <div class="speech-timer">
                    <h4>Speech Time</h4>
                    <div class="speech-time" id="speechTime">${this.formatTime(this.totalTime)}</div>
                </div>
                
                <div class="random-word-container" id="wordContainer">
                    <div class="game-instructions">
                        <h4>Ready to Start?</h4>
                        <ul>
                            <li>Click "Start Speaking" to begin your speech</li>
                            <li>Random words will appear every ${this.wordInterval} seconds</li>
                            <li>Integrate each word into your speech within 5 seconds</li>
                            <li>Keep your main topic as the throughline</li>
                            <li>Stay confident and keep going!</li>
                        </ul>
                    </div>
                </div>
                
                <div class="microphone-section">
                    <div class="microphone-icon" id="microphoneIcon">🎤</div>
                    <p id="microphoneStatus">Click "Start Speaking" to begin</p>
                </div>
                
                <div class="live-transcription" id="transcription">
                    <div class="transcription-placeholder">Your speech will appear here...</div>
                    <div class="final-text" id="finalTranscriptionText"></div>
                    <div class="interim-text" id="interimTranscriptionText"></div>
                </div>
                
                <button class="next-btn" id="startBtn" onclick="game.startGame()">Start Speaking</button>
                <button class="end-btn" id="endBtn" onclick="game.endGame()" style="display: none;">End Now</button>
            </div>
        `;
        
        this.updateWordProgress();
    }

    startGame() {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.currentWordIndex = 0;
        this.currentWordTranscriptStart = 0;
        this.transcription = '';
        this.latestInterim = '';
        this.finalAudioBlob = null;
        this.integratedWords = [];
        this.missedWords = [];
        
        // Start speech recognition
        if (this.recognition) {
            this.recognition.start();
        }
        
        // Start real microphone recording
        this.startRecording();

        // Start speech timer
        this.speechTimer = setInterval(() => {
            this.updateSpeechTimer();
        }, 1000);
        
        // Show first word after a delay
        setTimeout(() => {
            this.showNextWord();
        }, 3000);
        
        // Update UI
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('endBtn').style.display = 'block';
        document.getElementById('microphoneStatus').textContent = 'Listening... Speak now!';
        document.querySelector('.game-instructions').style.display = 'none';
    }

    showNextWord() {
        if (this.currentWordIndex >= this.wordList.length) {
            this.endGame();
            return;
        }
        
        const word = this.wordList[this.currentWordIndex];
        const wordContainer = document.getElementById('wordContainer');
        
        wordContainer.innerHTML = `
            <div class="random-word" id="currentWord">
                ${word.toUpperCase()}
            </div>
            <div class="integration-timer" id="integrationTimer">5</div>
        `;
        
        // Mark transcript start index for this word
        this.currentWordTranscriptStart = this.transcription.length;
        this.wordResolved = false;

        // Start integration timer
        clearInterval(this.integrationTimer);
        let timeLeft = this.integrationTime;
        this.integrationTimer = setInterval(() => {
            if (this.wordResolved) return; // do nothing once resolved
            timeLeft--;
            const timerEl = document.getElementById('integrationTimer');
            if (timerEl) timerEl.textContent = timeLeft;
            if (timeLeft <= 2) {
                const t = document.getElementById('integrationTimer');
                if (t) t.classList.add('urgent');
            }
            if (timeLeft <= 0) {
                this.missWord();
            }
        }, 1000);
        
        // Update word progress
        this.updateWordProgress();
    }

    checkWordIntegration() {
        if (this.currentWordIndex >= this.wordList.length) return;
        
        if (this.wordResolved) return;

        const currentWord = this.wordList[this.currentWordIndex];
        const wordLower = currentWord.toLowerCase();
        // Check only within the transcript window since this word was shown, plus latest interim
        const windowText = (
            this.transcription.slice(this.currentWordTranscriptStart) + ' ' + (this.latestInterim || '')
        ).toLowerCase();

        const regex = new RegExp(`\\b${this.escapeRegex(wordLower)}\\b`, 'i');
        if (regex.test(windowText)) {
            this.integrateWord();
        }
    }

    integrateWord() {
        if (this.wordResolved) return;
        this.wordResolved = true;
        clearInterval(this.integrationTimer);
        
        const currentWord = this.wordList[this.currentWordIndex];
        if (!this.integratedWords.includes(currentWord)) this.integratedWords.push(currentWord);
        
        // Update word display
        const wordElement = document.getElementById('currentWord');
        wordElement.classList.add('integrated');
        wordElement.textContent = `${currentWord.toUpperCase()} ✓`;
        
        // Update counters
        document.getElementById('integratedCount').textContent = this.integratedWords.length;
        document.getElementById('remainingCount').textContent = this.wordList.length - this.currentWordIndex - 1;
        
        // Move to next word after the specified interval
        setTimeout(() => {
            if (this.gameState !== 'playing') return;
            this.currentWordIndex++;
            this.showNextWord();
        }, this.wordInterval * 1000);
    }

    missWord() {
        if (this.wordResolved) return;
        this.wordResolved = true;
        clearInterval(this.integrationTimer);
        
        const currentWord = this.wordList[this.currentWordIndex];
        if (!this.missedWords.includes(currentWord)) this.missedWords.push(currentWord);
        
        // Update word display
        const wordElement = document.getElementById('currentWord');
        wordElement.classList.add('missed');
        wordElement.textContent = `${currentWord.toUpperCase()} ✗`;
        
        // Update counters
        document.getElementById('missedCount').textContent = this.missedWords.length;
        document.getElementById('remainingCount').textContent = this.wordList.length - this.currentWordIndex - 1;
        
        // Move to next word after the specified interval
        setTimeout(() => {
            if (this.gameState !== 'playing') return;
            this.currentWordIndex++;
            this.showNextWord();
        }, this.wordInterval * 1000);
    }

    updateWordProgress() {
        const progressContainer = document.getElementById('wordProgress');
        progressContainer.innerHTML = '';
        
        for (let i = 0; i < this.wordList.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'word-dot';
            
            if (i < this.currentWordIndex) {
                if (this.integratedWords.includes(this.wordList[i])) {
                    dot.classList.add('completed');
                } else {
                    dot.classList.add('missed');
                }
            } else if (i === this.currentWordIndex && this.gameState === 'playing') {
                dot.classList.add('current');
            }
            
            progressContainer.appendChild(dot);
        }
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateSpeechTimer() {
        const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const remaining = this.totalTime - elapsed;
        
        if (remaining <= 0) {
            this.endGame();
            return;
        }
        
        document.getElementById('speechTime').textContent = this.formatTime(remaining);
    }

    updateTranscription(interimText) {
        const transcriptionElement = document.getElementById('transcription');
        const placeholder = transcriptionElement.querySelector('.transcription-placeholder');
        if (placeholder) placeholder.remove();

        const finalDiv = document.getElementById('finalTranscriptionText');
        const interimDiv = document.getElementById('interimTranscriptionText');

        if (finalDiv) finalDiv.textContent = this.transcription.trim();
        if (interimDiv) interimDiv.textContent = (interimText || '').trim();
        
        transcriptionElement.classList.add('listening');
    }

    updateMicrophoneUI() {
        const icon = document.getElementById('microphoneIcon');
        const status = document.getElementById('microphoneStatus');
        const transcription = document.getElementById('transcription');
        
        if (this.isListening) {
            icon.textContent = '🎤';
            icon.style.color = '#FBBF24';
            status.textContent = 'Listening... Speak now!';
            transcription.classList.add('listening');
        } else {
            icon.textContent = '🎤';
            icon.style.color = '#94A3B8';
            status.textContent = 'Microphone inactive';
            transcription.classList.remove('listening');
        }
    }

    showManualInput() {
        const transcriptionElement = document.getElementById('transcription');
        transcriptionElement.innerHTML = `
            <div class="manual-transcription">
                <div class="manual-label">Speech recognition not available. Type your speech manually:</div>
                <textarea id="manual-input" placeholder="Type your speech here..."></textarea>
            </div>
        `;
        
        const textarea = document.getElementById('manual-input');
        textarea.addEventListener('input', (e) => {
            this.transcription = e.target.value;
            this.checkWordIntegration();
        });
    }

    async startRecording() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: 'audio/webm;codecs=opus' });
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
            };
            this.mediaRecorder.start(250);
        } catch (err) {
            console.error('Error starting audio recording:', err);
        }
    }

    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.finalAudioBlob = blob;
                if (this.mediaStream) {
                    this.mediaStream.getTracks().forEach(t => t.stop());
                }
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }

    async endGame() {
        this.gameState = 'finished';
        
        // Stop timers
        clearInterval(this.speechTimer);
        clearInterval(this.integrationTimer);
        
        // Stop speech recognition
        if (this.recognition) {
            this.recognition.stop();
        }

        // Stop microphone recording and finalize blob
        await this.stopRecording();
        
        // Calculate results
        const totalWords = this.wordList.length;
        const integratedCount = this.integratedWords.length;
        const missedCount = this.missedWords.length;
        const successRate = Math.round((integratedCount / totalWords) * 100);
        
        // Calculate actual time spent
        const actualTime = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
        
        // Generate session ID
        const sessionId = `triple_step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store results for feedback page
        sessionStorage.setItem('tripleStepResults', JSON.stringify({
            sessionId,
            topic: this.currentTopic,
            totalWords,
            integratedWords: this.integratedWords,
            missedWords: this.missedWords,
            successRate,
            transcription: this.transcription,
            totalTime: this.totalTime,
            actualTime: actualTime,
            completedEarly: actualTime < this.totalTime
        }));
        
        // Show completion message
        const wordContainer = document.getElementById('wordContainer');
        const earlyMessage = actualTime < this.totalTime ? '<p><em>You ended the speech early</em></p>' : '';
        wordContainer.innerHTML = `
            <div class="game-instructions">
                <h4>Game Complete!</h4>
                <p>You integrated ${integratedCount}/${totalWords} words (${successRate}% success rate)</p>
                <p>Time spent: ${this.formatTime(actualTime)}</p>
                ${earlyMessage}
                <p>Analyzing your speech...</p>
            </div>
        `;

        // Global processing overlay while waiting for backend analysis
        this.showProcessingOverlay();
        
        // Update buttons
        document.getElementById('endBtn').style.display = 'none';
        document.getElementById('startBtn').textContent = 'Processing...';
        document.getElementById('startBtn').disabled = true;
        
        document.getElementById('microphoneStatus').textContent = 'Analyzing speech...';
        
        try {
            // Send evaluation request to backend
            await this.sendEvaluationRequest(sessionId, actualTime);
            
            // Update UI after successful evaluation
            wordContainer.innerHTML = `
                <div class="game-instructions">
                    <h4>Analysis Complete!</h4>
                    <p>You integrated ${integratedCount}/${totalWords} words (${successRate}% success rate)</p>
                    <p>Time spent: ${this.formatTime(actualTime)}</p>
                    ${earlyMessage}
                    <p>Click "View Results" to see detailed feedback</p>
                </div>
            `;
            
            document.getElementById('startBtn').textContent = 'View Results';
            document.getElementById('startBtn').disabled = false;
            document.getElementById('startBtn').onclick = () => {
                window.location.href = 'feedback.html?game=triple-step';
            };
            document.getElementById('startBtn').style.display = 'block';
            
            document.getElementById('microphoneStatus').textContent = 'Analysis complete!';
            this.hideProcessingOverlay();
            
        } catch (error) {
            console.error('Error sending evaluation request:', error);
            this.hideProcessingOverlay();
            
            // Show error message but still allow viewing basic results
            wordContainer.innerHTML = `
                <div class="game-instructions">
                    <h4>Game Complete!</h4>
                    <p>You integrated ${integratedCount}/${totalWords} words (${successRate}% success rate)</p>
                    <p>Time spent: ${this.formatTime(actualTime)}</p>
                    ${earlyMessage}
                    <p><em>Note: Advanced analysis unavailable</em></p>
                    <p>Click "View Results" to see basic feedback</p>
                </div>
            `;
            
            document.getElementById('startBtn').textContent = 'View Results';
            document.getElementById('startBtn').disabled = false;
            document.getElementById('startBtn').onclick = () => {
                window.location.href = 'feedback.html?game=triple-step';
            };
            document.getElementById('startBtn').style.display = 'block';
            
            document.getElementById('microphoneStatus').textContent = 'Game completed!';
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showProcessingOverlay() {
        const existing = document.getElementById('processingOverlay');
        if (existing) return;
        const overlay = document.createElement('div');
        overlay.id = 'processingOverlay';
        overlay.className = 'processing-overlay';
        overlay.innerHTML = `
            <div class="processing-modal">
                <div class="processing-spinner"></div>
                <div class="processing-title">Analyzing your speech</div>
                <div class="processing-subtitle processing-dots">Please wait</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideProcessingOverlay() {
        const overlay = document.getElementById('processingOverlay');
        if (overlay) overlay.remove();
    }

    async sendEvaluationRequest(sessionId, actualTime) {
        try {
            const audioBlob = this.finalAudioBlob;
            if (!audioBlob) {
                throw new Error('No recorded audio available');
            }

            const formData = new FormData();
            formData.append('audio', audioBlob, 'speech.webm');
            formData.append('sessionId', sessionId);
            formData.append('topic', this.currentTopic);
            formData.append('wordList', JSON.stringify(this.wordList));
            formData.append('integratedWords', JSON.stringify(this.integratedWords));
            formData.append('missedWords', JSON.stringify(this.missedWords));
            formData.append('transcription', this.transcription.trim());
            formData.append('totalTime', this.totalTime);
            formData.append('actualTime', actualTime);
            formData.append('completedEarly', actualTime < this.totalTime);

            const response = await fetch('/api/v1/games/triple-step/evaluate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Evaluation result:', result);

            const currentResults = JSON.parse(sessionStorage.getItem('tripleStepResults'));
            currentResults.evaluation = result.evaluation;
            sessionStorage.setItem('tripleStepResults', JSON.stringify(currentResults));

            return result;
        } catch (error) {
            console.error('Error in sendEvaluationRequest:', error);
            throw error;
        }
    }
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', function() {
    game = new TripleStepGame();
});
