const express = require('express');
const router = express.Router();
const Website = require('../models/Website');
const MonitoringLog = require('../models/MonitoringLog');

// @route   GET /api/monitoring/history
router.get('/history', async (req, res) => {
    try {
        const website = await Website.findOne({ userId: req.user.id });
        if (!website) return res.status(404).json({ error: 'No website found.' });

        // Fetch logs from the last 24 hours (or 7 days)
        // We aggregate data to make the chart readable (e.g., average per hour)
        const logs = await MonitoringLog.find({ 
            websiteId: website._id 
        }).sort({ timestamp: 1 }); // Oldest first

        if (logs.length === 0) {
            return res.json({ labels: [], uptimeData: [], responseData: [] });
        }

        // Prepare data for Chart.js
        const labels = logs.map(log => new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        // Response Time Data
        const responseData = logs.map(log => log.responseTime);
        
        // Uptime Data (100 for UP, 0 for DOWN)
        const uptimeData = logs.map(log => log.status === 'UP' ? 100 : 0);

        res.json({
            labels,       // Time points (e.g., "10:05 AM")
            uptimeData,   // [100, 100, 0, 100...]
            responseData  // [120, 115, 0, 130...]
        });

    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/monitoring/events
// @desc    Real downtime events summary
router.get('/events', async (req, res) => {
    try {
        const website = await Website.findOne({ userId: req.user.id });
        
        // Calculate real averages from logs
        const logs = await MonitoringLog.find({ websiteId: website._id });
        
        const totalChecks = logs.length;
        const downChecks = logs.filter(l => l.status === 'DOWN').length;
        const uptimePercentage = totalChecks > 0 ? ((totalChecks - downChecks) / totalChecks) * 100 : 100;
        
        // Calculate average response time (excluding 0s from downtimes)
        const validTimes = logs.filter(l => l.responseTime > 0).map(l => l.responseTime);
        const avgResponse = validTimes.length > 0 
            ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length 
            : 0;

        res.json({
            summary: {
                currentStatus: website.status,
                uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
                totalDowntime: `${downChecks * 5} mins`, // Approx (assuming 5 min interval)
                avgResponseTime: parseFloat(avgResponse.toFixed(0))
            },
            events: [] // You can implement a complex "Events" finder later if needed
        });

    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;