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
}

module.exports = new DatabaseService();