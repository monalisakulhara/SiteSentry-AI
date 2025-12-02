const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Needed for password comparison/hashing
const User = require('../models/User'); // Import the User model
const Website = require('../models/Website'); // To delete user's websites
// Import other models if you need to delete related data (Backups, Scans, etc.)
const Backup = require('../models/Backup');
const ScanResult = require('../models/ScanResult');
const UpdateResult = require('../models/UpdateResult');

// @route   GET /api/users/me
// @desc    Get current logged-in user's details (email)
// @access  Private (Protected by authMiddleware)
router.get('/me', async (req, res, next) => { // Added next
    console.log(`Received request for /api/users/me by user ${req.user.id}`);
    try {
        // req.user.id is attached by authMiddleware
        const user = await User.findById(req.user.id).select('-password'); // Find user by ID from token, exclude password hash

        if (!user) {
            console.log(`User not found for ID: ${req.user.id}`);
            return res.status(404).json({ error: 'User not found.' });
        }

        console.log(`Returning user data for: ${user.email}`);
        res.json({ email: user.email, id: user.id }); // Return email and ID

    } catch (err) {
        console.error('!!! ERROR IN GET /api/users/me !!!', err);
         if (err.kind === 'ObjectId') {
             console.log(`Invalid ObjectId format for user ID: ${req.user.id}`);
             return res.status(404).json({ error: 'User not found (invalid ID format).' });
         }
        next(err); // Pass error to central handler
    }
});

// @route   PUT /api/users/password
// @desc    Change logged-in user's password
// @access  Private
router.put('/password', async (req, res, next) => { // Added next
    console.log(`Received request to change password for user ${req.user.id}`);
    const { currentPassword, newPassword } = req.body;

    // Basic validation
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Please provide current and new passwords.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    try {
        // Get user from DB, including password hash this time
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Check if current password matches
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            console.log(`Incorrect current password attempt for user ${user.email}`);
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        // Hash and save the new password
        // The pre-save hook in the User model will handle hashing
        user.password = newPassword;
        await user.save();

        console.log(`Password updated successfully for user ${user.email}`);
        res.json({ message: 'Password updated successfully!' });

    } catch (err) {
        console.error('!!! ERROR IN PUT /api/users/password !!!', err);
        next(err);
    }
});

// @route   DELETE /api/users/me
// @desc    Delete logged-in user's account and associated data
// @access  Private
router.delete('/me', async (req, res, next) => { // Added next
    console.log(`Received request to delete account for user ${req.user.id}`);
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // --- Delete Associated Data ---
        console.log(`Deleting associated data for user ${user.email}...`);
        // 1. Find user's websites
        const userWebsites = await Website.find({ userId: userId });
        const websiteIds = userWebsites.map(site => site._id);

        // 2. Delete Backups, Scans, Updates related to those websites
        if (websiteIds.length > 0) {
            console.log(`Deleting backups for websites: ${websiteIds.join(', ')}`);
            await Backup.deleteMany({ websiteId: { $in: websiteIds } });
            console.log(`Deleting scan results for websites: ${websiteIds.join(', ')}`);
            await ScanResult.deleteMany({ websiteId: { $in: websiteIds } });
            console.log(`Deleting update results for websites: ${websiteIds.join(', ')}`);
            await UpdateResult.deleteMany({ websiteId: { $in: websiteIds } });
            // Add deletion for other related models if necessary
        }

        // 3. Delete Websites
        console.log(`Deleting websites for user ${user.email}`);
        await Website.deleteMany({ userId: userId });

        // 4. Delete User Account
        console.log(`Deleting user account for ${user.email}`);
        await user.deleteOne(); // Use deleteOne on the document

        // --- Log User Out (Implicitly handled by token becoming invalid) ---
        // No explicit logout needed here server-side with JWT,
        // the client should clear the token upon receiving success.

        console.log(`Account deleted successfully for user ${user.email}`);
        res.json({ message: 'Account deleted successfully.' });

    } catch (err) {
        console.error('!!! ERROR IN DELETE /api/users/me !!!', err);
        next(err);
    }
});

// @route   PUT /api/users/me/plan
// @desc    Update the logged-in user's plan
// @access  Private
router.put('/me/plan', async (req, res, next) => {
    console.log(`Received request to update plan for user ${req.user.id}`);
    const { plan } = req.body;

    // Validate the plan
    if (!plan || !['basic', 'pro', 'agency'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    try {
        // Find the user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update the plan and save
        user.plan = plan;
        await user.save();

        console.log(`Plan updated to ${plan} for user ${user.email}`);
        res.json({ message: 'Plan updated successfully!', user: { id: user.id, email: user.email, plan: user.plan } });

    } catch (err) {
        console.error('!!! ERROR IN PUT /api/users/me/plan !!!', err);
        next(err);
    }
});

module.exports = router;

module.exports = router;