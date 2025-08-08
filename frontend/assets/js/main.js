// Game data
const gameData = {
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
            easy: {
                name: 'Easy',
                description: 'Simple, everyday analogies'
            },
            medium: {
                name: 'Medium', 
                description: 'Moderate complexity analogies'
            },
            hard: {
                name: 'Hard',
                description: 'Complex, abstract analogies'
            }
        },
        prompts: {
            easy: [
                'Compare a computer to a human brain',
                'How is a book like a journey?',
                'Explain friendship using weather',
                'What does a tree have in common with a family?',
                'Compare learning to building a house',
                'How is music like emotions?',
                'Explain time using a river',
                'What does a car have in common with life?',
                'Compare a teacher to a gardener',
                'How is love like a flame?'
            ],
            medium: [
                'Explain success using a mountain',
                'What does a phone have in common with a bridge?',
                'Compare a child to a seed',
                'How is memory like a library?',
                'Explain change using seasons',
                'What does a mirror have in common with truth?',
                'Compare a leader to a captain',
                'How is creativity like a storm?',
                'Explain growth using a butterfly',
                'What does a clock have in common with life?'
            ],
            hard: [
                'Compare democracy to a garden ecosystem',
                'How is consciousness like quantum physics?',
                'Explain artificial intelligence using evolution',
                'What does a black hole have in common with creativity?',
                'Compare time to a river flowing backwards',
                'How is language like a living organism?',
                'Explain consciousness using a computer network',
                'What does infinity have in common with human potential?',
                'Compare the internet to a neural network',
                'How is wisdom like a fractal pattern?'
            ]
        }
    },
    'conductor': {
        title: 'The Conductor',
        instructions: 'Practice your pacing and rhythm. Speak with varying speeds and pauses to engage your audience.',
        minTimer: 30,
        maxTimer: 120,
        defaultTimer: 60,
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
        instructions: 'Structure your response in three parts: introduction, development, and conclusion. Build compelling narratives.',
        minTimer: 45,
        maxTimer: 180,
        defaultTimer: 90,
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

// Navigation function
function navigateToSetup(gameType) {
    // Store game type in session storage for other pages to access
    sessionStorage.setItem('currentGame', gameType);
    sessionStorage.setItem('currentTimer', gameData[gameType].defaultTimer);
    sessionStorage.setItem('selectedDifficulty', 'medium');
    sessionStorage.setItem('selectedPromptCount', gameData[gameType].defaultPrompts || 5);
    
    // Navigate to appropriate page based on game type
    if (gameType === 'conductor') {
        window.location.href = 'conductor.html';
    } else {
        window.location.href = `setup.html?game=${gameType}`;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Oratora - Public Speaking Training Platform loaded!');
});
