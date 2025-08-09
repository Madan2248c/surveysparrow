const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Audio storage configuration
const AUDIO_STORAGE_DIR = path.join(__dirname, 'audio_storage');
const AUDIO_RETENTION_HOURS = 24;

// Ensure audio storage directory exists
if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
    fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
}

const tripleStepEvaluationSchema = {
  type: "object",
  properties: {
    primary: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for successfully speaking random words within time limit" },
        feedback: { type: "string", description: "Detailed feedback on word integration success and timing" },
        wordsIntegrated: { type: "number", description: "Number of words successfully integrated" },
        wordsMissed: { type: "number", description: "Number of words missed or not integrated" }
      },
      required: ["score", "feedback", "wordsIntegrated", "wordsMissed"]
    },
    secondary: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for smooth vs awkward integration" },
        feedback: { type: "string", description: "Detailed feedback on integration smoothness and naturalness" },
        smoothIntegrations: { type: "array", items: { type: "string" }, description: "List of smoothly integrated words" },
        awkwardIntegrations: { type: "array", items: { type: "string" }, description: "List of awkwardly integrated words" }
      },
      required: ["score", "feedback", "smoothIntegrations", "awkwardIntegrations"]
    },
    tertiary: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for maintaining main topic coherence" },
        feedback: { type: "string", description: "Detailed feedback on topic coherence and message throughline" },
        coherenceLevel: { type: "string", description: "Assessment of coherence: 'Excellent', 'Good', 'Fair', or 'Poor'" }
      },
      required: ["score", "feedback", "coherenceLevel"]
    },
    recovery: {
      type: "object",
      properties: {
        score: { type: "number", description: "Score from 1-10 for handling difficult word integrations" },
        feedback: { type: "string", description: "Detailed feedback on recovery strategies and adaptability" },
        recoveryStrategies: { type: "array", items: { type: "string" }, description: "List of recovery strategies used" }
      },
      required: ["score", "feedback", "recoveryStrategies"]
    },
    overall: {
      type: "object",
      properties: {
        score: { type: "number", description: "Overall score from 1-10" },
        feedback: { type: "string", description: "Overall performance summary and recommendations" },
        strengths: { type: "array", items: { type: "string" }, description: "List of key strengths demonstrated" },
        areasForImprovement: { type: "array", items: { type: "string" }, description: "List of areas for improvement" }
      },
      required: ["score", "feedback", "strengths", "areasForImprovement"]
    },
    wordVerification: {
      type: "object",
      properties: {
        perWord: {
          type: "array",
          items: {
            type: "object",
            properties: {
              word: { type: "string" },
              presentInTranscript: { type: "boolean" },
              presentInAudioLikely: { type: "boolean" },
              matchConfidence: { type: "number" },
              exampleSentence: { type: "string" }
            },
            required: ["word", "presentInTranscript", "presentInAudioLikely", "matchConfidence"]
          }
        },
        integratedWordsDetected: { type: "array", items: { type: "string" } },
        missedWordsDetected: { type: "array", items: { type: "string" } }
      }
    }
  },
  required: ["primary", "secondary", "tertiary", "recovery", "overall"]
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: tripleStepEvaluationSchema,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// Triple Step sessions storage
const tripleStepSessions = new Map();

