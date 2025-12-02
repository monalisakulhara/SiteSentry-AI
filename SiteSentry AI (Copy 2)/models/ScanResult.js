const mongoose = require('mongoose');

const ScanResultSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  cleanFiles: {
    type: Number,
    required: true
  },
  infectedFiles: {
    type: Number,
    required: true
  },
  suspiciousFiles: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ScanResult', ScanResultSchema);