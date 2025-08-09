// Setup page state
let currentGame = '';
let currentTimer = 30;
let selectedDifficulty = 'medium';
let selectedPromptCount = 5;
let selectedWordInterval = 30;
let gameData = {};

// Make functions globally available
window.selectDifficulty = function(difficulty) {
    selectedDifficulty = difficulty;
    sessionStorage.setItem('selectedDifficulty', difficulty);
    
    // Update values based on difficulty
    const game = gameData[currentGame];
    if (game.difficulties && game.difficulties[difficulty]) {
        const difficultyData = game.difficulties[difficulty];
        selectedPromptCount = difficultyData.wordCount || difficultyData.promptCount || 5;
        selectedWordInterval = difficultyData.interval || 30;
        
        // Update session storage
        sessionStorage.setItem('selectedPromptCount', selectedPromptCount);
        sessionStorage.setItem('selectedWordInterval', selectedWordInterval);
        
        // Update UI displays
        if (currentGame === 'triple-step') {
            document.querySelector('.prompt-count-value').textContent = `${selectedPromptCount} words`;
            document.querySelector('.word-interval-value').textContent = `${selectedWordInterval} seconds between words`;
        } else if (currentGame === 'rapid-fire') {
            document.querySelector('.prompt-count-value').textContent = `${selectedPromptCount} prompts`;
        }
    }
    
    // Update UI
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.difficulty-option').classList.add('selected');
};

// These functions are no longer needed since values are set by difficulty selection

window.updateTimer = function(value) {
    currentTimer = parseInt(value);
    sessionStorage.setItem('currentTimer', currentTimer);
    document.querySelector('.timer-value').textContent = `${currentTimer} seconds`;
};

window.startGame = function() {
    // Store additional settings for triple-step game
    if (currentGame === 'triple-step') {
        sessionStorage.setItem('selectedWordInterval', selectedWordInterval);
    }
    
    // Navigate to game page
    if (currentGame === 'triple-step') {
        window.location.href = 'triple-step.html';
    } else {
        window.location.href = `game.html?game=${currentGame}`;
    }
};

// Initialize setup page
document.addEventListener('DOMContentLoaded', function() {
    // Get game type from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentGame = urlParams.get('game');
    
    if (!currentGame) {
        window.location.href = 'index.html';
        return;
    }
    
    // Load game data from main.js
    loadGameData();
    
    // Initialize state from session storage or defaults
    currentTimer = parseInt(sessionStorage.getItem('currentTimer')) || gameData[currentGame].defaultTimer;
    selectedDifficulty = sessionStorage.getItem('selectedDifficulty') || 'medium';
    
    // Set values based on difficulty level
    const difficultyData = gameData[currentGame].difficulties?.[selectedDifficulty];
    if (difficultyData) {
        selectedPromptCount = difficultyData.wordCount || difficultyData.promptCount || 5;
        selectedWordInterval = difficultyData.interval || 30;
    } else {
        selectedPromptCount = parseInt(sessionStorage.getItem('selectedPromptCount')) || gameData[currentGame].defaultPrompts || gameData[currentGame].defaultWords || 5;
        selectedWordInterval = parseInt(sessionStorage.getItem('selectedWordInterval')) || gameData[currentGame].defaultInterval || 30;
    }
    
    // Create setup screen
    createSetupScreen();
});