const evaluateTripleStep = async (req, res) => {
  try {
    const { 
      topic, 
      wordList, 
      integratedWords, 
      missedWords, 
      transcription, 
      totalTime, 
      actualTime, 
      completedEarly,
      sessionId 
    } = req.body;
    
    const audioFile = req.file;

    console.log(`[evaluateTripleStep] Received request for session: ${sessionId}`);

    if (!audioFile) {
      console.log(`[evaluateTripleStep] Error: No audio file provided for session ${sessionId}`);
      return res.status(400).json({ error: "Audio file is required." });
    }

    if (!sessionId) {
      console.log(`[evaluateTripleStep] Error: No session ID provided`);
      return res.status(400).json({ error: "Session ID is required." });
    }

    // Parse JSON strings back to arrays
    let parsedWordList, parsedIntegratedWords, parsedMissedWords;
    
    try {
      parsedWordList = JSON.parse(wordList);
      parsedIntegratedWords = JSON.parse(integratedWords);
      parsedMissedWords = JSON.parse(missedWords);
    } catch (parseError) {
      console.error(`[evaluateTripleStep] Error parsing JSON data:`, parseError);
      return res.status(400).json({ error: "Invalid JSON data in wordList, integratedWords, or missedWords." });
    }

    console.log(`[evaluateTripleStep] Parsed data - wordList: ${parsedWordList.length} items, integratedWords: ${parsedIntegratedWords.length} items, missedWords: ${parsedMissedWords.length} items`);

    // Store session data
    tripleStepSessions.set(sessionId, {
      topic,
      wordList: parsedWordList,
      integratedWords: parsedIntegratedWords,
      missedWords: parsedMissedWords,
      transcription,
      totalTime,
      actualTime,
      completedEarly,
      status: 'processing',
      createdAt: Date.now()
    });

    // Process evaluation
    console.log(`[evaluateTripleStep] Starting evaluation for session ${sessionId}`);
    const evaluation = await processTripleStepEvaluation({
      sessionId,
      audioFile,
      topic,
      wordList: parsedWordList,
      integratedWords: parsedIntegratedWords,
      missedWords: parsedMissedWords,
      transcription,
      totalTime,
      actualTime,
      completedEarly
    });

    // Save audio file
    const audioFileName = `${sessionId}_triple_step.webm`;
    const audioFilePath = path.join(AUDIO_STORAGE_DIR, audioFileName);
    
    try {
      fs.writeFileSync(audioFilePath, audioFile.buffer);
      console.log(`[evaluateTripleStep] Saved audio file: ${audioFileName}`);
    } catch (error) {
      console.error(`[evaluateTripleStep] Error saving audio file: ${error}`);
    }

    // Update session with evaluation result
    const session = tripleStepSessions.get(sessionId);
    if (session) {
      session.evaluation = evaluation;
      session.audioFile = audioFileName;
      session.status = 'completed';
      session.completedAt = Date.now();
      console.log(`[evaluateTripleStep] ✅ Session ${sessionId} completed with evaluation`);
    }

    const response = {
      message: "Triple Step evaluation completed successfully",
      sessionId,
      evaluation,
      audioFile: audioFileName
    };
    
    console.log(`[evaluateTripleStep] Sending response for session ${sessionId}`);
    res.json(response);

  } catch (error) {
    console.error("[evaluateTripleStep] Error processing evaluation:", error);
    res.status(500).json({ error: "Failed to process evaluation." });
  }
};

const processTripleStepEvaluation = async (request) => {
  console.log(`[processTripleStepEvaluation] Starting evaluation for session ${request.sessionId}`);
  
  try {
    const audioPart = {
      inlineData: {
        data: request.audioFile.buffer.toString("base64"),
        mimeType: request.audioFile.mimetype,
      },
    };

    const evaluationPrompt = `
      You are an expert public speaking coach evaluating a Triple Step speech game performance.
      Analyze the provided audio file and the full transcript, then produce JSON per the response schema.

      Silent Audio Rule: If no discernible speech, set all scores to 0 with feedback indicating no speech.

      Game Context:
      - Main Topic: "${request.topic}"
      - Total Words Given: ${request.wordList.length}
      - Words Successfully Integrated (client): ${request.integratedWords.length}
      - Words Missed (client): ${request.missedWords.length}
      - Total Time Allocated: ${request.totalTime} seconds
      - Actual Time Spent: ${request.actualTime} seconds
      - Completed Early: ${request.completedEarly ? 'Yes' : 'No'}
      - Full Transcript: "${request.transcription}"

      Word List Given to Speaker:
      ${request.wordList.map((word, index) => `${index + 1}. ${word}`).join('\n')}

      Task: In addition to the scoring criteria, verify each word using BOTH the transcript and any phonetic cues you infer from audio. Build a wordVerification object:
      - perWord: for each given word, include { word, presentInTranscript, presentInAudioLikely, matchConfidence (0-1), exampleSentence? from transcript if available }.
      - integratedWordsDetected: words you believe were truly integrated.
      - missedWordsDetected: words likely not integrated.

      Be concise, specific, and actionable.

      Evaluation Criteria:
      1) PRIMARY - Word Integration Success (1-10)
      2) SECONDARY - Integration Smoothness (1-10)
      3) TERTIARY - Topic Coherence (1-10)
      4) RECOVERY - Handling Difficult Words (1-10)
    `;

    console.log(`[processTripleStepEvaluation] Calling Gemini API for session ${request.sessionId}`);
    const result = await model.generateContent([evaluationPrompt, audioPart]);
    const response = await result.response;
    
    console.log(`[processTripleStepEvaluation] Received response from Gemini for session ${request.sessionId}`);
    const jsonResponse = JSON.parse(response.text());
    console.log(`[processTripleStepEvaluation] Parsed evaluation result for session ${request.sessionId}:`, jsonResponse);
    
    return jsonResponse;
    
  } catch (error) {
    console.error(`[processTripleStepEvaluation] Gemini API error for session ${request.sessionId}:`, error);
    
    // Provide fallback evaluation based on transcription and game data
    console.log(`[processTripleStepEvaluation] Using fallback evaluation for session ${request.sessionId}`);
    return generateFallbackEvaluation(request);
  }
};

