const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization');

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Verify token
  try {
    // The token is sent as "Bearer <token>", so we split it
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded.user; // Add user payload to the request object
    next(); // Move to the next function
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};