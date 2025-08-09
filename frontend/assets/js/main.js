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
        },
        topics: [
            'Innovation in technology',
            'The importance of education',
            'Building strong relationships',
            'Environmental conservation',
            'Personal growth and development',
            'The power of communication',
            'Leadership in modern times',
            'Creativity and problem-solving',
            'Health and wellness',
            'Community building',
            'The future of work',
            'Cultural diversity',
            'Mental health awareness',
            'Sustainable living',
            'Digital transformation',
            'The value of teamwork',
            'Adapting to change',
            'Social responsibility',
            'The art of learning',
            'Building confidence'
        ],
        wordBank: {
            objects: ['pumpkin', 'microwave', 'umbrella', 'laptop', 'coffee', 'book', 'phone', 'chair', 'window', 'car', 'tree', 'flower', 'clock', 'mirror', 'table', 'lamp', 'door', 'key', 'pen', 'paper'],
            emotions: ['joy', 'nostalgia', 'excitement', 'curiosity', 'confidence', 'wonder', 'gratitude', 'hope', 'courage', 'peace', 'enthusiasm', 'serenity', 'determination', 'inspiration', 'contentment', 'passion', 'optimism', 'empathy', 'resilience', 'clarity'],
            places: ['kitchen', 'beach', 'mountain', 'library', 'park', 'office', 'garden', 'museum', 'airport', 'hospital', 'school', 'restaurant', 'theater', 'gym', 'market', 'church', 'hotel', 'station', 'bridge', 'forest'],
            actions: ['dance', 'create', 'explore', 'build', 'learn', 'share', 'dream', 'grow', 'connect', 'discover', 'inspire', 'transform', 'celebrate', 'reflect', 'achieve', 'support', 'innovate', 'adapt', 'collaborate', 'persevere'],
            concepts: ['freedom', 'wisdom', 'beauty', 'truth', 'justice', 'love', 'faith', 'hope', 'courage', 'integrity', 'excellence', 'harmony', 'balance', 'progress', 'tradition', 'innovation', 'community', 'individuality', 'responsibility', 'potential']
        }
    }
};

// Navigation function
function navigateToSetup(gameType) {
    console.log('navigateToSetup called with:', gameType);
    
    // Store game type in session storage for other pages to access
    sessionStorage.setItem('currentGame', gameType);
    sessionStorage.setItem('currentTimer', gameData[gameType].defaultTimer);
    sessionStorage.setItem('selectedDifficulty', 'medium');
    sessionStorage.setItem('selectedPromptCount', gameData[gameType].defaultPrompts || gameData[gameType].defaultWords || 5);
    
    console.log('Navigating to setup page for:', gameType);
    
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
    console.log('Game data available:', Object.keys(gameData));
    console.log('navigateToSetup function available:', typeof navigateToSetup);
    
    // Add click event listeners as backup
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            console.log('Game card clicked via event listener');
        });
    });
    
    // Test function to verify JavaScript is working
    window.testNavigation = function() {
        console.log('Test navigation function called');
        alert('JavaScript is working!');
    };
});