const generateFallbackEvaluation = (request) => {
  console.log(`[generateFallbackEvaluation] Generating fallback evaluation for session ${request.sessionId}`);
  
  const successRate = request.integratedWords.length / request.wordList.length;
  const timeEfficiency = request.actualTime / request.totalTime;
  
  // Calculate scores based on game performance metrics
  const primaryScore = Math.round(successRate * 10);
  const secondaryScore = Math.round(Math.min(10, successRate * 8 + 2)); // Bonus for attempting
  const tertiaryScore = request.transcription.length > 50 ? 7 : 5; // Basic coherence check
  const recoveryScore = request.missedWords.length > 0 ? 6 : 8; // Recovery from missed words
  
  const overallScore = Math.round((primaryScore + secondaryScore + tertiaryScore + recoveryScore) / 4);
  
  return {
    primary: {
      score: primaryScore,
      feedback: `Successfully integrated ${request.integratedWords.length} out of ${request.wordList.length} words (${Math.round(successRate * 100)}% success rate). ${successRate >= 0.7 ? 'Excellent word integration!' : successRate >= 0.5 ? 'Good effort with room for improvement.' : 'More practice needed for better integration.'}`,
      wordsIntegrated: request.integratedWords.length,
      wordsMissed: request.missedWords.length
    },
    secondary: {
      score: secondaryScore,
      feedback: `Based on the transcription length and word integration success, the speech flow appears ${successRate >= 0.7 ? 'smooth and natural' : successRate >= 0.5 ? 'generally coherent' : 'somewhat choppy'}. Focus on making word integrations feel more natural in future attempts.`,
      smoothIntegrations: request.integratedWords,
      awkwardIntegrations: request.missedWords
    },
    tertiary: {
      score: tertiaryScore,
      feedback: `The speech maintained ${request.transcription.length > 100 ? 'good' : 'basic'} topic coherence with ${request.transcription.length} characters of content. ${request.transcription.length > 100 ? 'Strong focus on the main topic.' : 'Consider expanding on the main topic more.'}`,
      coherenceLevel: request.transcription.length > 100 ? 'Good' : 'Fair'
    },
    recovery: {
      score: recoveryScore,
      feedback: `Handled ${request.missedWords.length} missed words. ${request.missedWords.length === 0 ? 'Excellent - no words were missed!' : request.missedWords.length <= 2 ? 'Good recovery from missed words.' : 'Work on strategies to handle difficult word integrations.'}`,
      recoveryStrategies: request.missedWords.length > 0 ? ['Continued speech flow', 'Maintained topic focus'] : ['Perfect integration']
    },
    overall: {
      score: overallScore,
      feedback: `Overall performance shows ${overallScore >= 8 ? 'excellent' : overallScore >= 6 ? 'good' : 'developing'} skills in the Triple Step challenge. ${overallScore >= 8 ? 'Outstanding work!' : overallScore >= 6 ? 'Good foundation with room for growth.' : 'Keep practicing to improve your skills.'}`,
      strengths: [
        `Integrated ${request.integratedWords.length} words successfully`,
        `Maintained speech flow for ${request.actualTime} seconds`,
        request.transcription.length > 50 ? 'Good content generation' : 'Basic speech structure'
      ],
      areasForImprovement: [
        successRate < 0.7 ? 'Increase word integration success rate' : 'Maintain current integration skills',
        request.missedWords.length > 0 ? 'Develop better recovery strategies' : 'Continue perfect integration',
        request.transcription.length < 100 ? 'Expand speech content' : 'Maintain content quality'
      ]
    }
  };
};

