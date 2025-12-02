const express = require('express');
const router = express.Router();
const ScanResult = require('../models/ScanResult'); // Import the ScanResult model
const Website = require('../models/Website'); // Need Website to verify ownership
const mongoose = require('mongoose'); // Needed for checking ObjectId validity

// @route   GET /api/security/scans
// @desc    Get scan history for the user's first website
// @access  Private (Protected by authMiddleware)
router.get('/scans', async (req, res) => {
    try {
        // Find the first website belonging to the logged-in user
        // In a multi-site app, pass website ID as query param
        const website = await Website.findOne({ userId: req.user.id }); // req.user.id from authMiddleware

        if (!website) {
            return res.json([]); // No website, no scans
        }

        // Find scan results associated with that website, newest first
        const scans = await ScanResult.find({ websiteId: website._id })
                                      .sort({ createdAt: -1 }) // Sort by date descending
                                      .limit(50); // Limit results

        res.json(scans); // Send the list of scan results

    } catch (err) {
        console.error('Error fetching scan history:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/security/scans/:id
// @desc    Get details for a specific scan result
// @access  Private
router.get('/scans/:id', async (req, res) => {
    try {
        const scanId = req.params.id;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(scanId)) {
             return res.status(404).json({ error: 'Scan result not found (invalid ID format).' });
        }

        // Find the scan result
        const scan = await ScanResult.findById(scanId);

        if (!scan) {
            return res.status(404).json({ error: 'Scan result not found.' });
        }

        // Find the associated website to verify ownership
        const website = await Website.findOne({ _id: scan.websiteId, userId: req.user.id });

        if (!website) {
            // This scan doesn't belong to the logged-in user's site
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view this scan.' });
        }

        // --- Placeholder for Detailed Scan Info ---
        // In a real plugin, the ScanResult model might store more details,
        // like a list of specific infected files found.
        // For now, we just return the basic scan result document.
        // --- End Placeholder ---

        res.json(scan); // Send the full scan result object

    } catch (err) {
         if (err.kind === 'ObjectId') {
             return res.status(404).json({ error: 'Scan result not found.' });
        }
        console.error('Error fetching scan details:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});


// NOTE: The "Run Manual Scan" button in security.html currently calls
// the '/api/automation/run-scans' route. We leave it like that for now.

module.exports = router;