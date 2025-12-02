require('dotenv').config(); // This line MUST be at the very top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path'); // This is correct

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const websiteRoutes = require('./routes/websites');
const backupRoutes = require('./routes/backups');
const securityRoutes = require('./routes/security');
const automationRoutes = require('./routes/automation');
const monitoringRoutes = require('./routes/monitoring'); // <-- ADD THIS
const billingRoutes = require('./routes/billing'); // <-- ADD THIS
const updateRoutes = require('./routes/updates'); // <-- ADD THIS

// --- Middleware Imports ---
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/authMiddleware'); // Our new "guard"

const app = express();

// --- Core Middleware ---
app.use(cors());
// --- ALTERNATIVE HELMET CONFIGURATION ---
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Start with helmet's sensible defaults
//       'script-src': [
//           "'self'", // Allow scripts from your domain
//           'https://cdn.tailwindcss.com',
//           'https://cdn.jsdelivr.net',
//           'https://unpkg.com',
//           'https://accounts.google.com', // Allow scripts from Google Sign In
//           'https://huggingface.co', // Allow script for DeepSite badge
//       ],
//       'style-src': [
//           "'self'",
//           "'unsafe-inline'", // Often needed for basic styles or framework specifics
//           'https://accounts.google.com', // Allow styles from Google Sign In
//       ],
//       'img-src': [
//           "'self'",
//           'data:', // Allow data URIs (often used for small images/icons)
//           'http://static.photos', // Allow your placeholder images
//       ],
//     },
//   })
// );
// --- END HELMET CONFIGURATION ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter); // Only apply rate limiting to API routes

// --- Database connection ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));


// --- API ROUTES ---

// Public Auth Routes (Login/Signup)
app.use('/api/auth', authRoutes);

// Protected API Routes
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/websites', authMiddleware, websiteRoutes);
app.use('/api/backups', authMiddleware, backupRoutes);
app.use('/api/security', authMiddleware, securityRoutes);
app.use('/api/automation', authMiddleware, automationRoutes);
app.use('/api/monitoring', authMiddleware, monitoringRoutes); // <-- ADD THIS
app.use('/api/billing', authMiddleware, billingRoutes); // <-- ADD THIS
app.use('/api/updates', authMiddleware, updateRoutes); // <-- ADD THIS


// --- FRONTEND SERVING ---
// This one line correctly serves all your HTML, CSS, and JS files.
app.use(express.static(path.join(__dirname, '/')));


// --- Error Handling ---
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));