// Get Triple Step session status and results
const getTripleStepSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`[getTripleStepSessionStatus] Request for session: ${sessionId}`);
    
    if (!sessionId) {
      console.log(`[getTripleStepSessionStatus] Error: No session ID provided`);
      return res.status(400).json({ error: "Session ID is required." });
    }

    const session = tripleStepSessions.get(sessionId);
    
    if (!session) {
      console.log(`[getTripleStepSessionStatus] Error: Session ${sessionId} not found`);
      return res.status(404).json({ error: "Session not found." });
    }

    const response = {
      sessionId,
      status: session.status,
      topic: session.topic,
      wordList: session.wordList,
      integratedWords: session.integratedWords,
      missedWords: session.missedWords,
      transcription: session.transcription,
      totalTime: session.totalTime,
      actualTime: session.actualTime,
      completedEarly: session.completedEarly,
      evaluation: session.evaluation,
      audioFile: session.audioFile,
      createdAt: session.createdAt,
      completedAt: session.completedAt
    };

    console.log(`[getTripleStepSessionStatus] Session ${sessionId} status:`, {
      status: session.status,
      topic: session.topic,
      integratedWords: session.integratedWords?.length || 0,
      missedWords: session.missedWords?.length || 0
    });

    res.json(response);

  } catch (error) {
    console.error(`[getTripleStepSessionStatus] Error getting session status for ${req.params.sessionId}:`, error);
    res.status(500).json({ error: "Failed to get session status." });
  }
};

// Serve Triple Step audio file
const serveTripleStepAudioFile = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`[serveTripleStepAudioFile] Request for audio: session ${sessionId}`);
    
    const audioFileName = `${sessionId}_triple_step.webm`;
    const audioFilePath = path.join(AUDIO_STORAGE_DIR, audioFileName);
    
    if (!fs.existsSync(audioFilePath)) {
      console.log(`[serveTripleStepAudioFile] Audio file not found: ${audioFileName}`);
      return res.status(404).json({ error: "Audio file not found" });
    }
    
    console.log(`[serveTripleStepAudioFile] Serving audio file: ${audioFileName}`);
    res.sendFile(audioFilePath);
    
  } catch (error) {
    console.error(`[serveTripleStepAudioFile] Error serving audio file:`, error);
    res.status(500).json({ error: "Failed to serve audio file" });
  }
};

// Cleanup old Triple Step sessions and audio files
const cleanupOldTripleStepSessions = () => {
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  console.log(`[cleanupOldTripleStepSessions] Current sessions:`, Array.from(tripleStepSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    status: session.status,
    topic: session.topic,
    createdAt: new Date(session.createdAt).toISOString()
  })));
  
  // Clean up old sessions
  for (const [sessionId, session] of tripleStepSessions.entries()) {
    if (session.createdAt < twentyFourHoursAgo) {
      tripleStepSessions.delete(sessionId);
      console.log(`[cleanupOldTripleStepSessions] Cleaned up old session: ${sessionId}`);
    }
  }
  
  // Clean up old audio files
  try {
    const files = fs.readdirSync(AUDIO_STORAGE_DIR);
         for (const file of files) {
       if (file.includes('_triple_step.webm')) {
         const filePath = path.join(AUDIO_STORAGE_DIR, file);
         const stats = fs.statSync(filePath);
         if (stats.mtime.getTime() < twentyFourHoursAgo) {
           fs.unlinkSync(filePath);
           console.log(`[cleanupOldTripleStepSessions] Cleaned up old audio file: ${file}`);
         }
       }
     }
  } catch (error) {
    console.error(`[cleanupOldTripleStepSessions] Error cleaning up audio files: ${error}`);
  }
};

// Debug endpoint for Triple Step sessions
const debugTripleStepState = async (req, res) => {
  console.log(`[debugTripleStepState] Debug request received`);
  
  const debugInfo = {
    totalSessions: tripleStepSessions.size,
    sessions: Array.from(tripleStepSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      status: session.status,
      topic: session.topic,
      integratedWords: session.integratedWords?.length || 0,
      missedWords: session.missedWords?.length || 0,
      createdAt: new Date(session.createdAt).toISOString(),
      completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null
    }))
  };
  
  console.log(`[debugTripleStepState] Current state:`, debugInfo);
  res.json(debugInfo);
};

// Run cleanup every hour
setInterval(cleanupOldTripleStepSessions, 60 * 60 * 1000);

module.exports = {
  evaluateTripleStep,
  getTripleStepSessionStatus,
  serveTripleStepAudioFile,
  debugTripleStepState,
};
