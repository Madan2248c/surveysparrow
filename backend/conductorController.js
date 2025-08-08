const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const conductorEvaluationSchema = {
  type: "object",
  properties: {
    responseSpeed: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for how quickly they adapted to energy changes" },
        feedback: { type: "string", description: "Specific feedback about response speed to energy changes" },
      },
      required: ["score", "feedback"]
    },
    energyRange: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for the actual energy range demonstrated" },
        feedback: { type: "string", description: "Feedback about voice energy modulation and range" },
      },
      required: ["score", "feedback"]
    },
    contentContinuity: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for maintaining topic focus" },
        feedback: { type: "string", description: "Feedback about content continuity and topic adherence" },
      },
      required: ["score", "feedback"]
    },
    breathRecovery: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for how well they used breath moments" },
        feedback: { type: "string", description: "Feedback about breath moment utilization and recovery" },
      },
      required: ["score", "feedback"]
    },
    overallPerformance: {
      type: "object",
      properties: {
        score: { type: "number", description: "Overall score from 1-10 for the entire session" },
        summary: { type: "string", description: "Overall summary of performance" },
      },
      required: ["score", "summary"]
    }
  },
  required: ["responseSpeed", "energyRange", "contentContinuity", "breathRecovery", "overallPerformance"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: conductorEvaluationSchema,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// Conductor sessions storage
const conductorSessions = new Map();

// Queue for storing evaluation requests
const evaluationQueue = [];
let isProcessingQueue = false;

const startConductorSession = async (req, res) => {
  try {
    const { topic, duration, sessionId } = req.body;

    console.log(`[startConductorSession] Starting new session: ${sessionId}`);

    if (!sessionId || !topic || !duration) {
      console.log(`[startConductorSession] Error: Missing required parameters`);
      return res.status(400).json({ error: "Session ID, topic, and duration are required." });
    }

    // Initialize conductor session
    const session = {
      sessionId,
      topic,
      duration: parseInt(duration),
      status: 'recording',
      energyChanges: [],
      breathMoments: [],
      audioData: null,
      createdAt: Date.now(),
      startedAt: Date.now()
    };

    conductorSessions.set(sessionId, session);

    console.log(`[startConductorSession] Session ${sessionId} initialized with topic: "${topic}", duration: ${duration} minutes`);

    res.json({
      message: "Conductor session started successfully",
      sessionId,
      topic,
      duration
    });

  } catch (error) {
    console.error("[startConductorSession] Error starting session:", error);
    res.status(500).json({ error: "Failed to start conductor session." });
  }
};

const recordEnergyChange = async (req, res) => {
  try {
    const { sessionId, energyLevel, timestamp } = req.body;

    console.log(`[recordEnergyChange] Recording energy change for session: ${sessionId}, level: ${energyLevel}`);

    if (!sessionId || !energyLevel || !timestamp) {
      console.log(`[recordEnergyChange] Error: Missing required parameters`);
      return res.status(400).json({ error: "Session ID, energy level, and timestamp are required." });
    }

    const session = conductorSessions.get(sessionId);
    if (!session) {
      console.log(`[recordEnergyChange] Error: Session ${sessionId} not found`);
      return res.status(404).json({ error: "Session not found." });
    }

    // Record energy change
    session.energyChanges.push({
      energyLevel: parseInt(energyLevel),
      timestamp: parseInt(timestamp),
      recordedAt: Date.now()
    });

    console.log(`[recordEnergyChange] Energy change recorded. Total changes: ${session.energyChanges.length}`);

    res.json({
      message: "Energy change recorded successfully",
      sessionId,
      energyLevel,
      totalChanges: session.energyChanges.length
    });

  } catch (error) {
    console.error("[recordEnergyChange] Error recording energy change:", error);
    res.status(500).json({ error: "Failed to record energy change." });
  }
};

const recordBreathMoment = async (req, res) => {
  try {
    const { sessionId, timestamp } = req.body;

    console.log(`[recordBreathMoment] Recording breath moment for session: ${sessionId}`);

    if (!sessionId || !timestamp) {
      console.log(`[recordBreathMoment] Error: Missing required parameters`);
      return res.status(400).json({ error: "Session ID and timestamp are required." });
    }

    const session = conductorSessions.get(sessionId);
    if (!session) {
      console.log(`[recordBreathMoment] Error: Session ${sessionId} not found`);
      return res.status(404).json({ error: "Session not found." });
    }

    // Record breath moment
    session.breathMoments.push({
      timestamp: parseInt(timestamp),
      recordedAt: Date.now()
    });

    console.log(`[recordBreathMoment] Breath moment recorded. Total moments: ${session.breathMoments.length}`);

    res.json({
      message: "Breath moment recorded successfully",
      sessionId,
      totalMoments: session.breathMoments.length
    });

  } catch (error) {
    console.error("[recordBreathMoment] Error recording breath moment:", error);
    res.status(500).json({ error: "Failed to record breath moment." });
  }
};

const endConductorSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const audioFile = req.file;

    console.log(`[endConductorSession] Ending session: ${sessionId}`);

    if (!sessionId) {
      console.log(`[endConductorSession] Error: No session ID provided`);
      return res.status(400).json({ error: "Session ID is required." });
    }

    if (!audioFile) {
      console.log(`[endConductorSession] Error: No audio file provided for session ${sessionId}`);
      return res.status(400).json({ error: "Audio file is required." });
    }

    const session = conductorSessions.get(sessionId);
    if (!session) {
      console.log(`[endConductorSession] Error: Session ${sessionId} not found`);
      return res.status(404).json({ error: "Session not found." });
    }

    // Update session with audio data and end time
    session.audioData = audioFile;
    session.endedAt = Date.now();
    session.status = 'completed';
    session.actualDuration = session.endedAt - session.startedAt;

    console.log(`[endConductorSession] Session ${sessionId} completed. Duration: ${session.actualDuration}ms, Energy changes: ${session.energyChanges.length}, Breath moments: ${session.breathMoments.length}`);

    // Add evaluation request to queue
    const evaluationRequest = {
      sessionId,
      session,
      timestamp: Date.now()
    };

    evaluationQueue.push(evaluationRequest);
    console.log(`[endConductorSession] Added to evaluation queue. Queue length: ${evaluationQueue.length}, isProcessing: ${isProcessingQueue}`);

    // Start processing queue if not already processing
    if (!isProcessingQueue) {
      console.log(`[endConductorSession] Starting queue processing`);
      processConductorEvaluationQueue();
    }

    // Return immediate response
    const response = {
      message: "Conductor session ended and evaluation queued",
      sessionId,
      queuePosition: evaluationQueue.length,
      energyChanges: session.energyChanges.length,
      breathMoments: session.breathMoments.length,
      duration: Math.round(session.actualDuration / 1000)
    };
    
    console.log(`[endConductorSession] Sending response:`, response);
    res.json(response);

  } catch (error) {
    console.error("[endConductorSession] Error ending session:", error);
    res.status(500).json({ error: "Failed to end conductor session." });
  }
};