function loadGameData() {
    // This would normally be loaded from main.js, but for modularity we'll define it here
    gameData = {
        'rapid-fire': {
            title: 'Rapid Fire Analogies',
            instructions: 'You\'ll be given random concepts. Create analogies quickly to connect them. Think fast and be creative! Your speech will be evaluated for response rate, pace & flow, and energy & confidence.',
            minTimer: 2,
            maxTimer: 5,
            defaultTimer: 3,
            minPrompts: 3,
            maxPrompts: 10,
            defaultPrompts: 5,
            difficulties: {
                easy: { name: 'Easy', description: 'Simple, everyday analogies' },
                medium: { name: 'Medium', description: 'Moderate complexity analogies' },
                hard: { name: 'Hard', description: 'Complex, abstract analogies' }
            }
        },
        'conductor': {
            title: 'The Conductor',
            instructions: 'Practice your pacing and rhythm. Speak with varying speeds and pauses to engage your audience.',
            minTimer: 30,
            maxTimer: 120,
            defaultTimer: 60
        },
        'triple-step': {
            title: 'Triple Step',
            instructions: 'Give a speech on a topic while smoothly integrating random words that appear on screen. Maintain your message throughline despite distractions.',
            minTimer: 60,
            maxTimer: 300,
            defaultTimer: 150,
            minWords: 4,
            maxWords: 8,
            defaultWords: 6,
            minInterval: 20,
            maxInterval: 40,
            defaultInterval: 30,
            difficulties: {
                easy: {
                    name: 'Novice',
                    description: '4 easy words, 30-second intervals',
                    wordCount: 4,
                    interval: 30,
                    wordTypes: ['objects', 'emotions', 'places']
                },
                medium: {
                    name: 'Intermediate', 
                    description: '6 mixed words, 20-second intervals',
                    wordCount: 6,
                    interval: 20,
                    wordTypes: ['objects', 'emotions', 'places', 'actions']
                },
                hard: {
                    name: 'Advanced',
                    description: '8 abstract concepts, random timing',
                    wordCount: 8,
                    interval: 15,
                    wordTypes: ['objects', 'emotions', 'places', 'actions', 'concepts']
                }
            }
        }
    };
}

function createSetupScreen() {
    const game = gameData[currentGame];
    
    let setupHTML = `
        <div class="setup-screen">
            <div class="setup-header">
                <h1 class="setup-title">${game.title}</h1>
                <p class="setup-instructions">${game.instructions}</p>
            </div>
    `;
    
    // Add difficulty selection for rapid-fire and triple-step games
    if (currentGame === 'rapid-fire' || currentGame === 'triple-step') {
        setupHTML += `
            <div class="difficulty-section">
                <label class="difficulty-label">Select Difficulty Level</label>
                <div class="difficulty-options">
        `;
        
        Object.entries(game.difficulties).forEach(([key, difficulty]) => {
            const isSelected = key === selectedDifficulty ? 'selected' : '';
            setupHTML += `
                <div class="difficulty-option ${isSelected}" onclick="selectDifficulty('${key}')">
                    <div class="difficulty-name">${difficulty.name}</div>
                    <div class="difficulty-description">${difficulty.description}</div>
                </div>
            `;
        });
        
        setupHTML += `
                </div>
            </div>
            
            <div class="prompt-count-section">
                <label class="prompt-count-label">${currentGame === 'rapid-fire' ? 'Number of Prompts' : 'Number of Words'}</label>
                <div class="prompt-count-value">${selectedPromptCount} ${currentGame === 'rapid-fire' ? 'prompts' : 'words'}</div>
            </div>
        `;
        
        // Add word interval display for triple-step game
        if (currentGame === 'triple-step') {
            setupHTML += `
            <div class="word-interval-section">
                <label class="word-interval-label">Word Interval</label>
                <div class="word-interval-value">${selectedWordInterval} seconds between words</div>
            </div>
        `;
    }
    
    setupHTML += `
            <div class="timer-section">
                <label class="timer-label">Set Timer Duration</label>
                <input type="range" 
                       class="timer-slider" 
                       min="${game.minTimer}" 
                       max="${game.maxTimer}" 
                       value="${currentTimer}"
                       oninput="updateTimer(this.value)">
                <div class="timer-value">${currentTimer} seconds</div>
            </div>
            
            <button class="ready-btn" onclick="startGame()">Ready to Start</button>
        </div>
    `;
    
    document.querySelector('.container').innerHTML = setupHTML;
}

}