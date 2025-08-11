const databaseService = require('./databaseService');

class AnalyticsController {
    // Get comprehensive user progress analytics
    async getUserProgressAnalytics(req, res) {
        try {
            const { userId } = req.params;
            const { timeframe = '30d' } = req.query; // 7d, 30d, 90d, all

            // Get user's game sessions
            const allSessions = await databaseService.getUserGameSessions(userId);
            
            // Filter sessions by timeframe
            const filteredSessions = this.filterSessionsByTimeframe(allSessions, timeframe);
            
            // Calculate comprehensive analytics
            const analytics = {
                overview: this.calculateOverviewStats(filteredSessions),
                gameBreakdown: this.calculateGameBreakdown(filteredSessions),
                skillProgress: this.calculateSkillProgress(filteredSessions),
                trends: this.calculateTrends(filteredSessions),
                achievements: this.calculateAchievements(filteredSessions),
                recommendations: this.generateRecommendations(filteredSessions)
            };

            res.json({
                success: true,
                analytics,
                timeframe
            });
        } catch (error) {
            console.error('Error fetching user progress analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch progress analytics'
            });
        }
    }

    // Get detailed skill analytics
    async getSkillAnalytics(req, res) {
        try {
            const { userId } = req.params;
            const { skill, gameType } = req.query;

            const sessions = await databaseService.getUserGameSessions(userId);
            const skillData = this.analyzeSkillPerformance(sessions, skill, gameType);

            res.json({
                success: true,
                skillData
            });
        } catch (error) {
            console.error('Error fetching skill analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch skill analytics'
            });
        }
    }

    // Get achievement progress
    async getAchievementProgress(req, res) {
        try {
            const { userId } = req.params;
            const sessions = await databaseService.getUserGameSessions(userId);
            const achievements = this.calculateAchievements(sessions);

            res.json({
                success: true,
                achievements
            });
        } catch (error) {
            console.error('Error fetching achievement progress:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch achievement progress'
            });
        }
    }

    // Helper methods
    filterSessionsByTimeframe(sessions, timeframe) {
        const now = new Date();
        let cutoffDate;

        switch (timeframe) {
            case '7d':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                return sessions; // 'all' - return all sessions
        }

        return sessions.filter(session => new Date(session.created_at) >= cutoffDate);
    }

    calculateOverviewStats(sessions) {
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.completed).length;
        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        // Calculate average scores across all games
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

        // Calculate improvement rate (comparing first half vs second half of sessions)
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
            averageSessionDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0
        };
    }

    calculateGameBreakdown(sessions) {
        const gameStats = {};
        const gameTypes = ['rapid-fire', 'conductor', 'triple-step'];

        gameTypes.forEach(gameType => {
            const gameSessions = sessions.filter(s => s.game_type === gameType);
            const completedSessions = gameSessions.filter(s => s.completed);
            
            const totalDuration = gameSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const averageScore = this.calculateAverageScore(gameSessions);
            
            gameStats[gameType] = {
                totalSessions: gameSessions.length,
                completedSessions: completedSessions.length,
                completionRate: gameSessions.length > 0 ? (completedSessions.length / gameSessions.length) * 100 : 0,
                totalDuration,
                averageScore: Math.round(averageScore * 10) / 10,
                averageSessionDuration: gameSessions.length > 0 ? Math.round(totalDuration / gameSessions.length) : 0,
                lastPlayed: gameSessions.length > 0 ? 
                    new Date(Math.max(...gameSessions.map(s => new Date(s.created_at)))) : null
            };
        });

        return gameStats;
    }

    calculateSkillProgress(sessions) {
        const skills = {
            responseSpeed: { scores: [], trend: 0 },
            energyRange: { scores: [], trend: 0 },
            contentContinuity: { scores: [], trend: 0 },
            breathRecovery: { scores: [], trend: 0 },
            overallPerformance: { scores: [], trend: 0 }
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

        // Calculate trends for each skill
        Object.keys(skills).forEach(skill => {
            const skillData = skills[skill];
            if (skillData.scores.length >= 2) {
                skillData.trend = this.calculateTrend(skillData.scores.map(s => s.score));
            }
            skillData.averageScore = skillData.scores.length > 0 ? 
                skillData.scores.reduce((sum, s) => sum + s.score, 0) / skillData.scores.length : 0;
        });

        return skills;
    }

    calculateTrends(sessions) {
        const weeklyData = {};
        const monthlyData = {};

        // Group sessions by week and month
        sessions.forEach(session => {
            const date = new Date(session.created_at);
            const weekKey = this.getWeekKey(date);
            const monthKey = this.getMonthKey(date);

            if (!weeklyData[weekKey]) weeklyData[weekKey] = [];
            if (!monthlyData[monthKey]) monthlyData[monthKey] = [];

            weeklyData[weekKey].push(session);
            monthlyData[monthKey].push(session);
        });

        return {
            weekly: this.calculateTrendData(weeklyData),
            monthly: this.calculateTrendData(monthlyData)
        };
    }

    calculateAchievements(sessions) {
        const achievements = {
            firstSession: { unlocked: sessions.length > 0, date: sessions[0]?.created_at },
            tenSessions: { unlocked: sessions.length >= 10, date: sessions.length >= 10 ? sessions[9]?.created_at : null },
            fiftySessions: { unlocked: sessions.length >= 50, date: sessions.length >= 50 ? sessions[49]?.created_at : null },
            hundredSessions: { unlocked: sessions.length >= 100, date: sessions.length >= 100 ? sessions[99]?.created_at : null },
            
            // Score-based achievements
            highScorer: { unlocked: false, date: null },
            consistentPerformer: { unlocked: false, date: null },
            improvementMaster: { unlocked: false, date: null },
            
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

    generateRecommendations(sessions) {
        const recommendations = [];

        if (sessions.length === 0) {
            recommendations.push({
                type: 'getting_started',
                title: 'Start Your Journey',
                description: 'Complete your first session to begin tracking your progress!',
                priority: 'high'
            });
            return recommendations;
        }

        // Analyze weak areas
        const skillProgress = this.calculateSkillProgress(sessions);
        const weakSkills = Object.entries(skillProgress)
            .filter(([skill, data]) => data.averageScore < 6)
            .sort((a, b) => a[1].averageScore - b[1].averageScore);

        if (weakSkills.length > 0) {
            const weakestSkill = weakSkills[0];
            recommendations.push({
                type: 'skill_improvement',
                title: `Focus on ${this.formatSkillName(weakestSkill[0])}`,
                description: `Your ${this.formatSkillName(weakestSkill[0])} score is ${weakestSkill[1].averageScore.toFixed(1)}/10. Try practicing more to improve this skill.`,
                priority: 'high',
                skill: weakestSkill[0]
            });
        }

        // Check for consistency
        const gameBreakdown = this.calculateGameBreakdown(sessions);
        const gameTypes = Object.keys(gameBreakdown);
        const playedGames = gameTypes.filter(game => gameBreakdown[game].totalSessions > 0);

        if (playedGames.length < 3) {
            const unplayedGames = gameTypes.filter(game => gameBreakdown[game].totalSessions === 0);
            if (unplayedGames.length > 0) {
                recommendations.push({
                    type: 'try_new_game',
                    title: 'Try a New Game',
                    description: `Expand your skills by trying the ${this.formatGameName(unplayedGames[0])} game.`,
                    priority: 'medium',
                    gameType: unplayedGames[0]
                });
            }
        }

        // Check for frequency
        const recentSessions = this.filterSessionsByTimeframe(sessions, '7d');
        if (recentSessions.length < 3) {
            recommendations.push({
                type: 'practice_frequency',
                title: 'Practice Regularly',
                description: 'Try to practice at least 3 times per week for best results.',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    // Helper utility methods
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

    getWeekKey(date) {
        const year = date.getFullYear();
        const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }

    getMonthKey(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    calculateTrendData(groupedData) {
        const trendData = [];
        Object.keys(groupedData).sort().forEach(key => {
            const sessions = groupedData[key];
            const averageScore = this.calculateAverageScore(sessions);
            const totalSessions = sessions.length;
            
            trendData.push({
                period: key,
                averageScore: Math.round(averageScore * 10) / 10,
                totalSessions,
                totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
            });
        });
        return trendData;
    }

    analyzeSkillPerformance(sessions, skill, gameType) {
        const filteredSessions = gameType ? 
            sessions.filter(s => s.game_type === gameType) : sessions;

        const skillScores = filteredSessions
            .map(session => ({
                score: session.session_data?.averageScores?.[skill] || 0,
                date: new Date(session.created_at),
                gameType: session.game_type
            }))
            .filter(data => data.score > 0)
            .sort((a, b) => a.date - b.date);

        return {
            skill,
            gameType,
            totalSessions: skillScores.length,
            averageScore: skillScores.length > 0 ? 
                skillScores.reduce((sum, s) => sum + s.score, 0) / skillScores.length : 0,
            trend: this.calculateTrend(skillScores.map(s => s.score)),
            scores: skillScores,
            improvement: skillScores.length >= 2 ? 
                skillScores[skillScores.length - 1].score - skillScores[0].score : 0
        };
    }

    formatSkillName(skill) {
        return skill.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Overall Performance', 'Overall Performance');
    }

    formatGameName(gameType) {
        const gameNames = {
            'rapid-fire': 'Rapid Fire Analogies',
            'conductor': 'The Conductor',
            'triple-step': 'Triple Step'
        };
        return gameNames[gameType] || gameType;
    }
}

module.exports = new AnalyticsController();
