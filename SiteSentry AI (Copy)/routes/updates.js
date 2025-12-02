const express = require('express');
const router = express.Router();
const UpdateResult = require('../models/UpdateResult'); // Import the model
const Website = require('../models/Website');
const mongoose = require('mongoose');

// @route   GET /api/updates
// @desc    Get update history for the user's first website
// @access  Private
router.get('/', async (req, res) => {
    try {
        const website = await Website.findOne({ userId: req.user.id });
        if (!website) {
            return res.json([]); // No website, no updates
        }

        const updates = await UpdateResult.find({ websiteId: website._id })
                                      .sort({ createdAt: -1 })
                                      .limit(50);

        res.json(updates);

    } catch (err) { // <-- Added opening brace {
        console.error('Error fetching update history:', err.message);
        res.status(500).json({ error: 'Server Error' });
    } // <-- Added closing brace }
});

module.exports = router;