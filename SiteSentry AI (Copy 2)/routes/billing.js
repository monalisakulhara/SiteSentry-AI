const express = require('express');
const router = express.Router();
const Website = require('../models/Website');
const User = require('../models/User'); 

// This route serves all data needed for the Billing page (current plan, payment, history)
// @route   GET /api/billing/details
// @desc    Get current billing plan and history for the logged-in user
// @access  Private
// ... (keep the const express = require('express')... lines) ...
// The User model should already be imported, but if not, add:
// const User = require('../models/User'); 

// This route serves all data needed for the Billing page
// @route   GET /api/billing/details
// @desc    Get current billing plan and history for the logged-in user
// @access  Private
router.get('/details', async (req, res) => {
    try {
        // 1. Find the logged-in user from the database
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 2. Define plan details
        const planDetails = {
            'basic': { name: 'Basic', price: 19.00 },
            'pro': { name: 'Pro', price: 49.00 },
            'agency': { name: 'Agency', price: 199.00 },
            'none': { name: 'N/A', price: 0.00 }
        };

        // 3. Get the correct plan info based on the user's saved plan
        const currentPlan = planDetails[user.plan] || planDetails['none'];

        // 4. Build the response with REAL data for the plan
        //    (We'll keep the payment/history as mock data for now)
        const billingData = {
            planName: currentPlan.name, // <-- This is now DYNAMIC
            planPrice: currentPlan.price, // <-- This is now DYNAMIC
            planInterval: 'month',
            nextPaymentDate: new Date(Date.now() + 30 * 24 * 3600000), // Mock
            
            paymentMethod: { // Mock
                brand: 'Visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2027
            },
            
            history: [ // Mock
                {
                    date: new Date(Date.now() - 30 * 24 * 3600000),
                    amount: 49.00,
                    status: 'Paid',
                    invoiceUrl: 'https://invoices.sitesentry.ai/inv-1004'
                }
            ]
        };

        res.json(billingData); // Send the combined real/mock data

    } catch (err) {
        console.error('Error fetching billing details:', err.message);
        res.status(500).json({ error: 'Server Error fetching billing details.' });
    }
});

// ... (keep module.exports) ...

// NOTE: Routes for 'Update Payment Method' and 'Change Plan' would go here,
// interacting with a third-party billing API (like Stripe/Paddle).

module.exports = router;