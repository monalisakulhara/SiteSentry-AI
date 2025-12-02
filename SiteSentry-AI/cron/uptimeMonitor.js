const cron = require('node-cron');
const axios = require('axios');
const Website = require('../models/Website');
const User = require('../models/User');

const startMonitoring = () => {
    // Schedule a task to run every 5 minutes
    // The pattern '*/5 * * * *' means "Every 5th minute"
    cron.schedule('*/10 * * * * *', async () => {
        console.log('🔄 [Background] Running 24/7 Uptime Check...');

        try {
            // 1. Fetch ALL websites from the database
            const websites = await Website.find({});

            if (websites.length === 0) {
                console.log('   No websites to monitor.');
                return;
            }

            // 2. Check each website
            for (const site of websites) {
                const previousStatus = site.status;
                let newStatus = 'DOWN';

                try {
                    // Try to reach the site (timeout after 5 seconds)
                    const response = await axios.get(site.url, { timeout: 5000 });
                    if (response.status >= 200 && response.status < 300) {
                        newStatus = 'UP';
                    }
                } catch (err) {
                    newStatus = 'DOWN';
                }

                // 3. Update Database ONLY if status changed or just to log last check
                if (newStatus !== previousStatus) {
                    console.log(`⚠️ ALERT: ${site.url} changed from ${previousStatus} to ${newStatus}`);
                    
                    // IF site went DOWN, simulate sending an email
                    if (newStatus === 'DOWN') {
                        const user = await User.findById(site.userId);
                        if (user) {
                            console.log(`📧 SENDING EMAIL to ${user.email}: "Urgent! Your site ${site.url} is down!"`);
                            // In a real app, you would use 'nodemailer' here to actually send it.
                        }
                    }
                }

                // Save the new status
                site.status = newStatus;
                site.lastStatus = newStatus; // Sync these for now
                // We could add a 'lastChecked' field to the model later
                await site.save();
            }
            console.log(`✅ [Background] Checked ${websites.length} websites.`);

        } catch (err) {
            console.error('!!! [Background] Error in Uptime Monitor:', err.message);
        }
    });
};

module.exports = startMonitoring;