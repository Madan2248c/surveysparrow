// Game state management
let currentGame = '';
let currentTimer = 30;
let gameTimer = null;
let currentPromptIndex = 0;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let selectedDifficulty = 'medium';
let selectedPromptCount = 5;
let speechRecognition = null;
let isListening = false;
let sessionId = null;
let isProcessingNext = false;

// Timing tracking
let promptStartTime = null;
let firstSpeechTime = null;
let recordingStartTime = null;
let gameResults = {
    completed: 0,
    total: 20,
    averageTime: 0,
    stuckPrompts: 0,
    evaluations: []
};

// Game data
const gameData = {
    'rapid-fire': {
        title: 'Rapid Fire Analogies',
        prompts: {
            easy: [
                'CPU is to computer as brain is to ____?',
                'Book is to pages as journey is to ____?',
                'Friendship is to support as weather is to ____?',
                'Tree is to roots as family is to ____?',
                'Learning is to knowledge as building is to ____?',
                'Music is to sound as emotions are to ____?',
                'Time is to clock as river is to ____?',
                'Car is to road as life is to ____?',
                'Teacher is to student as gardener is to ____?',
                'Love is to warmth as flame is to ____?'
            ],
            medium: [
                'Success is to goal as mountain is to ____?',
                'Phone is to call as bridge is to ____?',
                'Child is to growth as seed is to ____?',
                'Memory is to brain as library is to ____?',
                'Change is to life as seasons are to ____?',
                'Mirror is to reflection as truth is to ____?',
                'Leader is to team as captain is to ____?',
                'Creativity is to ideas as storm is to ____?',
                'Growth is to life as butterfly is to ____?',
                'Clock is to time as life is to ____?'
            ],
            hard: [
                'Democracy is to citizens as garden ecosystem is to ____?',
                'Consciousness is to awareness as quantum physics is to ____?',
                'Artificial intelligence is to machines as evolution is to ____?',
                'Black hole is to space as creativity is to ____?',
                'Time is to future as river flowing backwards is to ____?',
                'Language is to words as living organism is to ____?',
                'Consciousness is to mind as computer network is to ____?',
                'Infinity is to numbers as human potential is to ____?',
                'Internet is to data as neural network is to ____?',
                'Wisdom is to insight as fractal pattern is to ____?'
            ]
        }
    },
    'conductor': {
        title: 'The Conductor',
        prompts: [
            'Introduce yourself with dramatic pauses',
            'Tell a story with changing speeds',
            'Explain a complex topic slowly',
            'Give a passionate speech with rhythm',
            'Describe a scene with varied pacing',
            'Present an argument with strategic pauses',
            'Tell a joke with perfect timing',
            'Explain a process with clear breaks',
            'Give a motivational speech',
            'Describe an emotion with feeling',
            'Present data with emphasis',
            'Tell a personal story',
            'Explain a concept with examples',
            'Give directions with clarity',
            'Present an opinion with conviction',
            'Describe a place with atmosphere',
            'Tell a historical event',
            'Explain a skill with steps',
            'Give advice with wisdom',
            'Present a vision with inspiration'
        ]
    },
    'triple-step': {
        title: 'Triple Step',
        prompts: [
            'Why is education important?',
            'How can we improve communication?',
            'What makes a good leader?',
            'Why should we protect the environment?',
            'How does technology affect society?',
            'What is the value of friendship?',
            'Why is creativity important?',
            'How can we achieve our goals?',
            'What makes a successful team?',
            'Why is health important?',
            'How can we solve problems effectively?',
            'What is the role of family?',
            'Why should we learn from mistakes?',
            'How can we build confidence?',
            'What makes a good decision?',
            'Why is time management crucial?',
            'How can we show empathy?',
            'What is the importance of honesty?',
            'Why should we embrace change?',
            'How can we make a difference?'
        ]
    }
};

