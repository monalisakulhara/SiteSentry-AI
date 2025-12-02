const express = require('express');
const router = express.Router();
const Backup = require('../models/Backup'); // Import the Backup model
const Website = require('../models/Website'); // Need Website to verify ownership
const mongoose = require('mongoose'); // Needed for checking ObjectId validity

// @route   GET /api/backups
// @desc    Get backup history for the user's first website
// @access  Private (Protected by authMiddleware)
router.get('/', async (req, res) => {
    try {
        // Find the first website belonging to the logged-in user
        // In a multi-site app, you'd likely pass a website ID as a query param
        const website = await Website.findOne({ userId: req.user.id });

        if (!website) {
            // If the user has no websites, return an empty array
            return res.json([]);
        }

        // Find backups associated with that website, newest first
        const backups = await Backup.find({ websiteId: website._id })
                                    .sort({ createdAt: -1 }) // Sort by creation date descending
                                    .limit(50); // Limit to the last 50 backups for performance

        res.json(backups); // Send the list of backups

    } catch (err) {
        console.error('Error fetching backups:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/backups/:id/restore
// @desc    Trigger a restore from a specific backup
// @access  Private
router.post('/:id/restore', async (req, res) => {
    try {
        const backupId = req.params.id;

        // Validate if the ID is a correct MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(backupId)) {
             return res.status(404).json({ error: 'Backup not found (invalid ID format).' });
        }

        // Find the backup
        const backup = await Backup.findById(backupId);

        if (!backup) {
            return res.status(404).json({ error: 'Backup not found.' });
        }

        // Find the associated website to verify ownership
        const website = await Website.findOne({ _id: backup.websiteId, userId: req.user.id });

        if (!website) {
            // This backup doesn't belong to the logged-in user
            return res.status(403).json({ error: 'Forbidden: You do not own this website/backup.' });
        }

        if (backup.status !== 'success' || !backup.s3Path) {
             return res.status(400).json({ error: 'Cannot restore from a failed or incomplete backup.' });
        }

        // --- Placeholder for Restore Logic ---
        // In a real application:
        // 1. Send a command to the connector plugin (`/run-restore`?)
        // 2. Pass the S3 path (backup.s3Path) to the plugin.
        // 3. The plugin would download the backup from S3 and restore the WP site.
        // 4. This process should ideally run in the background.
        console.log(`TODO: Initiate restore for website ${website.url} using backup ${backup.s3Path}`);
        // --- End Placeholder ---

        res.json({ message: 'Restore process initiated (simulation).' });

    } catch (err) {
         if (err.kind === 'ObjectId') {
             return res.status(404).json({ error: 'Backup not found.' });
        }
        console.error('Error initiating restore:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});


// NOTE: The "Run Manual Backup" button in backups.html currently calls
// the '/api/automation/run-backups' route. We can leave it like that
// as that route handles the logic of finding due sites (or could be
// modified to accept a specific site ID for a manual trigger).
// Alternatively, you could add a POST /api/backups route here
// specifically for manual triggers.

module.exports = router;