require('dotenv').config();
const express = require('express');
const multer = require('multer');
const gameController = require('./gameController');
const conductorController = require('./conductorController');
const tripleStepController = require('./tripleStepController');
const userController = require('./userController');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend directory
app.use(express.static('../frontend'));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../frontend' });
});

// Route for setup page
app.get('/setup', (req, res) => {
  res.sendFile('setup.html', { root: '../frontend' });
});

// Route for game page
app.get('/game', (req, res) => {
  res.sendFile('game.html', { root: '../frontend' });
});

// Route for feedback page
app.get('/feedback', (req, res) => {
  res.sendFile('feedback.html', { root: '../frontend' });
});

// Route for analysis page
app.get('/analysis', (req, res) => {
  res.sendFile('analysis.html', { root: '../frontend' });
});

// Route for conductor page
app.get('/conductor', (req, res) => {
  res.sendFile('conductor.html', { root: '../frontend' });
});

// Route for conductor analysis page
app.get('/conductor-analysis', (req, res) => {
  res.sendFile('conductor-analysis.html', { root: '../frontend' });
});

// Route for triple step page
app.get('/triple-step', (req, res) => {
  res.sendFile('triple-step.html', { root: '../frontend' });
});

// Route for login page
app.get('/login', (req, res) => {
  res.sendFile('login.html', { root: '../frontend' });
});

// Route for signup page
app.get('/signup', (req, res) => {
  res.sendFile('signup.html', { root: '../frontend' });
});

// Route for profile page
app.get('/profile', (req, res) => {
  res.sendFile('profile.html', { root: '../frontend' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rapid Fire Game API routes
app.post('/api/v1/games/rapid-fire/evaluate', upload.single('audio'), gameController.evaluateRapidFire);
app.get('/api/v1/games/rapid-fire/session/:sessionId', gameController.getSessionStatus);
app.get('/api/v1/games/rapid-fire/session-db/:dbSessionId', gameController.getSessionStatusFromDb);
app.get('/api/v1/audio/:sessionId/:promptIndex', gameController.serveAudioFile); // Audio file endpoint
app.get('/api/v1/debug/state', gameController.debugState); // Debug endpoint

// Conductor Game API routes (bind to preserve `this` context)
app.post('/api/v1/games/conductor/start', conductorController.startConductorSession.bind(conductorController));
app.post('/api/v1/games/conductor/energy-change', conductorController.recordEnergyChange.bind(conductorController));
app.post('/api/v1/games/conductor/breath-moment', conductorController.recordBreathMoment.bind(conductorController));
app.post('/api/v1/games/conductor/end', upload.single('audio'), conductorController.endConductorSession.bind(conductorController));
app.get('/api/v1/games/conductor/session/:sessionId', conductorController.getConductorSessionStatus.bind(conductorController));
app.get('/api/v1/games/conductor/session-db/:dbSessionId', conductorController.getConductorSessionStatusFromDb.bind(conductorController));
app.get('/api/v1/games/conductor/audio/:sessionId', conductorController.serveConductorAudio.bind(conductorController)); // Audio file endpoint
app.get('/api/v1/debug/conductor-state', conductorController.debugConductorState.bind(conductorController)); // Debug endpoint

// Triple Step Game API routes
app.post('/api/v1/games/triple-step/evaluate', upload.single('audio'), tripleStepController.evaluateTripleStep);
app.get('/api/v1/games/triple-step/session/:sessionId', tripleStepController.getTripleStepSessionStatus);
app.get('/api/v1/games/triple-step/session-db/:dbSessionId', tripleStepController.getTripleStepSessionStatusFromDb);
app.get('/api/v1/games/triple-step/audio/:sessionId', tripleStepController.serveTripleStepAudioFile); // Audio file endpoint
app.get('/api/v1/debug/triple-step-state', tripleStepController.debugTripleStepState); // Debug endpoint

// User routes
app.post('/api/auth/signup', userController.signup.bind(userController));
app.post('/api/auth/login', userController.login.bind(userController));
app.post('/api/users', userController.createUser.bind(userController));
app.get('/api/users/:userId/stats', userController.getUserStats.bind(userController));
app.get('/api/users/:userId/sessions', userController.getUserSessions.bind(userController));
app.get('/api/users/:userId/profile', userController.getUserProfile.bind(userController));

// Update existing conductor routes
app.post('/api/conductor/start-session', conductorController.startSession.bind(conductorController));
app.post('/api/conductor/complete-session', conductorController.completeSession.bind(conductorController));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;