// Initialize game page
document.addEventListener('DOMContentLoaded', function() {
    // Get game type from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentGame = urlParams.get('game');
    
    if (!currentGame) {
        window.location.href = 'index.html';
        return;
    }
    
    // Load state from session storage
    currentTimer = parseInt(sessionStorage.getItem('currentTimer')) || 30;
    selectedDifficulty = sessionStorage.getItem('selectedDifficulty') || 'medium';
    selectedPromptCount = parseInt(sessionStorage.getItem('selectedPromptCount')) || 5;
    
    // Generate unique session ID
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Initialize speech recognition
    const speechRecognitionSupported = initializeSpeechRecognition();
    if (!speechRecognitionSupported) {
        console.log('Speech recognition not supported - continuing without live transcription');
        // Show manual transcription fallback after a short delay
        setTimeout(() => {
            showManualTranscriptionFallback();
        }, 1000);
    }
    
    // Create game screen
    createGameScreen();
    
    // Start the game
    startGameSession();
});

function createGameScreen() {
    const game = gameData[currentGame];
    
    // Get prompts based on difficulty for rapid-fire game
    let prompts = game.prompts;
    if (currentGame === 'rapid-fire') {
        prompts = game.prompts[selectedDifficulty];
        // Shuffle and limit to selected count
        prompts = shuffleArray([...prompts]).slice(0, selectedPromptCount);
        gameResults.total = selectedPromptCount;
    }
    
    const gameHTML = `
        <div class="game-screen">
            <div class="game-header">
                <h2>${game.title}</h2>
            </div>
            
            <div class="game-prompt" id="game-prompt">
                ${prompts[currentPromptIndex]}
            </div>
            
            <div class="timer-container">
                <div class="circular-timer">
                    <div class="timer-circle" id="timer-circle">
                        <div class="timer-inner" id="timer-inner">
                            ${currentTimer}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="microphone-section">
                <div class="microphone-icon">🎤</div>
                <p>Recording...</p>
                <div class="live-transcription" id="live-transcription">
                    <div class="transcription-placeholder">Start speaking...</div>
                </div>
                <div class="manual-transcription" id="manual-transcription" style="display: none;">
                    <p class="manual-label">Speech recognition unavailable. You can type your response:</p>
                    <textarea id="manual-input" placeholder="Type your analogy here..." rows="3"></textarea>
                </div>
            </div>
            
            <div class="progress-indicator">
                ${currentPromptIndex + 1} / ${prompts.length}
            </div>
            
            <button class="next-btn" onclick="nextPrompt()">Next</button>
        </div>
    `;
    
    document.querySelector('.container').innerHTML = gameHTML;
    
    // Store prompts for later use
    window.currentPrompts = prompts;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startGameSession() {
    // Reset processing flag
    isProcessingNext = false;
    
    // Start timing for this prompt
    promptStartTime = Date.now();
    firstSpeechTime = null;
    
    let timeLeft = currentTimer;
    const timerInner = document.getElementById('timer-inner');
    const timerCircle = document.getElementById('timer-circle');
    
    // Start recording immediately for rapid-fire game
    if (currentGame === 'rapid-fire') {
        startRecording();
        const speechStarted = startSpeechRecognition();
        if (!speechStarted) {
            console.log('Speech recognition failed to start - continuing with audio recording only');
        }
    }
    
    gameTimer = setInterval(() => {
        timeLeft--;
        timerInner.textContent = timeLeft;
        
        // Update circular progress
        const progress = (timeLeft / currentTimer) * 360;
        timerCircle.style.background = `conic-gradient(#FBBF24 ${progress}deg, #334155 ${progress}deg)`;
        
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            if (currentGame === 'rapid-fire') {
                stopRecording(); // This will now automatically call nextPrompt() after processing
            } else {
                nextPrompt();
            }
        }
    }, 1000);
}

