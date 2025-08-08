// Setup page state
let currentGame = '';
let currentTimer = 30;
let selectedDifficulty = 'medium';
let selectedPromptCount = 5;
let gameData = {};

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
    selectedPromptCount = parseInt(sessionStorage.getItem('selectedPromptCount')) || gameData[currentGame].defaultPrompts || 5;
    
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
            instructions: 'Structure your response in three parts: introduction, development, and conclusion. Build compelling narratives.',
            minTimer: 45,
            maxTimer: 180,
            defaultTimer: 90
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
    
    // Add difficulty selection for rapid-fire game
    if (currentGame === 'rapid-fire') {
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
                <label class="prompt-count-label">Number of Prompts</label>
                <input type="range" 
                       class="prompt-count-slider" 
                       min="${game.minPrompts}" 
                       max="${game.maxPrompts}" 
                       value="${selectedPromptCount}"
                       oninput="updatePromptCount(this.value)">
                <div class="prompt-count-value">${selectedPromptCount} prompts</div>
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

function selectDifficulty(difficulty) {
    selectedDifficulty = difficulty;
    sessionStorage.setItem('selectedDifficulty', difficulty);
    
    // Update UI
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.difficulty-option').classList.add('selected');
}

function updatePromptCount(value) {
    selectedPromptCount = parseInt(value);
    sessionStorage.setItem('selectedPromptCount', selectedPromptCount);
    document.querySelector('.prompt-count-value').textContent = `${selectedPromptCount} prompts`;
}

function updateTimer(value) {
    currentTimer = parseInt(value);
    sessionStorage.setItem('currentTimer', currentTimer);
    document.querySelector('.timer-value').textContent = `${currentTimer} seconds`;
}

function startGame() {
    // Navigate to game page
    window.location.href = `game.html?game=${currentGame}`;
}
