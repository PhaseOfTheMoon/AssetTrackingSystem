import { GoogleGenerativeAI } from '@google/generative-ai';

// Load API key
const apiKey = 
  process.env.GEMINI_API_KEY || 
  process.env.NEXT_PUBLIC_GEMINI_API_KEY;

console.log('=== Gemini Client Initialization ===');
console.log('API Key exists:', !!apiKey);
console.log('API Key length:', apiKey?.length);

if (!apiKey) {
  console.error('Environment variables:', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash-lite'
  // model: 'gemini-2.5-flash' remember change back
});

console.log('✅ Gemini client initialized successfully');