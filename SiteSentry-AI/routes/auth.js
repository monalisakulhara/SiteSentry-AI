const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Built-in Node module for generating tokens
const nodemailer = require('nodemailer');

// --- HELPER: Send Email Function ---
const sendEmail = async (options) => {
  // Use Ethereal for testing (same as your uptime monitor)
  const testAccount = await nodemailer.createTestAccount();
  
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const message = {
    from: '"SiteSentry Security" <noreply@sitesentry.local>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: `<b>${options.message}</b>`
  };

  const info = await transporter.sendMail(message);
  
  // Log the URL so you can see the fake email
  console.log("📧 Email sent: %s", info.messageId);
  console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info));
};


// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'Email address already in use' });

    user = new User({ email, password });
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3600h' }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ message: `User created.`, token });
    });
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
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3600h' }, (err, token) => {
      if (err) throw err;
      res.json({ message: `Welcome back!`, token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- NEW: FORGOT PASSWORD ---
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'There is no user with that email.' });
    }

    // 1. Generate Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 3. Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // 4. Create Reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click: <a href="${resetUrl}">Reset Password</a>`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ error: 'Email could not be sent' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// --- NEW: RESET PASSWORD ---
router.put('/resetpassword/:resettoken', async (req, res) => {
  try {
    // 1. Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    // 2. Find user with valid token and valid expiration time
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // $gt means "Greater Than"
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // 3. Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined; // Clear the token
    user.resetPasswordExpire = undefined;

    // 4. Save (middleware will hash the new password automatically)
    await user.save();

    // 5. Log them in automatically (optional)
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3600h' }, (err, token) => {
        if (err) throw err;
        res.status(200).json({ success: true, token, message: "Password updated successfully!" });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;