# Oratora - Rapid Fire Speech Training

A web-based public speaking training platform that uses AI to evaluate your speech delivery in real-time.

## Features

- **Rapid Fire Analogies**: Practice quick thinking and speech delivery with analogy challenges
- **AI-Powered Evaluation**: Get instant feedback on your response rate, pace & flow, and energy & confidence
- **Real-time Audio Recording**: Your speech is recorded and analyzed using Google's Gemini AI
- **Beautiful UI**: Modern, responsive design with smooth animations

## Setup

### Prerequisites

- Node.js (v14 or higher)
- A Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd surveysparrow
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## How to Play

1. **Select Rapid Fire Analogies** from the game selection screen
2. **Choose difficulty level**: Easy, Medium, or Hard
3. **Select number of prompts** (3-10 prompts)
4. **Set your timer duration** (2-5 seconds per prompt)
5. **Click "Ready to Start"** to begin
6. **Allow microphone access** when prompted
7. **Read the analogy prompt** and start speaking immediately
8. **Your speech will be recorded** for the duration of the timer
9. **Get instant AI feedback** on your performance
10. **Continue to the next prompt** or review your overall performance

## Game Flow

1. **Setup Screen**: Choose difficulty level, number of prompts, and timer duration
2. **Game Screen**: See prompts, timer, and recording status
3. **Evaluation Screen**: Get detailed feedback on your speech
4. **Final Summary**: Review your overall performance across all prompts

## Difficulty Levels

- **Easy**: Simple, everyday analogies perfect for beginners
- **Medium**: Moderate complexity analogies for intermediate speakers
- **Hard**: Complex, abstract analogies for advanced speakers

## Technical Details

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js
- **AI**: Google Gemini API for speech evaluation
- **Audio**: Web Audio API for recording
- **File Upload**: Multer for handling audio files

## API Endpoints

- `POST /api/v1/games/rapid-fire/evaluate` - Evaluates audio recording and returns speech analysis

## Evaluation Criteria

The AI evaluates your speech on three key metrics:

1. **Response Rate**: How quickly and consistently you speak when prompts are given
2. **Pace & Flow**: Your speaking speed and rhythm
3. **Energy & Confidence**: Your enthusiasm and confidence level

Each metric is scored from 1-10 with detailed feedback.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Note: Microphone access is required for the game to function.

## Troubleshooting

- **Microphone not working**: Ensure you've allowed microphone access in your browser
- **API errors**: Check that your Gemini API key is correctly set in the `.env` file
- **Recording issues**: Try refreshing the page and allowing microphone access again

## Future Enhancements

- Additional speech training games
- Progress tracking and statistics
- Custom prompt creation
- Social sharing of results
- Advanced analytics dashboard
