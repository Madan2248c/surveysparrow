const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const databaseService = require('./databaseService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Audio storage configuration
const AUDIO_STORAGE_DIR = path.join(__dirname, 'audio_storage');
const AUDIO_RETENTION_HOURS = 24;

// Ensure audio storage directory exists
if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
    fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
}

const evaluationSchema = {
  type: "object",
  properties: {
    responseRate: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10, or 0 for no speech." },
        feedback: { type: "string", description: "Brief, specific advice for response rate." },
      },
      required: ["score", "feedback"]
    },
    pace: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for pace and flow." },
        feedback: { type: "string", description: "Brief, specific advice for pace and flow." },
      },
      required: ["score", "feedback"]
    },
    energy: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for energy and confidence." },
        feedback: { type: "string", description: "Brief, specific advice for energy and confidence." },
      },
      required: ["score", "feedback"]
    },
  },
  required: ["responseRate", "pace", "energy"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: evaluationSchema,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// Queue for storing evaluation requests
const evaluationQueue = [];
let isProcessingQueue = false;

// Game sessions storage
const gameSessions = new Map();

const evaluateRapidFire = async (req, res) => {
  try {
    const { seconds, difficulty, prompt: userPrompt, promptIndex, totalPrompts, sessionId, responseTime, totalTime, userId } = req.body;
    const audioFile = req.file;

    console.log(`[evaluateRapidFire] Received request for session: ${sessionId}, prompt: ${promptIndex}/${totalPrompts}`);

    if (!audioFile) {
      console.log(`[evaluateRapidFire] Error: No audio file provided for session ${sessionId}`);
      return res.status(400).json({ error: "Audio file is required." });
    }

    if (!sessionId) {
      console.log(`[evaluateRapidFire] Error: No session ID provided`);
      return res.status(400).json({ error: "Session ID is required." });
    }

    // Initialize session if it doesn't exist
    if (!gameSessions.has(sessionId)) {
      console.log(`[evaluateRapidFire] Creating new session: ${sessionId} with ${totalPrompts} total prompts`);
      
      // Create database session if userId is provided
      let dbSessionId = null;
      if (userId) {
        try {
          const sessionData = {
            user_id: userId,
            game_type: 'rapid-fire',
            topic: difficulty,
            duration: 0, // Will be updated when session completes
            energy_levels: [],
            session_data: {
              totalPrompts: parseInt(totalPrompts),
              difficulty: difficulty,
              evaluations: [],
              responseTimes: []
            },
            audio_files: [],
            completed: false
          };
          
          const dbSession = await databaseService.createGameSession(sessionData);
          dbSessionId = dbSession.id;
          console.log(`[evaluateRapidFire] Created database session: ${dbSessionId}`);
        } catch (error) {
          console.error(`[evaluateRapidFire] Error creating database session:`, error);
        }
      }
      
      gameSessions.set(sessionId, {
        evaluations: new Array(parseInt(totalPrompts)).fill(null),
        totalPrompts: parseInt(totalPrompts),
        completed: 0,
        status: 'in-progress',
        difficulty,
        createdAt: Date.now(),
        responseTimes: new Array(parseInt(totalPrompts)).fill(null),
        audioFiles: new Array(parseInt(totalPrompts)).fill(null),
        dbSessionId: dbSessionId,
        userId: userId
      });
    } else {
      console.log(`[evaluateRapidFire] Using existing session: ${sessionId}`);
    }

    const session = gameSessions.get(sessionId);
    console.log(`[evaluateRapidFire] Current session state - completed: ${session.completed}/${session.totalPrompts}, status: ${session.status}`);

    // Add evaluation request to queue
    const evaluationRequest = {
      sessionId,
      audioFile,
      seconds,
      difficulty,
      prompt: userPrompt,
      promptIndex: parseInt(promptIndex),
      totalPrompts: parseInt(totalPrompts),
      responseTime: parseFloat(responseTime) || 0,
      totalTime: parseFloat(totalTime) || 0,
      timestamp: Date.now(),
      userId: userId
    };

    evaluationQueue.push(evaluationRequest);
    console.log(`[evaluateRapidFire] Added to queue. Queue length: ${evaluationQueue.length}, isProcessing: ${isProcessingQueue}`);

    // Start processing queue if not already processing
    if (!isProcessingQueue) {
      console.log(`[evaluateRapidFire] Starting queue processing`);
      processEvaluationQueue();
    } else {
      console.log(`[evaluateRapidFire] Queue already processing, skipping start`);
    }

    // Return immediate response with session status
    const response = {
      message: "Evaluation queued successfully",
      sessionId,
      queuePosition: evaluationQueue.length,
      sessionStatus: session.status,
      completed: session.completed,
      totalPrompts: session.totalPrompts
    };
    
    console.log(`[evaluateRapidFire] Sending response:`, response);
    res.json(response);

  } catch (error) {
    console.error("[evaluateRapidFire] Error queuing evaluation:", error);
    res.status(500).json({ error: "Failed to queue evaluation." });
  }
};

const processEvaluationQueue = async () => {
  if (isProcessingQueue || evaluationQueue.length === 0) {
    console.log(`[processEvaluationQueue] Skipping - isProcessing: ${isProcessingQueue}, queueLength: ${evaluationQueue.length}`);
    return;
  }

  isProcessingQueue = true;
  console.log(`[processEvaluationQueue] Starting to process ${evaluationQueue.length} evaluation requests...`);

  while (evaluationQueue.length > 0) {
    const request = evaluationQueue.shift();
    console.log(`[processEvaluationQueue] Processing request for session ${request.sessionId}, prompt ${request.promptIndex}/${request.totalPrompts}`);
    
    try {
      console.log(`[processEvaluationQueue] Calling processEvaluationRequest for session ${request.sessionId}, prompt ${request.promptIndex}`);
      const evaluation = await processEvaluationRequest(request);
      console.log(`[processEvaluationQueue] Successfully processed evaluation for session ${request.sessionId}, prompt ${request.promptIndex}`);
      
      // Save audio file
      const audioFileName = `${request.sessionId}_prompt_${request.promptIndex}.wav`;
      const audioFilePath = path.join(AUDIO_STORAGE_DIR, audioFileName);
      
      try {
        fs.writeFileSync(audioFilePath, request.audioFile.buffer);
        console.log(`[processEvaluationQueue] Saved audio file: ${audioFileName}`);
      } catch (error) {
        console.error(`[processEvaluationQueue] Error saving audio file: ${error}`);
      }

      // Update session with evaluation result
      const session = gameSessions.get(request.sessionId);
      if (session) {
        console.log(`[processEvaluationQueue] Updating session ${request.sessionId} - before: completed=${session.completed}/${session.totalPrompts}, status=${session.status}`);
        
        session.evaluations[request.promptIndex - 1] = {
          prompt: request.prompt,
          promptIndex: request.promptIndex,
          evaluation,
          timestamp: request.timestamp
        };
        
        // Store timing data
        session.responseTimes[request.promptIndex - 1] = {
          responseTime: request.responseTime,
          totalTime: request.totalTime
        };
        
        // Store audio file reference
        session.audioFiles[request.promptIndex - 1] = audioFileName;
        
        session.completed++;

        console.log(`[processEvaluationQueue] After update - completed: ${session.completed}/${session.totalPrompts}`);

        // Check if all evaluations are complete
        if (session.completed === session.totalPrompts) {
          session.status = 'completed';
          session.completedAt = Date.now();
          console.log(`[processEvaluationQueue] ✅ Session ${request.sessionId} COMPLETED with ${session.completed} evaluations`);
          
          // Update database session if it exists
          if (session.dbSessionId && session.userId) {
            try {
              const totalDuration = session.responseTimes.reduce((sum, time) => sum + (time?.totalTime || 0), 0);
              const avgEnergyLevel = session.evaluations.reduce((sum, eval) => sum + (eval?.evaluation?.energy?.score || 5), 0) / session.evaluations.length;
              
              const updateData = {
                duration: Math.round(totalDuration),
                energy_levels: session.evaluations.map(eval => eval?.evaluation?.energy?.score || 5),
                session_data: {
                  totalPrompts: session.totalPrompts,
                  difficulty: session.difficulty,
                  evaluations: session.evaluations,
                  responseTimes: session.responseTimes,
                  averageScores: {
                    responseRate: session.evaluations.reduce((sum, eval) => sum + (eval?.evaluation?.responseRate?.score || 5), 0) / session.evaluations.length,
                    pace: session.evaluations.reduce((sum, eval) => sum + (eval?.evaluation?.pace?.score || 5), 0) / session.evaluations.length,
                    energy: avgEnergyLevel
                  }
                },
                audio_files: session.audioFiles.filter(file => file !== null),
                completed: true
              };
              
              await databaseService.updateGameSession(session.dbSessionId, updateData);
              
              // Update user game stats
              await databaseService.updateUserGameStats(session.userId, 'rapid-fire', {
                duration: totalDuration,
                energy_levels: updateData.energy_levels
              });
              
              console.log(`[processEvaluationQueue] Updated database session ${session.dbSessionId} and user stats`);
            } catch (error) {
              console.error(`[processEvaluationQueue] Error updating database session:`, error);
            }
          }
        } else {
          console.log(`[processEvaluationQueue] Session ${request.sessionId} still in progress: ${session.completed}/${session.totalPrompts}`);
        }
      } else {
        console.log(`[processEvaluationQueue] ⚠️ Session ${request.sessionId} not found in gameSessions`);
      }
    } catch (error) {
      console.error(`[processEvaluationQueue] Error processing evaluation request for session ${request.sessionId}, prompt ${request.promptIndex}:`, error);
      
      // Add failed evaluation to session
      const session = gameSessions.get(request.sessionId);
      if (session) {
        console.log(`[processEvaluationQueue] Adding failed evaluation to session ${request.sessionId} - before: completed=${session.completed}/${session.totalPrompts}`);
        
        session.evaluations[request.promptIndex - 1] = {
          prompt: request.prompt,
          promptIndex: request.promptIndex,
          evaluation: {
            responseRate: { score: 5, feedback: 'Evaluation failed' },
            pace: { score: 5, feedback: 'Evaluation failed' },
            energy: { score: 5, feedback: 'Evaluation failed' }
          },
          timestamp: request.timestamp,
          error: true
        };
        session.completed++;

        console.log(`[processEvaluationQueue] After failed evaluation - completed: ${session.completed}/${session.totalPrompts}`);

        // Check if all evaluations are complete (even for failed evaluations)
        if (session.completed === session.totalPrompts) {
          session.status = 'completed';
          session.completedAt = Date.now();
          console.log(`[processEvaluationQueue] ✅ Session ${request.sessionId} COMPLETED with ${session.completed} evaluations (including failed ones)`);
        } else {
          console.log(`[processEvaluationQueue] Session ${request.sessionId} still in progress after failed evaluation: ${session.completed}/${session.totalPrompts}`);
        }
      } else {
        console.log(`[processEvaluationQueue] ⚠️ Session ${request.sessionId} not found when adding failed evaluation`);
      }
    }
  }

  isProcessingQueue = false;
  console.log(`[processEvaluationQueue] Queue processing completed. Remaining queue length: ${evaluationQueue.length}`);
};

const processEvaluationRequest = async (request) => {
  console.log(`[processEvaluationRequest] Starting evaluation for session ${request.sessionId}, prompt ${request.promptIndex}`);
  
  const audioPart = {
    inlineData: {
      data: request.audioFile.buffer.toString("base64"),
      mimeType: request.audioFile.mimetype,
    },
  };

  const evaluationPrompt = `
    You are an expert public speaking coach evaluating a rapid-fire analogy game response.
    Analyze the provided audio file and evaluate it.

    **Silent Audio Rule:** If the audio is silent or contains no discernible speech, you MUST provide an evaluation with all scores set to 0 and feedback indicating that no speech was detected. Do not attempt to evaluate a silent audio file.

    **Evaluation Context:**
    - Difficulty Level: ${request.difficulty}
    - Prompt Given: "${request.prompt}"
    - Time Limit: ${request.seconds} seconds
    - This is prompt ${request.promptIndex} of ${request.totalPrompts}

    The user was asked to create an analogy for the given prompt within the time limit. Evaluate their speech delivery based on the following criteria. Provide specific, actionable feedback for each.
    
    **Evaluation Criteria:**
    1. **Response Rate**: How quickly and consistently did the user respond to the prompt? Consider hesitation vs. immediate engagement.
    2. **Pace & Flow**: How was the user's speaking speed and rhythm? Was it smooth or choppy?
    3. **Energy & Confidence**: How energetic and confident did the user sound?
    
    **Important Guidelines:**
    - Do NOT judge the logic, cleverness, or "correctness" of the analogy itself.
    - Focus ONLY on the audible qualities of speech delivery: timing, confidence, pace, and energy.
  `;

  console.log(`[processEvaluationRequest] Calling Gemini API for session ${request.sessionId}, prompt ${request.promptIndex}`);
  const result = await model.generateContent([evaluationPrompt, audioPart]);
  const response = await result.response;
  
  console.log(`[processEvaluationRequest] Received response from Gemini for session ${request.sessionId}, prompt ${request.promptIndex}`);
  const jsonResponse = JSON.parse(response.text());
  console.log(`[processEvaluationRequest] Parsed evaluation result for session ${request.sessionId}, prompt ${request.promptIndex}:`, jsonResponse);
  
  return jsonResponse;
};

// New endpoint to get session status and results
const getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`[getSessionStatus] Request for session: ${sessionId}`);
    
    if (!sessionId) {
      console.log(`[getSessionStatus] Error: No session ID provided`);
      return res.status(400).json({ error: "Session ID is required." });
    }

    const session = gameSessions.get(sessionId);
    
    if (!session) {
      console.log(`[getSessionStatus] Error: Session ${sessionId} not found. Available sessions:`, Array.from(gameSessions.keys()));
      return res.status(404).json({ error: "Session not found." });
    }

    const response = {
      sessionId,
      status: session.status,
      completed: session.completed,
      totalPrompts: session.totalPrompts,
      evaluations: session.evaluations,
      responseTimes: session.responseTimes,
      audioFiles: session.audioFiles,
      difficulty: session.difficulty,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      queueLength: evaluationQueue.length,
      isProcessing: isProcessingQueue
    };

    console.log(`[getSessionStatus] Session ${sessionId} status:`, {
      status: session.status,
      completed: session.completed,
      totalPrompts: session.totalPrompts,
      queueLength: evaluationQueue.length,
      isProcessing: isProcessingQueue
    });

    res.json(response);

  } catch (error) {
    console.error(`[getSessionStatus] Error getting session status for ${req.params.sessionId}:`, error);
    res.status(500).json({ error: "Failed to get session status." });
  }
};

