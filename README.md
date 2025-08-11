# Oratora - AI-Powered Public Speaking Training Platform

A comprehensive web-based platform that transforms public speaking practice into an engaging, gamified experience with AI-powered coaching feedback. Oratora features three distinct training games, real-time speech analysis, progress tracking, and detailed analytics.

## 🎯 Features

### 🎮 Three Training Games
- **Rapid Fire Analogies**: Quick thinking and speech delivery with analogy challenges
- **The Conductor**: Voice modulation training with real-time energy changes and breath recovery
- **Triple Step**: Word integration challenge while maintaining topic coherence

### 🤖 AI-Powered Evaluation
- **Google Gemini AI Integration**: Advanced speech analysis and feedback
- **Multi-dimensional Scoring**: Response rate, pace, energy, word integration, coherence
- **Real-time Audio Processing**: Live transcription and analysis
- **Detailed Feedback**: Specific, actionable coaching recommendations

### 📊 Progress Tracking & Analytics
- **User Authentication**: Secure login and profile management
- **Session History**: Complete record of all training sessions
- **Skill Analytics**: Detailed breakdown of improvement across different skills
- **Achievement System**: Gamified progress tracking
- **Performance Trends**: Visual representation of skill development

### 🎤 Advanced Speech Processing
- **Real-time Transcription**: Web Speech API integration
- **Audio Recording**: High-quality speech capture
- **Voice Analysis**: Volume, pitch, pace, and energy detection
- **Word Integration Tracking**: Real-time word detection and scoring

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Google Gemini API key
- Supabase account and project

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/Madan2248c/surveysparrow.git
cd surveysparrow
```

2. **Install backend dependencies**:
```bash
cd backend
npm install
```

3. **Set up environment variables**:
Create a `.env` file in the backend directory:
```bash
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase Database**:
   - Create a new Supabase project
   - Set up the required tables (users, game_sessions, user_game_stats)
   - Configure authentication settings

5. **Start the server**:
```bash
node app.js
```

6. **Access the application**:
Open your browser and navigate to `http://localhost:3000`

## 🎮 How to Play

### Rapid Fire Analogies
1. **Select difficulty**: Easy, Medium, or Hard
2. **Choose prompts**: 3-10 analogy challenges
3. **Set timer**: 2-5 seconds per response
4. **Speak quickly**: Create analogies within the time limit
5. **Get feedback**: AI evaluates response rate, pace, and energy

### The Conductor
1. **Choose topic**: Select from prompts or create custom
2. **Set duration**: 30-120 seconds
3. **Follow energy changes**: Adapt voice to random energy levels (1-9)
4. **Use breath moments**: Take recovery breaks when prompted
5. **Maintain flow**: Keep speaking despite energy variations

### Triple Step
1. **Select topic**: Choose a speech topic
2. **Integrate words**: Smoothly incorporate random words into your speech
3. **Maintain coherence**: Keep your message clear despite distractions
4. **Complete challenge**: Integrate all words within time limit
5. **Review performance**: Get detailed analysis of integration success

## 🏗️ Technical Architecture

### Frontend
- **Vanilla JavaScript**: Modern ES6+ features
- **HTML5 & CSS3**: Responsive design with animations
- **Web APIs**: Speech Recognition, Audio Recording, File Upload
- **Real-time Updates**: Polling and WebSocket-like communication

### Backend
- **Node.js & Express**: RESTful API server
- **Google Gemini AI**: Advanced speech evaluation
- **Supabase**: Database and authentication
- **Multer**: File upload handling
- **Audio Processing**: Real-time audio analysis

### Database Schema
- **Users**: Authentication and profile data
- **Game Sessions**: Complete session records with evaluations
- **User Game Stats**: Aggregated performance metrics
- **Analytics**: Progress tracking and skill development

## 📈 API Endpoints

