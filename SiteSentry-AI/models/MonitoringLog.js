const mongoose = require('mongoose');

const MonitoringLogSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN'],
    required: true
  },
  responseTime: {
    type: Number, // In milliseconds
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30 // AUTOMATICALLY DELETE logs older than 30 days to save space
  }
});

module.exports = mongoose.model('MonitoringLog', MonitoringLogSchema);