// Cleanup old sessions and audio files (older than 24 hours)
const cleanupOldSessions = () => {
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  console.log(`[cleanupOldSessions] Current sessions:`, Array.from(gameSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    status: session.status,
    completed: session.completed,
    totalPrompts: session.totalPrompts,
    createdAt: new Date(session.createdAt).toISOString()
  })));
  
  // Clean up old sessions
  for (const [sessionId, session] of gameSessions.entries()) {
    if (session.createdAt < twentyFourHoursAgo) {
      gameSessions.delete(sessionId);
      console.log(`[cleanupOldSessions] Cleaned up old session: ${sessionId}`);
    }
  }
  
  // Clean up old audio files
  try {
    const files = fs.readdirSync(AUDIO_STORAGE_DIR);
    for (const file of files) {
      const filePath = path.join(AUDIO_STORAGE_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() < twentyFourHoursAgo) {
        fs.unlinkSync(filePath);
        console.log(`[cleanupOldSessions] Cleaned up old audio file: ${file}`);
      }
    }
  } catch (error) {
    console.error(`[cleanupOldSessions] Error cleaning up audio files: ${error}`);
  }
};

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

// Audio file serving endpoint
const serveAudioFile = async (req, res) => {
  try {
    const { sessionId, promptIndex } = req.params;
    
    console.log(`[serveAudioFile] Request for audio: session ${sessionId}, prompt ${promptIndex}`);
    
    const audioFileName = `${sessionId}_prompt_${promptIndex}.wav`;
    const audioFilePath = path.join(AUDIO_STORAGE_DIR, audioFileName);
    
    if (!fs.existsSync(audioFilePath)) {
      console.log(`[serveAudioFile] Audio file not found: ${audioFileName}`);
      return res.status(404).json({ error: "Audio file not found" });
    }
    
    console.log(`[serveAudioFile] Serving audio file: ${audioFileName}`);
    res.sendFile(audioFilePath);
    
  } catch (error) {
    console.error(`[serveAudioFile] Error serving audio file:`, error);
    res.status(500).json({ error: "Failed to serve audio file" });
  }
};

// Debug endpoint to check current state
const debugState = async (req, res) => {
  console.log(`[debugState] Debug request received`);
  
  const debugInfo = {
    totalSessions: gameSessions.size,
    sessions: Array.from(gameSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      status: session.status,
      completed: session.completed,
      totalPrompts: session.totalPrompts,
      createdAt: new Date(session.createdAt).toISOString(),
      completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null
    })),
    queueLength: evaluationQueue.length,
    isProcessing: isProcessingQueue,
    queueItems: evaluationQueue.map(req => ({
      sessionId: req.sessionId,
      promptIndex: req.promptIndex,
      totalPrompts: req.totalPrompts
    }))
  };
  
  console.log(`[debugState] Current state:`, debugInfo);
  res.json(debugInfo);
};

module.exports = {
  evaluateRapidFire,
  getSessionStatus,
  serveAudioFile,
  debugState,
};