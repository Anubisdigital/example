// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Rate Limiting: Prevents abuse (Max 20 requests per 15 minutes per IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 20,
    message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/api/', limiter); // Apply rate limit to API routes

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is missing in .env file');
    process.exit(1);
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        // 2. System Message: Define the AI's "brain" here
        const conversation = [
            { role: "system", content: "You are a helpful scientific assistant. Use logic and evidence-based reasoning." },
            ...messages
        ];

        const response = await axios.post(
            GROQ_API_URL,
            {
                model: MODEL,
                messages: conversation,
                temperature: 0.7,
                max_tokens: 1000 // Increased slightly for more detailed answers
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10-second timeout so the server doesn't hang
            }
        );

        const botReply = response.data.choices[0].message.content;
        res.json({ reply: botReply });

    } catch (error) {
        // Detailed error logging for you, but generic message for the user
        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'AI service unavailable';
        
        console.error(`Groq Error (${status}):`, message);
        res.status(status).json({ error: 'Failed to get response from AI' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
