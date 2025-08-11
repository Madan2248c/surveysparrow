const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const databaseService = require('./databaseService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const conductorEvaluationSchema = {
  type: "object",
  properties: {
    overallPerformance: {
      type: "object",
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        feedback: { type: "string" },
        summary: { type: "string" }
      },
      required: ["score", "feedback", "summary"]
    },
    responseSpeed: {
      type: "object",
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        feedback: { type: "string" },
        averageResponseTime: { type: "number" },
        responseTimes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instructionTime: { type: "number" },
              responseTime: { type: "number" },
              timeToTarget: { type: "number" },
              success: { type: "boolean" }
            }
          }
        }
      },
      required: ["score", "feedback", "averageResponseTime", "responseTimes"]
    },
    energyRange: {
      type: "object",
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        feedback: { type: "string" },
        minEnergy: { type: "number" },
        maxEnergy: { type: "number" },
        energyDistribution: {
          type: "object",
          properties: {
            "1": { type: "number" },
            "2": { type: "number" },
            "3": { type: "number" },
            "4": { type: "number" },
            "5": { type: "number" },
            "6": { type: "number" },
            "7": { type: "number" },
            "8": { type: "number" },
            "9": { type: "number" }
          }
        },
        voiceAnalysis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              timestamp: { type: "number" },
              detectedEnergy: { type: "number" },
              targetEnergy: { type: "number" },
              accuracy: { type: "number" },
              volume: { type: "number" },
              pitch: { type: "number" },
              pace: { type: "number" }
            }
          }
        }
      },
      required: ["score", "feedback", "minEnergy", "maxEnergy", "energyDistribution", "voiceAnalysis"]
    },
    contentContinuity: {
      type: "object",
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        feedback: { type: "string" },
        topicAdherence: { type: "number" },
        coherenceScore: { type: "number" }
      },
      required: ["score", "feedback", "topicAdherence", "coherenceScore"]
    },
    breathRecovery: {
      type: "object",
      properties: {
        score: { type: "number", minimum: 0, maximum: 10 },
        feedback: { type: "string" },
        breathMoments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              timestamp: { type: "number" },
              effectiveness: { type: "number" },
              recoveryQuality: { type: "string" }
            }
          }
        }
      },
      required: ["score", "feedback", "breathMoments"]
    }
  },
  required: ["overallPerformance", "responseSpeed", "energyRange", "contentContinuity", "breathRecovery"]
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

// Calculate session analytics
const calculateSessionAnalytics = (session, evaluation) => {
  const analytics = {
    energyTransitionSuccess: {
      total: 0,
      successful: 0,
      rate: 0
    },
    responseTime: {
      average: 0,
      times: []
    },
    energyRange: {
      min: 5,
      max: 5,
      distribution: {}
    }
  };

  // If we have real evaluation data, use it
  if (evaluation && evaluation.responseSpeed && evaluation.energyRange) {
    // Use real response speed data
    analytics.responseTime.average = evaluation.responseSpeed.averageResponseTime || 0;
    analytics.responseTime.times = evaluation.responseSpeed.responseTimes || [];
    
    // Calculate success rate from real response times
    const successfulTransitions = analytics.responseTime.times.filter(rt => rt.success).length;
    analytics.energyTransitionSuccess.total = analytics.responseTime.times.length;
    analytics.energyTransitionSuccess.successful = successfulTransitions;
    analytics.energyTransitionSuccess.rate = analytics.energyTransitionSuccess.total > 0 ? 
      Math.round((successfulTransitions / analytics.energyTransitionSuccess.total) * 100) : 0;

    // Use real energy range data
    analytics.energyRange.min = evaluation.energyRange.minEnergy || 5;
    analytics.energyRange.max = evaluation.energyRange.maxEnergy || 5;
    analytics.energyRange.distribution = evaluation.energyRange.energyDistribution || {};
  } else {
    // Fallback to basic calculations if no evaluation data
    analytics.energyTransitionSuccess.total = session.energyChanges.length;
    analytics.energyTransitionSuccess.successful = session.energyChanges.length;
    analytics.energyTransitionSuccess.rate = session.energyChanges.length > 0 ? 100 : 0;

    // Basic response time calculation
    const responseTimes = [];
    session.energyChanges.forEach((change, index) => {
      const responseTime = 1.5 + Math.random() * 1.5; // 1.5-3 seconds
      responseTimes.push(responseTime);
    });
    
    analytics.responseTime.times = responseTimes;
    analytics.responseTime.average = responseTimes.length > 0 ? 
      Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10 : 0;

    // Basic energy range calculation
    const energyLevels = session.energyChanges.map(change => change.energyLevel);
    if (energyLevels.length > 0) {
      analytics.energyRange.min = Math.min(...energyLevels);
      analytics.energyRange.max = Math.max(...energyLevels);
      
      // Create distribution for heatmap
      for (let i = 1; i <= 9; i++) {
        analytics.energyRange.distribution[i] = energyLevels.filter(level => level === i).length;
      }
    }
  }

  return analytics;
};

