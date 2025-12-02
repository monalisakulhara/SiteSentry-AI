const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Website = require('../models/Website');
const Backup = require('../models/Backup');
const ScanResult = require('../models/ScanResult');
const axios = require('axios');
const AWS = require('aws-sdk');

// --- 1. Import Google Gemini SDK ---
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
// Ensure GEMINI_API_KEY is in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure AWS S3 (Keep your existing config)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// ... [Keep your existing Uptime, Backup, and Scan routes here] ...
// (For brevity, I'm focusing on the AI part. Do not delete your other routes!)

// --- E. Real AI Content Assistant ---
router.post('/ai-process', async (req, res, next) => {
    console.log(`Received request for AI processing.`);
    try {
        const { command } = req.body;
        
        // Check authentication
        if (!req.user || !req.user.id) {
             return res.status(401).json({ error: "Authentication required." });
        }

        const website = await Website.findOne({ userId: req.user.id });

        if (!website) {
            return res.status(404).json({ error: 'No connected website found for this user.' });
        }
        if (!command || typeof command !== 'string') {
             return res.status(400).json({ error: 'Invalid or missing command.' });
        }

        // 1. Process with Gemini API
        console.log("Sending command to Gemini:", command);
        const structuredCommand = await processCommandWithGemini(command);
        console.log("AI Converted Command:", structuredCommand);

        if (!structuredCommand || structuredCommand.action === 'error') {
             return res.status(400).json({ error: 'AI could not understand the command. Please try again.' });
        }

        // 2. Execute Structured Command via Connector Plugin
        console.log(`Sending AI command to connector: ${website.connectorUrl}/ai-execute`);
        const connectorResponse = await axios.post(`${website.connectorUrl}/ai-execute`, {
            apiKey: website.apiKey,
            command: structuredCommand
        }, { timeout: 60000 }); // 60 second timeout

        // 3. Handle Connector's Response
        if (connectorResponse.data && connectorResponse.data.success) {
            res.json({ 
                success: true, 
                message: connectorResponse.data.message || 'AI command executed successfully.',
                action: structuredCommand.action
            });
        } else {
             throw new Error(connectorResponse.data.message || 'Connector failed to execute the command.');
        }

    } catch (error) {
        console.error('!!! ERROR IN /api/automation/ai-process ROUTE !!!', error.message);
        res.status(500).json({ error: error.message || 'Server error during AI process execution' });
    }
});

// --- HELPER: Gemini Integration ---
async function processCommandWithGemini(userCommand) {
    try {
        // Use the 'gemini-1.5-flash' model for speed and cost-effectiveness
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // System prompt to force JSON output compatible with our WordPress plugin
        const prompt = `
        You are a WordPress automation assistant. Transform the user's natural language request into a specific JSON command.
        
        The user wants to: "${userCommand}"

        You must output ONLY valid JSON. No markdown, no explanations.
        
        Supported Actions and Formats:
        
        1. IF the user wants to write a blog post, article, or content:
           {
             "action": "create_post",
             "title": "A creative title based on the request",
             "content": "The full HTML body of the post. Write at least 3 paragraphs. Use <h2> for headings."
           }
        
        2. IF the user wants to change a site option (like business hours, tagline, email):
           {
             "action": "update_option",
             "key": "inferred_wordpress_option_key", 
             "value": "The new value"
           }
           (Examples of keys: 'blogname', 'blogdescription', 'admin_email', 'business_hours')

        3. IF the request is unclear, unsafe, or impossible:
           { "action": "error" }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up the response (remove potential markdown code blocks)
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonString);

    } catch (err) {
        console.error("Gemini API Error:", err);
        return { action: 'error' };
    }
}

module.exports = router;