function nextPrompt() {
    // Prevent double-processing
    if (isProcessingNext) {
        return;
    }
    
    isProcessingNext = true;
    
    const game = gameData[currentGame];
    const prompts = window.currentPrompts || game.prompts;
    
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    // Store the current prompt index before incrementing
    const currentPromptForEvaluation = currentPromptIndex;
    
    currentPromptIndex++;
    gameResults.completed++;
    
    if (currentPromptIndex >= prompts.length) {
        // Game finished, show feedback
        showFeedback();
    } else {
        // Update prompt and restart timer
        document.getElementById('game-prompt').textContent = prompts[currentPromptIndex];
        document.querySelector('.progress-indicator').textContent = `${currentPromptIndex + 1} / ${prompts.length}`;
        
        // Reset timer display
        const timerInner = document.getElementById('timer-inner');
        const timerCircle = document.getElementById('timer-circle');
        timerInner.textContent = currentTimer;
        timerCircle.style.background = `conic-gradient(#FBBF24 0deg, #334155 0deg)`;
        
        // Reset microphone UI
        updateRecordingUI(false);
        
        // Reset transcription
        const transcriptionDiv = document.getElementById('live-transcription');
        if (transcriptionDiv) {
            transcriptionDiv.innerHTML = '<div class="transcription-placeholder">Start speaking...</div>';
            transcriptionDiv.classList.remove('listening');
        }
        
        // Reset processing flag and start next session
        isProcessingNext = false;
        startGameSession();
    }
}

// Speech recognition functions
function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported');
        return false;
    }
    
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();
        
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = 'en-US';
        speechRecognition.maxAlternatives = 1;
        
        speechRecognition.onstart = function() {
            console.log('Speech recognition started');
            isListening = true;
            updateTranscriptionUI(true);
        };
        
        speechRecognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';
            
            // Track first speech time
            if (!firstSpeechTime && (finalTranscript || interimTranscript)) {
                firstSpeechTime = Date.now();
                console.log(`[Speech] First speech detected at ${firstSpeechTime - promptStartTime}ms`);
            }
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            updateTranscriptionDisplay(finalTranscript, interimTranscript);
        };
        
        speechRecognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific error types
            switch(event.error) {
                case 'network':
                    console.log('Network error - speech recognition may not work without internet');
                    updateTranscriptionDisplay('', '', 'Network error - check internet connection');
                    showManualTranscriptionFallback();
                    break;
                case 'not-allowed':
                    console.log('Microphone access denied');
                    updateTranscriptionDisplay('', '', 'Microphone access denied');
                    showManualTranscriptionFallback();
                    break;
                case 'no-speech':
                    console.log('No speech detected');
                    break;
                case 'audio-capture':
                    console.log('Audio capture error');
                    updateTranscriptionDisplay('', '', 'Audio capture error');
                    showManualTranscriptionFallback();
                    break;
                default:
                    console.log('Speech recognition error:', event.error);
                    updateTranscriptionDisplay('', '', 'Speech recognition error');
                    showManualTranscriptionFallback();
            }
            
            updateTranscriptionUI(false);
        };
        
        speechRecognition.onend = function() {
            console.log('Speech recognition ended');
            isListening = false;
            updateTranscriptionUI(false);
        };
        
        return true;
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        return false;
    }
}

function updateTranscriptionDisplay(final, interim, errorMessage = null) {
    const transcriptionDiv = document.getElementById('live-transcription');
    const placeholder = transcriptionDiv.querySelector('.transcription-placeholder');
    
    if (errorMessage) {
        // Show error message
        transcriptionDiv.innerHTML = `<div class="error-message">${errorMessage}</div>`;
        transcriptionDiv.classList.add('error');
        return;
    }
    
    // Remove error styling if it exists
    transcriptionDiv.classList.remove('error');
    
    if (final || interim) {
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        let displayText = final;
        if (interim) {
            displayText += '<span class="interim-text">' + interim + '</span>';
        }
        
        transcriptionDiv.innerHTML = displayText;
    } else {
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
}

function updateTranscriptionUI(listening) {
    const transcriptionDiv = document.getElementById('live-transcription');
    if (listening) {
        transcriptionDiv.classList.add('listening');
    } else {
        transcriptionDiv.classList.remove('listening');
    }
}

function startSpeechRecognition() {
    if (!speechRecognition) {
        console.log('Speech recognition not initialized');
        return false;
    }
    
    if (isListening) {
        console.log('Speech recognition already listening');
        return true;
    }
    
    try {
        speechRecognition.start();
        return true;
    } catch (error) {
        console.error('Error starting speech recognition:', error);
        updateTranscriptionDisplay('', '', 'Failed to start speech recognition');
        return false;
    }
}

function stopSpeechRecognition() {
    if (speechRecognition && isListening) {
        try {
            speechRecognition.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }
}

function showManualTranscriptionFallback() {
    const liveTranscription = document.getElementById('live-transcription');
    const manualTranscription = document.getElementById('manual-transcription');
    
    if (liveTranscription) {
        liveTranscription.style.display = 'none';
    }
    if (manualTranscription) {
        manualTranscription.style.display = 'block';
    }
}

// Audio recording and API functions
async function initializeAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            await evaluateAudio(audioBlob);
        };
        
        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Please allow microphone access to play the game.');
        return false;
    }
}

