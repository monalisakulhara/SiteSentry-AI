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

// Initialize Gemini (Ensure GEMINI_API_KEY is in your .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// --- A. Uptime Monitoring ---
router.get('/check-uptime', async (req, res, next) => {
  console.log(`Received request for /api/automation/check-uptime`);
  try {
     if (!req.user || !req.user.id) {
         return res.status(401).json({ error: "Authentication required." });
     }
    const websites = await Website.find({ userId: req.user.id });
    const results = [];

    for (const site of websites) {
      try {
        const response = await axios.get(site.url, { timeout: 10000 });
        site.status = response.status >= 200 && response.status < 300 ? 'UP' : 'DOWN';
        
        // Simple logic: update status
        site.lastStatus = site.status;
        await site.save();
        results.push({ url: site.url, status: site.status });
      } catch (error) {
        site.status = 'DOWN';
        site.lastStatus = 'DOWN';
        await site.save();
        results.push({ url: site.url, status: 'DOWN', error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
     next(error);
  }
});

// --- B. Automated Cloud Backups ---
router.post('/run-backups', async (req, res, next) => {
  console.log(`Received request for /api/automation/run-backups`);
  try {
     if (!req.user || !req.user.id) return res.status(401).json({ error: "Authentication required." });

    // Find all sites due for backup OR all sites if manual trigger (simplified for demo)
    // For manual trigger, we'll just backup ALL sites for this user to be safe
    const sitesToBackup = await Website.find({ userId: req.user.id });

    console.log(`Found ${sitesToBackup.length} sites to back up.`);
    let processedCount = 0;

    for (const site of sitesToBackup) {
      console.log(`Processing backup for site: ${site.url}`);
      try {
        // Trigger backup on connector plugin
        const connectorResponse = await axios.post(`${site.connectorUrl}/run-backup`, {
          apiKey: site.apiKey
        }, { timeout: 300000 }); // 5 minute timeout

        if (!connectorResponse.data || !connectorResponse.data.success) {
            throw new Error('Connector failed to complete backup.');
        }

        // Record successful backup
         await Backup.create({
           websiteId: site._id,
           status: 'success',
           size: connectorResponse.data.size,
           s3Path: connectorResponse.data.s3Path // This comes from our PHP script now!
         });

        // Schedule next backup
        site.nextBackup = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await site.save();
        processedCount++;

      } catch (error) {
         console.error(`Error processing backup for ${site.url}:`, error.message);
         await Backup.create({
          websiteId: site._id,
          status: 'failed',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.json({ success: true, processed: processedCount });
  } catch (error) {
     next(error);
  }
});

// --- C. Security Scanning ---
router.post('/run-scans', async (req, res, next) => {
  console.log(`Received request for /api/automation/run-scans`);
  try {
     if (!req.user || !req.user.id) return res.status(401).json({ error: "Authentication required." });

    // Scan ALL sites for this user when manually triggered
    const sitesDue = await Website.find({ userId: req.user.id });
    
    let processedCount = 0;
    for (const site of sitesDue) {
      console.log(`Processing scan for site: ${site.url}`);
      try {
        const signatures = await getLatestSignatures();
        
        // Trigger scan on connector plugin
        const connectorResponse = await axios.post(`${site.connectorUrl}/run-scan`, {
          apiKey: site.apiKey,
          signatures
        }, { timeout: 300000 });

        if (!connectorResponse.data || !connectorResponse.data.success) {
          throw new Error('Connector failed scan.');
        }

        await ScanResult.create({
          websiteId: site._id,
          cleanFiles: connectorResponse.data.cleanFiles,
          infectedFiles: connectorResponse.data.infectedFiles,
          suspiciousFiles: connectorResponse.data.suspiciousFiles,
          status: 'success'
        });

        site.nextScan = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await site.save();
        processedCount++;

      } catch (error) {
        console.error(`Error scanning ${site.url}:`, error.message);
        await ScanResult.create({
          websiteId: site._id,
          cleanFiles: 0, infectedFiles: 0, suspiciousFiles: 0,
          error: error.message,
          status: 'failed'
        });
      }
    }
    res.json({ success: true, processed: processedCount });
  } catch (error) {
    next(error);
  }
});

// --- D. Smart Updater (Placeholder) ---
router.post('/run-updates', async (req, res, next) => {
   res.status(501).json({ error: "Smart Updater feature not fully implemented yet." });
});

// --- E. Real AI Content Assistant ---
router.post('/ai-process', async (req, res, next) => {
    console.log(`Received request for AI processing.`);
    try {
        const { command } = req.body;
        if (!req.user || !req.user.id) return res.status(401).json({ error: "Authentication required." });

        const website = await Website.findOne({ userId: req.user.id });
        if (!website) return res.status(404).json({ error: 'No connected website found.' });
        if (!command) return res.status(400).json({ error: 'Missing command.' });

        // 1. Process with Gemini API
        const structuredCommand = await processCommandWithGemini(command);
        console.log("AI Command:", structuredCommand);

        if (!structuredCommand || structuredCommand.action === 'error') {
             return res.status(400).json({ error: 'AI could not understand the command.' });
        }

        // 2. Execute via Connector
        const connectorResponse = await axios.post(`${website.connectorUrl}/ai-execute`, {
            apiKey: website.apiKey,
            command: structuredCommand
        }, { timeout: 60000 });

        // 3. Handle Response
        if (connectorResponse.data && connectorResponse.data.success) {
            res.json({ 
                success: true, 
                message: connectorResponse.data.message || 'AI command executed.',
                action: structuredCommand.action
            });
        } else {
             throw new Error(connectorResponse.data.message || 'Connector failed.');
        }

    } catch (error) {
        console.error('AI Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- Helper Functions ---

async function getLatestSignatures() {
  const signaturesPath = path.join(__dirname, '..', 'malware-signatures.json');
  try {
      if (fs.existsSync(signaturesPath)) {
          const data = await fs.promises.readFile(signaturesPath, 'utf8');
          return JSON.parse(data);
      }
      return {};
  } catch (err) {
      return {};
  }
}

async function processCommandWithGemini(userCommand) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        You are a WordPress automation assistant. Transform the user's request into a specific JSON command.
        User request: "${userCommand}"
        Output ONLY valid JSON.
        
        1. For blog posts:
           { "action": "create_post", "title": "...", "content": "HTML content..." }
        
        2. For site options:
           { "action": "update_option", "key": "...", "value": "..." }

        3. If unclear: { "action": "error" }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (err) {
        console.error("Gemini API Error:", err);
        return { action: 'error' };
    }
}

module.exports = router;