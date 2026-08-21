import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? '' : 'speakup-secret-key-ghana-2025');

if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is required in production mode!');
  process.exit(1);
}

export const config = {
  env: NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: JWT_SECRET || 'speakup-secret-key-ghana-2025',
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), 'speakup.db'),
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};
