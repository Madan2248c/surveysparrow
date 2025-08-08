# Oratora Frontend - Modular Structure

This is the frontend application for Oratora, a public speaking training platform. The code has been modularized into separate files and folders following industry standards.

## 📁 Project Structure

```
frontend/
├── index.html              # Home page
├── setup.html              # Game setup page
├── game.html               # Game play page
├── feedback.html           # Results page
├── README.md               # This file
├── assets/
│   ├── css/
│   │   ├── main.css        # Base styles and home page
│   │   ├── setup.css       # Setup page styles
│   │   ├── game.css        # Game page styles
│   │   └── feedback.css    # Feedback page styles
│   └── js/
│       ├── main.js         # Home page logic and game data
│       ├── setup.js        # Setup page logic
│       ├── game.js         # Game logic and audio recording
│       └── feedback.js     # Feedback page logic
```

## 🎯 Features

### **Rapid Fire Analogies**
- **Difficulty Levels**: Easy, Medium, Hard
- **Customizable Prompts**: 3-10 prompts
- **Timer Range**: 2-5 seconds (rapid-fire)
- **AI Evaluation**: Real-time speech analysis

### **The Conductor**
- **Pacing Practice**: Varying speeds and pauses
- **Timer Range**: 30-120 seconds
- **20 Unique Prompts**: Focus on rhythm and engagement

### **Triple Step**
- **Structured Responses**: Introduction, Development, Conclusion
- **Timer Range**: 45-180 seconds
- **20 Thought-Provoking Prompts**: Build compelling narratives

## 🚀 Getting Started

1. **Start the backend server** (from the backend directory):
   ```bash
   cd backend
   npm start
   ```

2. **Access the application**:
   - Open your browser to `http://localhost:3000`
   - The home page will load automatically

## 📱 Page Flow

1. **Home Page** (`index.html`)
   - Game selection cards
   - Navigation to setup pages

2. **Setup Page** (`setup.html`)
   - Difficulty selection (Rapid Fire only)
   - Prompt count selection (Rapid Fire only)
   - Timer configuration
   - Game start button

3. **Game Page** (`game.html`)
   - Prompt display
   - Circular timer
   - Audio recording (Rapid Fire)
   - Progress tracking
   - Real-time evaluation (Rapid Fire)

4. **Feedback Page** (`feedback.html`)
   - Game completion summary
   - Performance statistics
   - AI evaluation results (Rapid Fire)
   - Restart/Next game options

## 🎨 Styling Architecture

### **CSS Organization**
- **`main.css`**: Base styles, typography, layout, animations
- **`setup.css`**: Difficulty selection, sliders, setup forms
- **`game.css`**: Timer, microphone, game interface
- **`feedback.css`**: Results display, evaluation cards

### **Design System**
- **Colors**: Dark theme with gradient accents
- **Typography**: Poppins font family
- **Animations**: Smooth transitions and micro-interactions
- **Responsive**: Mobile-first design approach

## 🔧 Technical Implementation

### **State Management**
- **Session Storage**: Game settings and results persistence
- **URL Parameters**: Game type and navigation
- **Modular Data**: Each page loads its own game data

### **Audio Recording**
- **Web Audio API**: Real-time microphone access
- **MediaRecorder**: Audio capture and processing
- **FormData**: Audio file upload to backend

### **API Integration**
- **RESTful Endpoints**: Backend communication
- **Error Handling**: Graceful fallbacks
- **Loading States**: User feedback during processing

## 📱 Responsive Design

### **Breakpoints**
- **Desktop**: 1200px+ (full layout)
- **Tablet**: 768px-1199px (adjusted grid)
- **Mobile**: 320px-767px (single column)

### **Touch Optimization**
- **Larger Touch Targets**: 44px minimum
- **Gesture Support**: Swipe and tap interactions
- **Mobile-First**: Optimized for small screens

## 🔄 Navigation Flow

```
Home Page
    ↓
Setup Page (with game parameters)
    ↓
Game Page (with audio recording)
    ↓
Feedback Page (with results)
    ↓
Back to Home or Restart
```

## 🛠 Development

### **Adding New Games**
1. Add game data to `main.js`
2. Create game-specific prompts
3. Update setup page logic in `setup.js`
4. Add game logic to `game.js`
5. Update feedback display in `feedback.js`

### **Styling New Components**
1. Add styles to appropriate CSS file
2. Follow existing naming conventions
3. Include responsive breakpoints
4. Test across different screen sizes

### **Modifying Game Logic**
1. Update relevant JavaScript file
2. Maintain session storage consistency
3. Test navigation flow
4. Verify audio recording (if applicable)

## 🎯 Best Practices

### **Code Organization**
- **Single Responsibility**: Each file has one clear purpose
- **Modular Design**: Reusable components and functions
- **Consistent Naming**: Clear, descriptive file and function names
- **Documentation**: Inline comments for complex logic

### **Performance**
- **Lazy Loading**: CSS and JS loaded only when needed
- **Minimal Dependencies**: Vanilla JavaScript, no frameworks
- **Optimized Assets**: Compressed images and efficient code
- **Caching**: Session storage for better UX

### **Accessibility**
- **Semantic HTML**: Proper heading structure
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant color ratios

## 🚀 Future Enhancements

- **Progress Tracking**: User statistics and history
- **Custom Prompts**: User-generated content
- **Social Features**: Share results and challenges
- **Advanced Analytics**: Detailed performance insights
- **Multiplayer Mode**: Competitive speaking challenges
- **Voice Commands**: Hands-free navigation
- **Offline Support**: Progressive Web App features

## 📄 License

This project is part of the Oratora public speaking training platform.
