require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const websiteRoutes = require('./routes/websites');
const backupRoutes = require('./routes/backups');
const securityRoutes = require('./routes/security');
const automationRoutes = require('./routes/automation');
const monitoringRoutes = require('./routes/monitoring');
const billingRoutes = require('./routes/billing');

// --- Background Jobs ---
const startUptimeMonitor = require('./cron/uptimeMonitor'); // <-- IMPORTED CRON

// --- Middleware Imports ---
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// --- Core Middleware ---
app.use(cors());

// --- SECURITY: HELMET CSP ---
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': [
          "'self'",
          "'unsafe-eval'", // Needed for some animation libraries
          'https://cdn.tailwindcss.com',
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
          'https://accounts.google.com',
          'https://huggingface.co'
      ],
      'style-src': [
          "'self'",
          "'unsafe-inline'", // Tailwind CDN often requires this
          'https://accounts.google.com'
      ],
      'img-src': [
          "'self'",
          'data:',
          'https:',
          'http:' // Allow external images (like from WordPress)
      ],
      'connect-src': [
          "'self'",
          'https://accounts.google.com'
      ],
      'frame-src': [
          "'self'",
          'https://accounts.google.com'
      ]
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 
});
app.use('/api/', limiter);

// --- Database connection ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB connected');
    // START BACKGROUND JOBS ONLY AFTER DB CONNECTS
    startUptimeMonitor(); 
    console.log('Bg Monitor Started');
})
.catch(err => console.error('MongoDB connection error:', err));


// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/websites', authMiddleware, websiteRoutes);
app.use('/api/backups', authMiddleware, backupRoutes);
app.use('/api/security', authMiddleware, securityRoutes);
app.use('/api/automation', authMiddleware, automationRoutes);
app.use('/api/monitoring', authMiddleware, monitoringRoutes);
app.use('/api/billing', authMiddleware, billingRoutes);


// --- FRONTEND SERVING ---
app.use(express.static(path.join(__dirname, '/')));

// --- Error Handling ---
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));