const mongoose = require('mongoose');

const WebsiteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  connectorUrl: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN'],
    default: 'UP'
  },
  lastStatus: {
    type: String,
    enum: ['UP', 'DOWN'],
    default: 'UP'
  },
  nextBackup: {
    type: Date,
    default: Date.now
  },
  nextScan: {
    type: Date,
    default: Date.now
  },
  nextUpdateCheck: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Website', WebsiteSchema);