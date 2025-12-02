const express = require('express');
const router = express.Router();
const fs = require('fs'); // Import Node.js file system module
const path = require('path'); // Import path module
const Website = require('../models/Website'); //
const Backup = require('../models/Backup'); //
const ScanResult = require('../models/ScanResult'); //
const UpdateResult = require('../models/UpdateResult'); // Assuming you have this model
const axios = require('axios');
const AWS = require('aws-sdk');
// Puppeteer import seems incorrect, typically it's just 'puppeteer'
// const { Puppeteer } = require('puppeteer'); // This is likely wrong
// Correct way (install with 'npm install puppeteer'):
// const puppeteer = require('puppeteer'); 

// --- 1. Import Google Gemini SDK ---
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
// Ensure GEMINI_API_KEY is in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// --- A. Uptime Monitoring ---
router.get('/check-uptime', async (req, res, next) => { // Added next for error handling
  console.log(`Received request for /api/automation/check-uptime at ${new Date().toISOString()}`);
  try {
    // Fetch only sites belonging to the logged-in user if triggered manually,
    // or all sites if run by a system cron job (requires different auth/logic)
    // For now, assuming it's triggered manually by logged-in user:
     if (!req.user || !req.user.id) {
         // If authMiddleware didn't run or failed, req.user might not be set
         // This check might be redundant if authMiddleware always runs first
         console.error("User not authenticated for check-uptime");
         return res.status(401).json({ error: "Authentication required." });
     }
    const websites = await Website.find({ userId: req.user.id });
    console.log(`Checking uptime for ${websites.length} sites for user ${req.user.id}`);
    const results = [];

    for (const site of websites) {
      console.log(`Checking ${site.url}...`);
      try {
        const response = await axios.get(site.url, { timeout: 10000 }); // 10 second timeout
        site.status = response.status >= 200 && response.status < 300 ? 'UP' : 'DOWN'; // More robust check
        console.log(`Status for ${site.url}: ${site.status}`);

        if (site.status === 'DOWN' && site.lastStatus !== 'DOWN') { // Check previous status, not just 'UP'
          console.log(`Site ${site.url} is DOWN, sending notification.`);
          sendNotification(site.userId, `${site.url} is DOWN`);
        } else if (site.status === 'UP' && site.lastStatus === 'DOWN') {
          console.log(`Site ${site.url} is back UP.`);
          // Optional: Send a "back UP" notification
        }

        site.lastStatus = site.status;
        await site.save();
        results.push({ url: site.url, status: site.status });
      } catch (error) {
        console.error(`Error checking ${site.url}:`, error.message);
        site.status = 'DOWN';
        if (site.lastStatus !== 'DOWN') {
          console.log(`Site ${site.url} is DOWN (on error), sending notification.`);
          sendNotification(site.userId, `${site.url} is DOWN (connection error)`);
        }
        site.lastStatus = 'DOWN';
        await site.save(); // Save status even on error
        results.push({ url: site.url, status: 'DOWN', error: error.message });
      }
    } // End for loop

    console.log("Uptime check completed.");
    res.json({ success: true, results });
  } catch (error) {
     console.error("!!! FATAL ERROR in /api/automation/check-uptime ROUTE !!!", error);
     next(error); // Pass error to the central error handler
  }
});

