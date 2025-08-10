const databaseService = require('./databaseService');

class UserController {
    async signup(req, res) {
        try {
            const { name, email, age } = req.body;
            
            // Validate required fields
            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and email are required'
                });
            }
            
            // Check if user already exists
            const existingUser = await databaseService.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
            
            const user = await databaseService.createUser({ name, email, age });
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    age: user.age
                },
                message: 'User created successfully'
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
    }

    async login(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }
            
            const user = await databaseService.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    age: user.age
                },
                message: 'Login successful'
            });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to login'
            });
        }
    }

    async createUser(req, res) {
        try {
            const { name, email, age } = req.body;
            
            // Check if user already exists
            if (email) {
                const existingUser = await databaseService.getUserByEmail(email);
                if (existingUser) {
                    return res.json({
                        success: true,
                        user: existingUser,
                        message: 'User already exists'
                    });
                }
            }
            
            const user = await databaseService.createUser({ name, email, age });
            
            res.json({
                success: true,
                user,
                message: 'User created successfully'
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
    }

    async getUserStats(req, res) {
        try {
            const { userId } = req.params;
            
            const stats = await databaseService.getUserGameStats(userId);
            const sessions = await databaseService.getUserGameSessions(userId);
            
            res.json({
                success: true,
                stats,
                recentSessions: sessions.slice(0, 10) // Last 10 sessions
            });
        } catch (error) {
            console.error('Error fetching user stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user stats'
            });
        }
    }

    async getUserSessions(req, res) {
        try {
            const { userId } = req.params;
            const { gameType } = req.query;
            
            const sessions = await databaseService.getUserGameSessions(userId, gameType);
            
            res.json({
                success: true,
                sessions
            });
        } catch (error) {
            console.error('Error fetching user sessions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user sessions'
            });
        }
    }

    async getUserProfile(req, res) {
        try {
            const { userId } = req.params;
            
            const user = await databaseService.getUserById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const stats = await databaseService.getUserGameStats(userId);
            const sessions = await databaseService.getUserGameSessions(userId);
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    age: user.age,
                    created_at: user.created_at
                },
                stats,
                recentSessions: sessions.slice(0, 5) // Last 5 sessions
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user profile'
            });
        }
    }
}

module.exports = new UserController();