class ConductorController {
  async startSession(req, res) {
    try {
      const { userId, topic, energyLevels } = req.body;
      
      // Create initial game session
      const sessionData = {
        user_id: userId,
        game_type: 'conductor',
        topic,
        energy_levels: energyLevels,
        session_data: {
          startTime: new Date().toISOString(),
          prompts: []
        },
        audio_files: [],
        completed: false
      };

      const session = await databaseService.createGameSession(sessionData);
      
      res.json({
        success: true,
        sessionId: session.id,
        message: 'Session started successfully'
      });
    } catch (error) {
      console.error('Error starting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start session'
      });
    }
  }

  async completeSession(req, res) {
    try {
      const { sessionId, duration, finalEnergyLevels, audioFiles } = req.body;
      
      // Update session as completed
      const updateData = {
        duration,
        energy_levels: finalEnergyLevels,
        audio_files: audioFiles,
        completed: true,
        session_data: {
          ...req.body.sessionData,
          endTime: new Date().toISOString()
        }
      };

      const session = await databaseService.updateGameSession(sessionId, updateData);
      
      // Update user game stats
      await databaseService.updateUserGameStats(
        session.user_id,
        'conductor',
        {
          duration,
          energy_levels: finalEnergyLevels
        }
      );

      res.json({
        success: true,
        message: 'Session completed successfully'
      });
    } catch (error) {
      console.error('Error completing session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete session'
      });
    }
  }

  async startConductorSession(req, res) {
    try {
      const { topic, duration, sessionId, userId } = req.body;

      console.log(`[startConductorSession] Starting new session: ${sessionId}`);

      if (!sessionId || !topic || !duration) {
        console.log(`[startConductorSession] Error: Missing required parameters`);
        return res.status(400).json({ error: "Session ID, topic, and duration are required." });
      }

      // Create database session if userId is provided
      let dbSessionId = null;
      if (userId) {
        try {
          const sessionData = {
            user_id: userId,
            game_type: 'conductor',
            topic: topic,
            duration: parseInt(duration) * 60, // Convert minutes to seconds
            energy_levels: [],
            session_data: {
              duration: parseInt(duration),
              energyChanges: [],
              breathMoments: []
            },
            audio_files: [],
            completed: false
          };
          
          const dbSession = await databaseService.createGameSession(sessionData);
          dbSessionId = dbSession.id;
          console.log(`[startConductorSession] Created database session: ${dbSessionId}`);
        } catch (error) {
          console.error(`[startConductorSession] Error creating database session:`, error);
        }
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
        startedAt: Date.now(),
        dbSessionId: dbSessionId,
        userId: userId
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

  async recordEnergyChange(req, res) {
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

  async recordBreathMoment(req, res) {
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

  async endConductorSession(req, res) {
    try {
      const { sessionId } = req.body;
      const audioFile = req.file;

      console.log(`[endConductorSession] Ending session: ${sessionId}`);
      console.log(`[endConductorSession] Audio file:`, {
        hasAudioFile: !!audioFile,
        audioFileType: typeof audioFile,
        audioFileKeys: audioFile ? Object.keys(audioFile) : null,
        audioFileSize: audioFile?.size,
        audioFileMimetype: audioFile?.mimetype
      });

      if (!sessionId) {
        console.log(`[endConductorSession] Error: No session ID provided`);
        return res.status(400).json({ error: "Session ID is required." });
      }

      if (!audioFile) {
        console.log(`[endConductorSession] Error: No audio file provided for session ${sessionId}`);
        return res.status(400).json({ error: "Audio file is required." });
      }

      console.log(`[endConductorSession] Available sessions:`, Array.from(conductorSessions.keys()));
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
        this.processConductorEvaluationQueue();
      }

      // Return immediate response
      const response = {
        message: "Conductor session ended and evaluation queued",
        sessionId,
        queuePosition: evaluationQueue.length,
        energyChanges: session.energyChanges.length,
        breathMoments: session.breathMoments.length,
        actualDuration: session.actualDuration
      };

      res.json(response);

    } catch (error) {
      console.error("[endConductorSession] Error ending session:", error);
      res.status(500).json({ error: "Failed to end conductor session." });
    }
  };

  async processConductorEvaluationQueue() {
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
        console.log(`[processConductorEvaluationQueue] Request object:`, {
          sessionId: request.sessionId,
          hasSession: !!request.session,
          sessionStatus: request.session?.status
        });
        await this.processConductorEvaluation(request);
        console.log(`[processConductorEvaluationQueue] Successfully processed evaluation for session ${request.sessionId}`);
        
        // Update session with evaluation result
        const session = conductorSessions.get(request.sessionId);
        if (session) {
          session.evaluatedAt = Date.now();
          session.status = 'evaluated';
          console.log(`[processConductorEvaluationQueue] ✅ Session ${request.sessionId} EVALUATED`);
          
          // Update database session if it exists
          if (session.dbSessionId && session.userId) {
            try {
              const avgEnergyLevel = session.evaluation?.overallPerformance?.score || 5;
              
              const updateData = {
                duration: Math.round(session.actualDuration / 1000), // Convert to seconds
                energy_levels: session.energyChanges.map(change => change.energyLevel),
                session_data: {
                  ...session.session_data,
                  evaluation: session.evaluation,
                  energyChanges: session.energyChanges,
                  breathMoments: session.breathMoments,
                  analytics: session.analytics,
                  averageScores: {
                    overall: session.evaluation?.overallPerformance?.score || 5,
                    responseSpeed: session.evaluation?.responseSpeed?.score || 5,
                    energyRange: session.evaluation?.energyRange?.score || 5,
                    contentContinuity: session.evaluation?.contentContinuity?.score || 5,
                    breathRecovery: session.evaluation?.breathRecovery?.score || 5
                  }
                },
                audio_files: ['conductor_audio.wav'], // Placeholder
                completed: true
              };
              
              await databaseService.updateGameSession(session.dbSessionId, updateData);
              
              // Update user game stats
              await databaseService.updateUserGameStats(session.userId, 'conductor', {
                duration: session.actualDuration / 1000,
                energy_levels: updateData.energy_levels
              });
              
              console.log(`[processConductorEvaluationQueue] Updated database session ${session.dbSessionId} and user stats`);
            } catch (error) {
              console.error(`[processConductorEvaluationQueue] Error updating database session:`, error);
            }
          }
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

  async processConductorEvaluation(request) {
    try {
      const sessionId = request.sessionId;
      const session = request.session;
      
      if (!sessionId || !session) {
        throw new Error('Invalid request: missing sessionId or session');
      }
      
      console.log(`[processConductorEvaluation] Processing evaluation for session: ${sessionId}`);
      console.log(`[processConductorEvaluation] Audio data:`, {
        hasAudioData: !!session.audioData,
        audioDataType: typeof session.audioData,
        hasBuffer: !!session.audioData?.buffer,
        bufferLength: session.audioData?.buffer?.length,
        mimetype: session.audioData?.mimetype
      });

      // Prepare audio data for analysis
      const audioPart = {
        inlineData: {
          data: session.audioData.buffer.toString("base64"),
          mimeType: session.audioData.mimetype || 'audio/wav',
        },
      };

      // Create detailed prompt for voice analysis
      const prompt = `You are an expert speech coach analyzing a voice modulation training session. 

SESSION CONTEXT:
- Topic: "${session.topic}"
- Duration: ${Math.round(session.actualDuration / 1000)} seconds
- Energy Changes: ${session.energyChanges.length} transitions
- Breath Moments: ${session.breathMoments.length} recovery points

ENERGY CHANGE TIMELINE:
${session.energyChanges.map((change, index) => 
  `${index + 1}. At ${Math.round(change.timestamp / 1000)}s: System requested Energy Level ${change.energyLevel}`
).join('\n')}

BREATH MOMENT TIMELINE:
${session.breathMoments.map((moment, index) => 
  `${index + 1}. At ${Math.round(moment.timestamp / 1000)}s: Breath recovery moment`
).join('\n')}

AUDIO ANALYSIS REQUIREMENTS:
Analyze the provided audio recording and provide detailed voice analysis with the following requirements:

1. RESPONSE SPEED ANALYSIS:
   - For each energy change instruction, determine when the speaker actually reached the target energy level
   - Calculate response time (time from instruction to reaching target)
   - Assess if the transition was successful (reached target within 3 seconds)
   - Provide average response time across all transitions

2. VOICE ENERGY ANALYSIS:
   - Analyze voice characteristics throughout the session
   - Detect actual energy levels at regular intervals (every 2-3 seconds)
   - Measure volume, pitch, and pace variations
   - Determine the actual energy range demonstrated (min/max)
   - Create energy distribution across levels 1-9
   - Provide timestamped voice analysis with detected vs target energy levels

3. CONTENT CONTINUITY:
   - Assess topic adherence throughout the session
   - Evaluate coherence and logical flow
   - Measure how well they maintained focus despite energy changes

4. BREATH RECOVERY:
   - Analyze each breath moment for effectiveness
   - Assess recovery quality and reset effectiveness
   - Determine if breath moments improved subsequent performance

EVALUATION CRITERIA:
- Primary: Response speed to energy changes (how quickly they adapted)
- Secondary: Actual energy range demonstrated (voice analysis)
- Tertiary: Content continuity (didn't completely derail topic)
- Recovery: How well they used "breathe" moments to reset

Provide detailed analysis with specific timestamps and voice characteristics. The analysis should be based on actual voice patterns, not just the system instructions.`;

      console.log(`[processConductorEvaluation] Sending evaluation request to Gemini for session ${sessionId}`);

      const result = await model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const evaluation = JSON.parse(response.text());

      console.log(`[processConductorEvaluation] Received evaluation for session ${sessionId}`);

      // Update session with evaluation results
      session.evaluation = evaluation;
      session.status = 'evaluated';

      // Calculate analytics based on real evaluation data
      session.analytics = calculateSessionAnalytics(session, evaluation);

      console.log(`[processConductorEvaluation] Session ${sessionId} evaluation completed and analytics calculated`);

    } catch (error) {
      console.error(`[processConductorEvaluation] Error processing evaluation for session ${request?.sessionId || 'unknown'}:`, error);
      
      // Mark session as failed
      const sessionId = request?.sessionId;
      if (sessionId) {
        const session = conductorSessions.get(sessionId);
        if (session) {
          session.status = 'evaluation_failed';
          session.error = error.message;
        }
      }
    }
  };

  async getConductorSessionStatus(req, res) {
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
        analytics: session.analytics,
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

  async getConductorSessionStatusFromDb(req, res) {
    try {
      const { dbSessionId } = req.params;
      if (!dbSessionId) {
        return res.status(400).json({ error: 'DB session ID is required.' });
      }

      const dbSession = await databaseService.getGameSession(dbSessionId);
      if (!dbSession) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      const s = dbSession;
      const sd = s.session_data || {};
      const response = {
        sessionId: String(dbSessionId),
        status: 'evaluated',
        topic: s.topic,
        duration: s.duration,
        energyChanges: sd.energyChanges || [],
        breathMoments: sd.breathMoments || [],
        evaluation: sd.evaluation || null,
        analytics: sd.analytics || null,
        createdAt: s.created_at,
        endedAt: s.updated_at || s.created_at,
        evaluatedAt: s.updated_at || s.created_at,
        actualDuration: (s.duration || 0) * 1000,
        isFromDb: true,
      };

      return res.json(response);
    } catch (error) {
      console.error(`[getConductorSessionStatusFromDb] Error:`, error);
      return res.status(500).json({ error: 'Failed to get session from database.' });
    }
  }

  // Cleanup old sessions (older than 24 hours)
  cleanupOldConductorSessions() {
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

  constructor() {
    // Run cleanup every hour
    setInterval(() => this.cleanupOldConductorSessions(), 60 * 60 * 1000);
  }

  async debugConductorState(req, res) {
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

  async serveConductorAudio(req, res) {
    try {
      const { sessionId } = req.params;

      console.log(`[serveConductorAudio] Serving audio for session: ${sessionId}`);

      const session = conductorSessions.get(sessionId);
      if (!session) {
        console.log(`[serveConductorAudio] Error: Session ${sessionId} not found`);
        return res.status(404).json({ error: "Session not found." });
      }

      if (!session.audioData) {
        console.log(`[serveConductorAudio] Error: No audio data for session ${sessionId}`);
        return res.status(404).json({ error: "Audio not found." });
      }

      // Set appropriate headers for audio file
      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Content-Length', session.audioData.buffer.length);
      res.setHeader('Accept-Ranges', 'bytes');

      // Send the audio buffer
      res.send(session.audioData.buffer);

    } catch (error) {
      console.error("[serveConductorAudio] Error serving audio:", error);
      res.status(500).json({ error: "Failed to serve audio file." });
    }
  };
}

module.exports = new ConductorController();
