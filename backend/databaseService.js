const supabase = require('./supabaseClient');

class DatabaseService {
    // User operations
    async createUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async getUserById(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    }

    async getUserByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
        return data;
    }

    async updateUser(userId, updateData) {
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Game session operations
    async createGameSession(sessionData) {
        const { data, error } = await supabase
            .from('game_sessions')
            .insert([sessionData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateGameSession(sessionId, updateData) {
        const { data, error } = await supabase
            .from('game_sessions')
            .update(updateData)
            .eq('id', sessionId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    async getUserGameSessions(userId, gameType = null) {
        let query = supabase
            .from('game_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (gameType) {
            query = query.eq('game_type', gameType);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getGameSession(sessionId) {
        const { data, error } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        
        if (error) throw error;
        return data;
    }

    // User game stats operations
    async updateUserGameStats(userId, gameType, sessionData) {
        // First, try to get existing stats
        const { data: existingStats } = await supabase
            .from('user_game_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('game_type', gameType)
            .single();

        const updateData = {
            user_id: userId,
            game_type: gameType,
            total_sessions: (existingStats?.total_sessions || 0) + 1,
            total_duration: (existingStats?.total_duration || 0) + (sessionData.duration || 0),
            last_played: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Calculate average energy level if provided
        if (sessionData.energy_levels && Array.isArray(sessionData.energy_levels)) {
            const avgEnergy = sessionData.energy_levels.reduce((sum, level) => sum + level, 0) / sessionData.energy_levels.length;
            updateData.average_energy_level = avgEnergy;
        }

        if (existingStats) {
            const { data, error } = await supabase
                .from('user_game_stats')
                .update(updateData)
                .eq('user_id', userId)
                .eq('game_type', gameType)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } else {
            updateData.created_at = new Date().toISOString();
            const { data, error } = await supabase
                .from('user_game_stats')
                .insert([updateData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    }

    async getUserGameStats(userId) {
        const { data, error } = await supabase
            .from('user_game_stats')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        return data;
    }

    // Enhanced progress tracking methods
    async getUserProgressSummary(userId) {
        const sessions = await this.getUserGameSessions(userId);
        const stats = await this.getUserGameStats(userId);
        
        // Calculate comprehensive progress metrics
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.completed).length;
        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        // Calculate average scores
        const allScores = [];
        sessions.forEach(session => {
            if (session.session_data?.averageScores) {
                Object.values(session.session_data.averageScores).forEach(score => {
                    if (typeof score === 'number') allScores.push(score);
                });
            }
        });
        
        const averageScore = allScores.length > 0 ? 
            allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
        
        // Calculate improvement trend
        const sortedSessions = sessions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const midPoint = Math.floor(sortedSessions.length / 2);
        const firstHalf = sortedSessions.slice(0, midPoint);
        const secondHalf = sortedSessions.slice(midPoint);
        
        const firstHalfAvg = this.calculateAverageScore(firstHalf);
        const secondHalfAvg = this.calculateAverageScore(secondHalf);
        const improvementRate = firstHalfAvg > 0 ? 
            ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
        
        return {
            totalSessions,
            completedSessions,
            completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
            totalDuration,
            averageScore: Math.round(averageScore * 10) / 10,
            improvementRate: Math.round(improvementRate * 10) / 10,
            averageSessionDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
            lastSessionDate: sessions.length > 0 ? sessions[sessions.length - 1].created_at : null,
            streakDays: this.calculateStreakDays(sessions)
        };
    }

    async getUserSkillBreakdown(userId) {
        const sessions = await this.getUserGameSessions(userId);
        const skills = {
            responseSpeed: { scores: [], average: 0, trend: 0 },
            energyRange: { scores: [], average: 0, trend: 0 },
            contentContinuity: { scores: [], average: 0, trend: 0 },
            breathRecovery: { scores: [], average: 0, trend: 0 },
            overallPerformance: { scores: [], average: 0, trend: 0 }
        };
        
        // Collect scores for each skill
        sessions.forEach(session => {
            if (session.session_data?.averageScores) {
                Object.keys(skills).forEach(skill => {
                    const score = session.session_data.averageScores[skill];
                    if (typeof score === 'number') {
                        skills[skill].scores.push({
                            score,
                            date: new Date(session.created_at),
                            gameType: session.game_type
                        });
                    }
                });
            }
        });
        
        // Calculate averages and trends
        Object.keys(skills).forEach(skill => {
            const skillData = skills[skill];
            if (skillData.scores.length > 0) {
                skillData.average = skillData.scores.reduce((sum, s) => sum + s.score, 0) / skillData.scores.length;
                skillData.trend = this.calculateTrend(skillData.scores.map(s => s.score));
            }
        });
        
        return skills;
    }

    async getUserAchievements(userId) {
        const sessions = await this.getUserGameSessions(userId);
        
        const achievements = {
            firstSession: { unlocked: sessions.length > 0, date: sessions[0]?.created_at },
            tenSessions: { unlocked: sessions.length >= 10, date: sessions.length >= 10 ? sessions[9]?.created_at : null },
            fiftySessions: { unlocked: sessions.length >= 50, date: sessions.length >= 50 ? sessions[49]?.created_at : null },
            hundredSessions: { unlocked: sessions.length >= 100, date: sessions.length >= 100 ? sessions[99]?.created_at : null },
            
            // Score-based achievements
            highScorer: { unlocked: false, date: null },
            consistentPerformer: { unlocked: false, date: null },
            
            // Game-specific achievements
            rapidFireMaster: { unlocked: false, date: null },
            conductorPro: { unlocked: false, date: null },
            tripleStepExpert: { unlocked: false, date: null }
        };
        
        // Check score-based achievements
        const allScores = [];
        sessions.forEach(session => {
            if (session.session_data?.averageScores?.overall) {
                allScores.push(session.session_data.averageScores.overall);
            }
        });
        
        if (allScores.length > 0) {
            const maxScore = Math.max(...allScores);
            const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
            
            if (maxScore >= 8) {
                achievements.highScorer.unlocked = true;
                achievements.highScorer.date = sessions.find(s => 
                    s.session_data?.averageScores?.overall === maxScore
                )?.created_at;
            }
            
            if (avgScore >= 7 && allScores.length >= 5) {
                achievements.consistentPerformer.unlocked = true;
                achievements.consistentPerformer.date = sessions[sessions.length - 1]?.created_at;
            }
        }
        
        // Check game-specific achievements
        const gameCounts = {};
        sessions.forEach(session => {
            gameCounts[session.game_type] = (gameCounts[session.game_type] || 0) + 1;
        });
        
        if (gameCounts['rapid-fire'] >= 20) {
            achievements.rapidFireMaster.unlocked = true;
            achievements.rapidFireMaster.date = sessions.find(s => s.game_type === 'rapid-fire')?.created_at;
        }
        
        if (gameCounts['conductor'] >= 15) {
            achievements.conductorPro.unlocked = true;
            achievements.conductorPro.date = sessions.find(s => s.game_type === 'conductor')?.created_at;
        }
        
        if (gameCounts['triple-step'] >= 10) {
            achievements.tripleStepExpert.unlocked = true;
            achievements.tripleStepExpert.date = sessions.find(s => s.game_type === 'triple-step')?.created_at;
        }
        
        return achievements;
    }

    // Helper methods
    calculateAverageScore(sessions) {
        const scores = [];
        sessions.forEach(session => {
            if (session.session_data?.averageScores?.overall) {
                scores.push(session.session_data.averageScores.overall);
            }
        });
        return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    }

    calculateTrend(scores) {
        if (scores.length < 2) return 0;
        
        const n = scores.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = scores.reduce((sum, score) => sum + score, 0);
        const sumXY = scores.reduce((sum, score, index) => sum + (score * index), 0);
        const sumX2 = scores.reduce((sum, score, index) => sum + (index * index), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    calculateStreakDays(sessions) {
        if (sessions.length === 0) return 0;
        
        const sortedSessions = sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let streak = 0;
        let currentDate = today;
        
        for (let i = 0; i < sortedSessions.length; i++) {
            const sessionDate = new Date(sortedSessions[i].created_at);
            sessionDate.setHours(0, 0, 0, 0);
            
            if (sessionDate.getTime() === currentDate.getTime()) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (sessionDate.getTime() < currentDate.getTime()) {
                break;
            }
        }
        
        return streak;
    }
}

module.exports = new DatabaseService();