const processConductorEvaluationQueue = async () => {
  if (isProcessingQueue || evaluationQueue.length === 0) {
    console.log(`[processConductorEvaluationQueue] Skipping - isProcessing: ${isProcessingQueue}, queueLength: ${evaluationQueue.length}`);
    return;
  }

  isProcessingQueue = true;
  console.log(`[processConductorEvaluationQueue] Starting to process ${evaluationQueue.length} evaluation requests...`);

  while (evaluationQueue.length > 0) {
    const request = evaluationQueue.shift();
    console.log(`[processConductorEvaluationQueue] Processing evaluation for session ${request.sessionId}`);
    
    try {
      console.log(`[processConductorEvaluationQueue] Calling processConductorEvaluation for session ${request.sessionId}`);
      const evaluation = await processConductorEvaluation(request);
      console.log(`[processConductorEvaluationQueue] Successfully processed evaluation for session ${request.sessionId}`);
      
      // Update session with evaluation result
      const session = conductorSessions.get(request.sessionId);
      if (session) {
        session.evaluation = evaluation;
        session.evaluatedAt = Date.now();
        session.status = 'evaluated';
        console.log(`[processConductorEvaluationQueue] ✅ Session ${request.sessionId} EVALUATED`);
      } else {
        console.log(`[processConductorEvaluationQueue] ⚠️ Session ${request.sessionId} not found in conductorSessions`);
      }
    } catch (error) {
      console.error(`[processConductorEvaluationQueue] Error processing evaluation for session ${request.sessionId}:`, error);
      
      // Add failed evaluation to session
      const session = conductorSessions.get(request.sessionId);
      if (session) {
        session.evaluation = {
          responseSpeed: { score: 5, feedback: 'Evaluation failed' },
          energyRange: { score: 5, feedback: 'Evaluation failed' },
          contentContinuity: { score: 5, feedback: 'Evaluation failed' },
          breathRecovery: { score: 5, feedback: 'Evaluation failed' },
          overallPerformance: { score: 5, summary: 'Evaluation failed' }
        };
        session.evaluatedAt = Date.now();
        session.status = 'evaluated';
        session.error = true;
        console.log(`[processConductorEvaluationQueue] ✅ Session ${request.sessionId} EVALUATED with error`);
      }
    }
  }

  isProcessingQueue = false;
  console.log(`[processConductorEvaluationQueue] Queue processing completed. Remaining queue length: ${evaluationQueue.length}`);
};

