const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import your new User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/signup
// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Email address already in use' });
    }

    user = new User({ email, password });
    await user.save();

    // *** NEW LOGIC: Issue JWT Token Immediately After Signup ***
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '3600h' }, // Long expiry for development testing
      (err, token) => {
        if (err) throw err;
        
        // Send a success message AND the token back to the client
        res.status(201).json({ message: `User ${email} created and logged in successfully.`, token: token });
      }
    );
    // *** END NEW LOGIC ***

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Create and send a token
    const payload = { 
      user: {
        id: user.id 
      } 
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Make sure to add this to your .env file!
      { expiresIn: '3600h' }, // 1 hour (use 3600h for long testing)
      (err, token) => {
        if (err) throw err;
        res.json({ message: `Welcome back, ${user.email}!`, token });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;