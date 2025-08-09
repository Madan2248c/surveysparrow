# Triple Step Game - Oratora

## Overview
The Triple Step game is designed to develop your focus on a "throughline" or message, even when bombarded with distractions. It simulates real-world conditions where unexpected questions, comments, or tech hiccups might interrupt your speech.

## Game Mechanics

### How It Works
1. **Main Topic**: You'll be given a speaking topic to focus on
2. **Random Words**: Random, unrelated words will appear on screen at regular intervals
3. **Integration Challenge**: You must smoothly integrate each word into your ongoing speech within 5 seconds
4. **Throughline Maintenance**: Keep your main topic as the central message despite distractions

### Game Flow

#### 1. Setup Screen
- Select difficulty level (Novice, Intermediate, Advanced)
- Choose number of words (4-8)
- Set word interval timing (20-40 seconds)
- Set total speech time (60-300 seconds)

#### 2. Active Game Screen
- **Main Topic**: Displayed prominently at the top
- **Random Word**: Appears mid-screen with animated entry
- **Integration Timer**: 5-second countdown to integrate the word
- **Word Counter**: Shows progress (e.g., "2/6 words integrated")
- **Speech Timer**: Total time remaining
- **Live Transcription**: Your speech appears in real-time

#### 3. Post-Game Feedback
- Integration success rate
- List of successfully integrated words
- List of missed words
- Your complete speech transcript
- Performance tips and suggestions

## Difficulty Levels

### Novice
- 4 easy words
- 30-second intervals
- Word types: Objects, Emotions, Places

### Intermediate
- 6 mixed words
- 20-second intervals
- Word types: Objects, Emotions, Places, Actions

### Advanced
- 8 abstract concepts
- 15-second intervals
- Word types: Objects, Emotions, Places, Actions, Concepts

## Word Categories

### Objects
pumpkin, microwave, umbrella, laptop, coffee, book, phone, chair, window, car, tree, flower, clock, mirror, table, lamp, door, key, pen, paper

### Emotions
joy, nostalgia, excitement, curiosity, confidence, wonder, gratitude, hope, courage, peace, enthusiasm, serenity, determination, inspiration, contentment, passion, optimism, empathy, resilience, clarity

### Places
kitchen, beach, mountain, library, park, office, garden, museum, airport, hospital, school, restaurant, theater, gym, market, church, hotel, station, bridge, forest

### Actions
dance, create, explore, build, learn, share, dream, grow, connect, discover, inspire, transform, celebrate, reflect, achieve, support, innovate, adapt, collaborate, persevere

### Concepts
freedom, wisdom, beauty, truth, justice, love, faith, hope, courage, integrity, excellence, harmony, balance, progress, tradition, innovation, community, individuality, responsibility, potential

## Speaking Topics
The game includes 20 diverse topics such as:
- Innovation in technology
- The importance of education
- Building strong relationships
- Environmental conservation
- Personal growth and development
- The power of communication
- Leadership in modern times
- And many more...

## Evaluation Criteria

### Primary
- Successfully spoke the random words within time limit

### Secondary
- How smoothly they integrated vs. awkward forced insertion

### Tertiary
- Whether they maintained main topic coherence

### Recovery
- How they handled words they couldn't integrate well

## Tips for Success

1. **Stay Confident**: Keep speaking even if you miss a word
2. **Maintain Throughline**: Don't let random words derail your main message
3. **Be Flexible**: Find creative ways to connect words to your topic
4. **Practice Regularly**: Try different topics and difficulty levels
5. **Learn from Feedback**: Review your performance and apply tips

## Technical Features

- **Speech Recognition**: Real-time speech-to-text conversion
- **Manual Input Fallback**: Text input option if speech recognition unavailable
- **Responsive Design**: Works on desktop and mobile devices
- **Progress Tracking**: Visual indicators for word integration progress
- **Performance Analytics**: Detailed feedback and scoring system

## File Structure

```
frontend/
├── triple-step.html              # Main game page
├── assets/
│   ├── css/
│   │   └── triple-step.css       # Game-specific styles
│   └── js/
│       └── triple-step.js        # Game logic
└── TRIPLE_STEP_README.md         # This documentation
```

## Integration with Oratora Platform

The Triple Step game is fully integrated with the Oratora platform:
- Uses shared styling and components
- Follows platform navigation patterns
- Integrates with setup and feedback systems
- Shares session storage for game state management