### Game Evaluation
- `POST /api/v1/games/rapid-fire/evaluate` - Rapid Fire speech analysis
- `POST /api/v1/games/conductor/start` - Start Conductor session
- `POST /api/v1/games/conductor/energy-change` - Record energy transitions
- `POST /api/v1/games/conductor/breath-moment` - Record breath recovery
- `POST /api/v1/games/conductor/end` - End Conductor session
- `POST /api/v1/games/triple-step/evaluate` - Triple Step evaluation

### Session Management
- `GET /api/v1/games/*/session/:sessionId` - Get session status
- `GET /api/v1/games/*/session-db/:dbSessionId` - Get session from database
- `GET /api/v1/games/*/audio/:sessionId` - Serve audio files

### User Management
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/users/:userId/stats` - Get user statistics
- `GET /api/users/:userId/sessions` - Get user sessions

### Analytics
- `GET /api/analytics/:userId/progress` - Progress analytics
- `GET /api/analytics/:userId/skills` - Skill breakdown
- `GET /api/analytics/:userId/achievements` - Achievement progress

## 🎯 Evaluation Criteria

### Rapid Fire
- **Response Rate**: Speed and consistency of responses
- **Pace & Flow**: Speaking rhythm and timing
- **Energy & Confidence**: Enthusiasm and confidence level

### The Conductor
- **Response Speed**: How quickly you adapt to energy changes
- **Energy Range**: Actual voice energy variation demonstrated
- **Content Continuity**: Topic adherence during energy changes
- **Breath Recovery**: Effectiveness of recovery moments

### Triple Step
- **Word Integration Success**: Successfully integrated words
- **Integration Smoothness**: Natural vs awkward word usage
- **Topic Coherence**: Maintaining message clarity
- **Recovery Strategies**: Handling difficult word integrations

## 🖥️ Browser Compatibility

- **Chrome** (recommended) - Full feature support
- **Firefox** - Full feature support
- **Safari** - Full feature support
- **Edge** - Full feature support

**Note**: Microphone access is required for all games to function.

## 🛠️ Development

### Project Structure
```
surveysparrow/
├── backend/                 # Node.js server
│   ├── controllers/         # Game and user controllers
│   ├── services/           # Database and AI services
│   └── app.js             # Express server setup
├── frontend/               # Web application
│   ├── assets/            # CSS, JS, and static files
│   ├── pages/             # HTML pages
│   └── index.html         # Main entry point
└── README.md              # This file
```

### Key Technologies
- **AI**: Google Gemini 2.5 Pro for speech evaluation
- **Database**: Supabase (PostgreSQL) for data persistence
- **Authentication**: Supabase Auth
- **Audio**: Web Audio API for recording and processing
- **Speech**: Web Speech API for real-time transcription

## 🤝 Contributing

We welcome contributions to make Oratora even better! Here's how you can help:

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all games work across different browsers
- Test with various audio input devices

### Areas for Contribution
- **New Training Games**: Design additional speech training challenges
- **UI/UX Improvements**: Enhance the user interface and experience
- **Analytics Features**: Add more detailed progress tracking
- **Performance Optimization**: Improve audio processing and AI evaluation
- **Accessibility**: Make the platform more accessible to diverse users
- **Mobile Support**: Optimize for mobile devices

## 🐛 Troubleshooting

### Common Issues
- **Microphone not working**: Ensure browser permissions are granted
- **API errors**: Verify Gemini API key and Supabase credentials
- **Recording issues**: Check browser compatibility and permissions
- **Database errors**: Confirm Supabase connection and table setup

### Debug Endpoints
- `GET /api/v1/debug/state` - Rapid Fire session state
- `GET /api/v1/debug/conductor-state` - Conductor session state
- `GET /api/v1/debug/triple-step-state` - Triple Step session state

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for advanced speech evaluation capabilities
- **Supabase** for database and authentication infrastructure
- **Web Speech API** for real-time speech recognition
- **Web Audio API** for audio recording and processing

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review existing issues in the GitHub repository
3. Create a new issue with detailed information about your problem

---

**Oratora** - Transforming public speaking practice through AI-powered gamification and real-time feedback.