const processConductorEvaluation = async (request) => {
  console.log(`[processConductorEvaluation] Starting evaluation for session ${request.sessionId}`);
  
  const session = request.session;
  const audioPart = {
    inlineData: {
      data: session.audioData.buffer.toString("base64"),
      mimeType: session.audioData.mimetype,
    },
  };

  // Create detailed session analysis
  const energyChangesText = session.energyChanges.map((change, index) => 
    `${index + 1}. Energy Level ${change.energyLevel} at ${Math.round(change.timestamp / 1000)}s`
  ).join('\n');

  const breathMomentsText = session.breathMoments.map((moment, index) => 
    `${index + 1}. Breath moment at ${Math.round(moment.timestamp / 1000)}s`
  ).join('\n');

  const evaluationPrompt = `
    You are an expert public speaking coach evaluating a "Conductor" energy modulation training session.
    Analyze the provided audio file and evaluate the speaker's performance based on the session data.

    **Silent Audio Rule:** If the audio is silent or contains no discernible speech, you MUST provide an evaluation with all scores set to 0 and feedback indicating that no speech was detected.

    **Session Context:**
    - Topic: "${session.topic}"
    - Intended Duration: ${session.duration} minutes
    - Actual Duration: ${Math.round(session.actualDuration / 1000)} seconds
    - Total Energy Changes: ${session.energyChanges.length}
    - Total Breath Moments: ${session.breathMoments.length}

    **Energy Changes Timeline:**
    ${energyChangesText}

    **Breath Moments Timeline:**
    ${breathMomentsText}

    **Evaluation Criteria:**

    1. **Response Speed to Energy Changes (Primary)**: How quickly and effectively did the speaker adapt their voice, tone, and energy when the energy level changed? Did they immediately match the new energy level or were there delays?

    2. **Actual Energy Range Demonstrated (Secondary)**: How well did the speaker actually modulate their voice energy? Did they show a good range from soft/calm to energetic/passionate? Was the energy modulation clear and distinct?

    3. **Content Continuity (Tertiary)**: Did the speaker maintain focus on the topic despite energy changes? Did they continue speaking coherently about the subject matter, or did they completely derail from the topic?

    4. **Breath Recovery (Recovery)**: How effectively did the speaker use the "breathe" moments? Did they pause appropriately, take visible breaths, and then continue smoothly? Did these moments help them reset and maintain flow?

    **Important Guidelines:**
    - Focus on the SPEECH DELIVERY aspects, not the content quality
    - Consider the timing and responsiveness to energy changes
    - Evaluate the actual voice modulation and energy range demonstrated
    - Assess how well they maintained topic focus during transitions
    - Consider the effectiveness of breath moments for recovery
  `;

  console.log(`[processConductorEvaluation] Calling Gemini API for session ${request.sessionId}`);
  const result = await model.generateContent([evaluationPrompt, audioPart]);
  const response = await result.response;
  
  console.log(`[processConductorEvaluation] Received response from Gemini for session ${request.sessionId}`);
  const jsonResponse = JSON.parse(response.text());
  console.log(`[processConductorEvaluation] Parsed evaluation result for session ${request.sessionId}:`, jsonResponse);
  
  return jsonResponse;
};

const getConductorSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`[getConductorSessionStatus] Request for session: ${sessionId}`);
    
    if (!sessionId) {
      console.log(`[getConductorSessionStatus] Error: No session ID provided`);
      return res.status(400).json({ error: "Session ID is required." });
    }

    const session = conductorSessions.get(sessionId);
    
    if (!session) {
      console.log(`[getConductorSessionStatus] Error: Session ${sessionId} not found`);
      return res.status(404).json({ error: "Session not found." });
    }

    const response = {
      sessionId,
      status: session.status,
      topic: session.topic,
      duration: session.duration,
      energyChanges: session.energyChanges,
      breathMoments: session.breathMoments,
      evaluation: session.evaluation,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      evaluatedAt: session.evaluatedAt,
      actualDuration: session.actualDuration,
      queueLength: evaluationQueue.length,
      isProcessing: isProcessingQueue
    };

    console.log(`[getConductorSessionStatus] Session ${sessionId} status:`, {
      status: session.status,
      energyChanges: session.energyChanges.length,
      breathMoments: session.breathMoments.length,
      queueLength: evaluationQueue.length,
      isProcessing: isProcessingQueue
    });

    res.json(response);

  } catch (error) {
    console.error(`[getConductorSessionStatus] Error getting session status for ${req.params.sessionId}:`, error);
    res.status(500).json({ error: "Failed to get session status." });
  }
};

// Cleanup old sessions (older than 24 hours)
const cleanupOldConductorSessions = () => {
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  console.log(`[cleanupOldConductorSessions] Current sessions:`, Array.from(conductorSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    status: session.status,
    energyChanges: session.energyChanges.length,
    breathMoments: session.breathMoments.length,
    createdAt: new Date(session.createdAt).toISOString()
  })));
  
  for (const [sessionId, session] of conductorSessions.entries()) {
    if (session.createdAt < twentyFourHoursAgo) {
      conductorSessions.delete(sessionId);
      console.log(`[cleanupOldConductorSessions] Cleaned up old session: ${sessionId}`);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupOldConductorSessions, 60 * 60 * 1000);

// Debug endpoint to check current state
const debugConductorState = async (req, res) => {
  console.log(`[debugConductorState] Debug request received`);
  
  const debugInfo = {
    totalSessions: conductorSessions.size,
    sessions: Array.from(conductorSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      status: session.status,
      topic: session.topic,
      energyChanges: session.energyChanges.length,
      breathMoments: session.breathMoments.length,
      createdAt: new Date(session.createdAt).toISOString(),
      endedAt: session.endedAt ? new Date(session.endedAt).toISOString() : null,
      evaluatedAt: session.evaluatedAt ? new Date(session.evaluatedAt).toISOString() : null
    })),
    queueLength: evaluationQueue.length,
    isProcessing: isProcessingQueue,
    queueItems: evaluationQueue.map(req => ({
      sessionId: req.sessionId
    }))
  };
  
  console.log(`[debugConductorState] Current state:`, debugInfo);
  res.json(debugInfo);
};

module.exports = {
  startConductorSession,
  recordEnergyChange,
  recordBreathMoment,
  endConductorSession,
  getConductorSessionStatus,
  debugConductorState,
};
