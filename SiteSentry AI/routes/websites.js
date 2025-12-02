const express = require('express');
const router = express.Router();

// Import all your database models
const Website = require('../models/Website');
const Backup = require('../models/Backup');
const ScanResult = require('../models/ScanResult');
const UpdateResult = require('../models/UpdateResult'); // Corrected path if needed

// @route   POST /api/websites
// @desc    Add a new website for the user
// @access  Private
router.post('/', async (req, res) => {
    try {
        const { url, connectorUrl, apiKey } = req.body;
        const userId = req.user.id; // From authMiddleware

        // Basic validation
        if (!url || !connectorUrl || !apiKey) {
            return res.status(400).json({ error: 'Please provide URL, Connector URL, and API Key.' });
        }

        // Check if user already added this site
        let site = await Website.findOne({ url, userId });
        if (site) {
            return res.status(400).json({ error: 'You have already added this website URL.' });
        }

        site = new Website({
            userId,
            url,
            connectorUrl,
            apiKey
            // Default status is 'UP' as per the model
        });

        await site.save();
        res.status(201).json(site); // Send back the created site object

    } catch (err) {
        console.error('Error in POST /api/websites:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/websites
// @desc    Get all websites for the logged-in user
// @access  Private
router.get('/', async (req, res) => {
    try {
        // Find websites belonging to the logged-in user (req.user.id comes from authMiddleware)
        const websites = await Website.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(websites); // Send the array of websites back
    } catch (err) {
        console.error('Error in GET /api/websites:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});


// @route   GET /api/websites/current/health
// @desc    Get aggregated dashboard health data for the logged-in user's first site
// @access  Private
router.get('/current/health', async (req, res) => {
    try {
        // Find websites for the logged-in user
        const websites = await Website.find({ userId: req.user.id });

        if (!websites || websites.length === 0) {
            // Send a default "empty" state if the user has no websites
            return res.json({
                uptime: "N/A",
                security_status: "N/A",
                last_backup: null,
                updates_available: 0,
                uptime_history: [],
                response_times: [],
                recent_activity: []
            });
        }

        // Aggregate data from the user's *first* website for the dashboard
        const site = websites[0];

        // --- Get Last Successful Backup ---
        const lastBackup = await Backup.findOne({
            websiteId: site._id,
            status: 'success'
        }).sort({ createdAt: -1 });

        // --- Get Last Security Scan ---
        const lastScan = await ScanResult.findOne({
            websiteId: site._id
        }).sort({ createdAt: -1 });

        let securityStatus = "Pending";
        if (lastScan) {
            // Determine status based on infected files
            securityStatus = lastScan.infectedFiles > 0 ? "Vulnerable" : "SECURE";
        }

        // --- Get Recent Activity (limited results) ---
        const backups = await Backup.find({ websiteId: site._id }).sort({ createdAt: -1 }).limit(2);
        const scans = await ScanResult.find({ websiteId: site._id }).sort({ createdAt: -1 }).limit(2);
        const updates = await UpdateResult.find({ websiteId: site._id }).sort({ createdAt: -1 }).limit(2);

        let recent_activity = [];
        // Format recent activities
        backups.forEach(b => recent_activity.push({
            type: b.status === 'success' ? 'success' : 'error',
            icon: 'hard-drive',
            message: `Backup ${b.status}`,
            timestamp: b.createdAt
        }));
        scans.forEach(s => recent_activity.push({
            type: s.status === 'failed' ? 'error' : (s.infectedFiles > 0 ? 'warning' : 'success'),
            icon: 'shield',
            message: s.status === 'failed' ? `Scan failed` : `Scan finished. ${s.infectedFiles || 0} threats found.`,
            timestamp: s.createdAt
        }));
         updates.forEach(u => recent_activity.push({
             type: u.status === 'success' ? 'success' : (u.status === 'rolled-back' ? 'warning' : 'error'),
             icon: 'refresh-cw',
             message: `Update ${u.status}: ${u.plugin}`,
             timestamp: u.createdAt
         }));

        // Sort all activities chronologically (most recent first)
        recent_activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // --- Build the Final JSON Response for the dashboard ---
        const healthData = {
            uptime: site.status || "Checking...", // Use current site status
            security_status: securityStatus,
            last_backup: lastBackup ? lastBackup.createdAt : null, // Timestamp of last successful backup
            updates_available: 0, // Placeholder - implement update check logic later
            uptime_history: [100, 99.9, 100, 100, 98, 100, 100], // Placeholder data
            response_times: [120, 115, 130, 122, 150, 110, 100], // Placeholder data
            recent_activity: recent_activity.slice(0, 5) // Return the 5 most recent activities
        };

        res.json(healthData);

    } catch (err) {
        console.error('Error in GET /api/websites/current/health:', err.message);
        res.status(500).json({ error: 'Server Error fetching health data' });
    }
});

// @route   DELETE /api/websites/:id
// @desc    Delete a website connection for the user
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const site = await Website.findOne({ _id: req.params.id, userId: req.user.id });

        if (!site) {
            return res.status(404).json({ error: 'Website not found or you do not have permission.' });
        }

        // Mongoose pre-hook could be used here to delete related backups/scans,
        // or you can delete them manually if needed.
        await site.deleteOne(); // Use deleteOne() on the document

        res.json({ message: 'Website connection deleted successfully.' });

    } catch (err) {
         // Handle cases where the ID format might be invalid for MongoDB ObjectId
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ error: 'Website not found.' });
        }
        console.error('Error in DELETE /api/websites/:id:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});


module.exports = router;