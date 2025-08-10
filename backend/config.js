require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'demo_key',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://demo.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'demo_key',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/oratora'
};