// --- B. Automated Cloud Backups ---
router.post('/run-backups', async (req, res, next) => { // Added next
  console.log(`Received request for /api/automation/run-backups at ${new Date().toISOString()}`);
  try {
     if (!req.user || !req.user.id) {
         console.error("User not authenticated for run-backups");
         return res.status(401).json({ error: "Authentication required." });
     }
    // If triggered manually for a specific site:
    // const siteId = req.body.websiteId; // Get site ID from request body
    // let sitesToBackup;
    // if (siteId) {
    //    const site = await Website.findOne({ _id: siteId, userId: req.user.id });
    //    sitesToBackup = site ? [site] : [];
    // } else { // Or find all sites due for backup for this user
        sitesToBackup = await Website.find({ 
          userId: req.user.id,
          nextBackup: { $lte: new Date() } 
        });
    // }

    console.log(`Found ${sitesToBackup.length} sites to back up.`);
    let processedCount = 0;

    for (const site of sitesToBackup) {
      console.log(`Processing backup for site: ${site.url}`);
      try {
        // Trigger backup on connector plugin - **CORRECTED PATH**
        console.log(`Sending backup request to connector: ${site.connectorUrl}/run-backup`);
        // Assuming connectorUrl includes the '/wp-json/sitesentry/v1' part
        const connectorResponse = await axios.post(`${site.connectorUrl}/run-backup`, {
          apiKey: site.apiKey
        }, { 
          timeout: 300000, // 5 minute timeout
          // IMPORTANT: Response from WP plugin might not be raw file data.
          // It should ideally return a status or URL after uploading to S3 itself.
          // Assuming for now it returns { success: true, size: number, s3Path: string }
          // responseType: 'stream' // Use stream if expecting large file data directly
         });
        console.log(`Backup response received from connector for ${site.url}:`, connectorResponse.data);

        // --- Simplified Logic: Assume connector uploads to S3 ---
        if (!connectorResponse.data || !connectorResponse.data.success || !connectorResponse.data.s3Path) {
            throw new Error('Connector plugin failed to complete backup or return S3 path.');
        }

        // Record successful backup
         const backupData = {
           websiteId: site._id,
           status: 'success',
           size: connectorResponse.data.size,
           s3Path: connectorResponse.data.s3Path
         };
         console.log(`Saving successful backup record for ${site.url}:`, backupData);
         await Backup.create(backupData);

        // Schedule next backup (e.g., 24 hours later)
        site.nextBackup = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await site.save();
        console.log(`Scheduled next backup for ${site.url}`);
        processedCount++;

      } catch (error) { // Inner catch for individual site backup errors
         console.error(`!!! Error processing backup for site ${site.url} (ID: ${site._id}) !!!`, error);
         await Backup.create({
          websiteId: site._id,
          status: 'failed',
          error: error.message || 'Unknown error during backup process'
        });
         // Optionally reschedule the next backup attempt sooner
         // site.nextBackup = new Date(Date.now() + 1 * 60 * 60 * 1000); // Try again in 1 hour
         // await site.save();
      }
    } // End for loop

    console.log("Finished processing backups.");
    res.json({ success: true, processed: processedCount });

  } catch (error) { // Outer catch block
     console.error("!!! FATAL ERROR in /api/automation/run-backups ROUTE !!!", error);
     next(error); // Pass to central error handler
  }
});

// --- C. Security Scanning ---
router.post('/run-scans', async (req, res, next) => { // Added next
  console.log(`Received request for /api/automation/run-scans at ${new Date().toISOString()}`);
  try {
     if (!req.user || !req.user.id) {
         console.error("User not authenticated for run-scans");
         return res.status(401).json({ error: "Authentication required." });
     }
    // Find sites due for scanning for this user
    const sitesDue = await Website.find({
      userId: req.user.id,
      nextScan: { $lte: new Date() }
    });
    console.log(`Found ${sitesDue.length} sites due for scanning.`);

    if (sitesDue.length === 0) {
      console.log("No sites due for scanning.");
      return res.json({ success: true, processed: 0, message: "No sites due for scanning right now." });
    }

    let processedCount = 0;
    for (const site of sitesDue) {
      console.log(`Processing scan for site: ${site.url}`);
      try {
        // Get latest malware signatures
        const signatures = await getLatestSignatures();
        console.log(`Loaded ${Object.keys(signatures).length} signatures.`);

        // Trigger scan on connector plugin - **CORRECTED PATH**
        console.log(`Sending scan request to connector: ${site.connectorUrl}/run-scan`);
        const connectorResponse = await axios.post(`${site.connectorUrl}/run-scan`, { // Use endpoint from plugin
          apiKey: site.apiKey,
          signatures // Send signatures to plugin
        }, { timeout: 300000 }); // 5 minute timeout

        console.log(`Scan response received from connector for ${site.url}:`, connectorResponse.data);

        // Validate response data structure
        if (typeof connectorResponse.data?.success !== 'boolean' ||
            !connectorResponse.data.success || // Ensure connector reported success
            typeof connectorResponse.data?.cleanFiles !== 'number' ||
            typeof connectorResponse.data?.infectedFiles !== 'number' ||
            typeof connectorResponse.data?.suspiciousFiles !== 'number') {
          throw new Error('Invalid or failed response structure received from connector plugin during scan.');
        }

        // Save scan results
        const scanResultData = {
          websiteId: site._id,
          cleanFiles: connectorResponse.data.cleanFiles,
          infectedFiles: connectorResponse.data.infectedFiles,
          suspiciousFiles: connectorResponse.data.suspiciousFiles,
          status: 'success' // Explicitly set success status
        };
        console.log(`Saving scan result for ${site.url}:`, scanResultData);
        await ScanResult.create(scanResultData);

        // Schedule next scan (e.g., 7 days later)
        site.nextScan = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await site.save();
        console.log(`Scheduled next scan for ${site.url}`);
        processedCount++;

      } catch (error) { // Inner catch for individual site scan errors
        console.error(`!!! Error processing scan for site ${site.url} (ID: ${site._id}) !!!`, error);
        await ScanResult.create({
          websiteId: site._id,
          cleanFiles: 0, // Default values on error
          infectedFiles: 0,
          suspiciousFiles: 0,
          error: error.message || 'Unknown error during scan process', // Store error message
          status: 'failed' // Ensure status is set correctly
        });
         // Optionally reschedule the next scan attempt sooner
         // site.nextScan = new Date(Date.now() + 1 * 60 * 60 * 1000); // Try again in 1 hour
         // await site.save();
      }
    } // End of for loop

    console.log("Finished processing scans.");
    res.json({ success: true, processed: processedCount });

  } catch (error) { // Outer catch block
    console.error("!!! FATAL ERROR IN /api/automation/run-scans ROUTE !!!", error);
    next(error); // Pass to central error handler
  }
});

