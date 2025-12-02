const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
// Initialize Stripe with your Secret Key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @route   GET /api/billing/details
// @desc    Get current billing plan (Mock data for now)
router.get('/details', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const planDetails = {
            'basic': { name: 'Basic', price: 19.00 },
            'pro': { name: 'Pro', price: 49.00 },
            'agency': { name: 'Agency', price: 199.00 },
            'none': { name: 'N/A', price: 0.00 }
        };
        const currentPlan = planDetails[user.plan] || planDetails['none'];

        res.json({
            planName: currentPlan.name,
            planPrice: currentPlan.price,
            planInterval: 'month',
            nextPaymentDate: new Date(Date.now() + 30 * 24 * 3600000),
            paymentMethod: { brand: 'Visa', last4: '4242', exp_month: 12, exp_year: 2027 },
            history: [] // Keep history empty/mock for now
        });
    } catch (err) {
        console.error('Error fetching billing details:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/billing/create-checkout-session
// @desc    Create a Stripe Checkout Session for a subscription
// @access  Private
router.post('/create-checkout-session', async (req, res) => {
    const { plan } = req.body; // 'basic', 'pro', or 'agency'

    // Map your plan names to prices (in cents)
    const planMap = {
        'basic':  { price: 1900, name: 'Basic Plan' },
        'pro':    { price: 4900, name: 'Pro Plan' },
        'agency': { price: 19900, name: 'Agency Plan' }
    };

    const selectedPlan = planMap[plan];
    if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `SiteSentry AI - ${selectedPlan.name}`,
                        description: 'Monthly subscription',
                    },
                    unit_amount: selectedPlan.price, // Amount in cents
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            }],
            // This metadata helps us know WHO paid when Stripe sends a receipt (webhook)
            metadata: {
                userId: req.user.id,
                planKey: plan
            },
            // Where to send the user after payment
            success_url: `${process.env.CLIENT_URL}/dashboard.html?payment=success&plan=${plan}`,
            cancel_url: `${process.env.CLIENT_URL}/plans.html`,
        });

        // Send the URL back to the frontend so we can redirect the user
        res.json({ url: session.url });

    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;