async function startRecording() {
    if (!mediaRecorder) {
        const success = await initializeAudioRecording();
        if (!success) return;
    }
    
    audioChunks = [];
    recordingStartTime = Date.now();
    mediaRecorder.start();
    isRecording = true;
    updateRecordingUI(true);
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        updateRecordingUI(false);
    }
    
    // Stop speech recognition
    stopSpeechRecognition();
    
    // For rapid-fire game, automatically move to next prompt when recording stops
    if (currentGame === 'rapid-fire') {
        // Small delay to ensure audio processing completes
        setTimeout(() => {
            nextPrompt();
        }, 500);
    } else {
        // Reset processing flag for non-rapid-fire games
        isProcessingNext = false;
    }
}

function updateRecordingUI(recording) {
    const micIcon = document.querySelector('.microphone-icon');
    const micText = document.querySelector('.microphone-section p');
    
    if (recording) {
        micIcon.textContent = '🔴';
        micIcon.style.color = '#F87171';
        micText.textContent = 'Recording & Listening... Speak now!';
    } else {
        micIcon.textContent = '🎤';
        micIcon.style.color = '#94A3B8';
        micText.textContent = 'Processing...';
    }
}

async function evaluateAudio(audioBlob) {
    try {
        // Use the correct prompt index (the one that was just recorded)
        const promptIndexForEvaluation = currentPromptIndex;
        const promptForEvaluation = window.currentPrompts[promptIndexForEvaluation];
        
        // Calculate timing data
        const totalTime = (Date.now() - promptStartTime) / 1000; // Total time in seconds
        const responseTime = firstSpeechTime ? (firstSpeechTime - promptStartTime) / 1000 : 0; // Response time in seconds
        
        console.log(`[evaluateAudio] Sending evaluation for prompt ${promptIndexForEvaluation + 1}: "${promptForEvaluation}"`);
        console.log(`[evaluateAudio] Timing - Response: ${responseTime}s, Total: ${totalTime}s`);
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('seconds', currentTimer);
        formData.append('difficulty', selectedDifficulty);
        formData.append('prompt', promptForEvaluation);
        formData.append('promptIndex', promptIndexForEvaluation + 1);
        formData.append('totalPrompts', window.currentPrompts.length);
        formData.append('sessionId', sessionId);
        formData.append('responseTime', responseTime);
        formData.append('totalTime', totalTime);
        
        // Add user ID if available
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                formData.append('userId', userData.id);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
        
        const response = await fetch('/api/v1/games/rapid-fire/evaluate', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to queue evaluation');
        }
        
        const result = await response.json();
        console.log(`[evaluateAudio] Evaluation queued for prompt ${promptIndexForEvaluation + 1}:`, result);
        
        // Don't show feedback immediately - continue to next prompt
        // The feedback will be shown later in the analysis page
        
    } catch (error) {
        console.error(`[evaluateAudio] Error queuing evaluation for prompt ${currentPromptIndex + 1}:`, error);
        // Continue to next prompt even if evaluation fails
    }
}

// Removed showEvaluationFeedback and continueToNext functions since we're not showing immediate feedback

function showFeedback() {
    // Store session ID for analysis page
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('currentGame', currentGame);
    sessionStorage.setItem('totalPrompts', selectedPromptCount);
    sessionStorage.setItem('difficulty', selectedDifficulty);
    
    // Navigate to analysis page
    window.location.href = 'analysis.html';
}
