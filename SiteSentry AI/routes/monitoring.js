const express = require('express');
const router = express.Router();
const Website = require('../models/Website');
// NOTE: In a real app, you would have models like UptimeRecord and PerformanceRecord.
// For this assignment, we will use mock data that looks realistic.

// Helper function to generate mock data for charts
function generateMockHistory(days = 30) {
    const labels = [];
    const uptimeData = [];
    const responseData = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start at midnight

    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (days - 1 - i));
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        // Mock Uptime (slightly random around 99.9%)
        uptimeData.push(99.8 + Math.random() * 0.2 + (i < 5 ? 0.05 : 0));

        // Mock Response Time (trending slightly down for 'improvement')
        responseData.push(150 - i * 1.5 + Math.random() * 10);
    }

    return { labels, uptimeData, responseData };
}

// @route   GET /api/monitoring/history
// @desc    Get uptime and response time history for charts
// @access  Private
router.get('/history', async (req, res) => {
    try {
        // Check for logged-in user and website existence (essential security/logic)
        const website = await Website.findOne({ userId: req.user.id });
        if (!website) return res.status(404).json({ error: 'No website found for this user.' });

        // In a real app, you would query your UptimeRecord database table here.
        const { labels, uptimeData, responseData } = generateMockHistory(30);

        res.json({
            labels,
            uptimeData: uptimeData.map(val => parseFloat(val.toFixed(3))), // Limit decimals
            responseData: responseData.map(val => parseFloat(val.toFixed(0)))
        });

    } catch (err) {
        console.error('Error fetching monitoring history:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/monitoring/events
// @desc    Get summary stats and downtime events
// @access  Private
router.get('/events', async (req, res) => {
    try {
        const website = await Website.findOne({ userId: req.user.id });
        if (!website) return res.status(404).json({ error: 'No website found for this user.' });

        // Mock Summary Stats
        const summary = {
            currentStatus: website.status || 'UP',
            uptimePercentage: 99.98,
            totalDowntime: '15 minutes',
            avgResponseTime: 125.5
        };

        // Mock Events Log (simulating a few brief downtimes)
        const events = [
            { startTime: new Date(Date.now() - 5 * 24 * 3600000), endTime: new Date(Date.now() - 5 * 24 * 3600000 + 120000), duration: '2 min' },
            { startTime: new Date(Date.now() - 12 * 24 * 3600000), endTime: new Date(Date.now() - 12 * 24 * 3600000 + 60000), duration: '1 min' },
            { startTime: new Date(Date.now() - 25 * 24 * 3600000), endTime: new Date(Date.now() - 25 * 24 * 3600000 + 180000), duration: '3 min' }
        ];

        res.json({ summary, events });

    } catch (err) {
        console.error('Error fetching monitoring events:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;