// --- D. Smart Updater ---
// NOTE: Puppeteer setup and usage needs careful implementation.
// It's resource-intensive and might require a separate service.
// This is a simplified placeholder.
router.post('/run-updates', async (req, res, next) => { // Added next
   console.log(`Received request for /api/automation/run-updates at ${new Date().toISOString()}`);
   res.status(501).json({ error: "Smart Updater feature not fully implemented yet." }); // Return 'Not Implemented'
    /*
    try {
        // ... (Full implementation requires Puppeteer setup, error handling, etc.) ...
        // Find sites due, loop through them
        // Launch puppeteer, take screenshot A
        // Call connector /run-update
        // Take screenshot B
        // Compare screenshots
        // Call connector /run-rollback if needed
        // Save UpdateResult
        // Reschedule next check
    } catch (error) {
        console.error("!!! FATAL ERROR in /api/automation/run-updates ROUTE !!!", error);
        next(error);
    }
    */
});

// --- Helper Functions ---

// Load malware signatures (robustly handle missing file)
async function getLatestSignatures() {
  const signaturesPath = path.join(__dirname, '..', 'malware-signatures.json'); // Correct path relative to this file
  try {
      if (fs.existsSync(signaturesPath)) {
          const data = await fs.promises.readFile(signaturesPath, 'utf8');
          return JSON.parse(data);
      } else {
          console.warn("malware-signatures.json not found at expected path:", signaturesPath, ". Returning empty signatures.");
          // Create an empty file if it doesn't exist
          await fs.promises.writeFile(signaturesPath, '{}', 'utf8');
          return {};
      }
  } catch (err) {
      console.error("Error loading or creating malware signatures:", err);
      return {}; // Return empty object on any error
  }
}

// Screenshot comparison placeholder
async function compareScreenshots(img1, img2) {
  // TODO: Implement using a library like pixelmatch
  console.log("Comparing screenshots (simulation)...");
  return { percentage: 0 }; // Always return 0% difference for now
}

// Notification placeholder
function sendNotification(userId, message) {
  // TODO: Implement actual email/SMS/push notification
  console.log(`--- NOTIFICATION --- User ID: ${userId}, Message: ${message}`);
}
// E. AI Content Assistant
// NOTE: This route requires a library for proper AI integration (like Google Gemini API or OpenAI API).
// We use a mock function to simulate the AI's response for the assignment.
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
// --- MOCK AI HELPER FUNCTION ---
// In a real app, this would be an API call to Gemini/GPT-4 with a System Prompt.
function mockAiConversion(command) {
    command = command.toLowerCase();
    if (command.includes('hour')) {
        return { action: 'update_option', key: 'business_hours', value: '9am-6pm' };
    } else if (command.includes('blog')) {
         return { action: 'create_post', title: 'New Holiday Sale Post', content: 'Auto-generated holiday sale content.' };
    } else {
        return { action: 'error' };
    }
}
module.exports = router;