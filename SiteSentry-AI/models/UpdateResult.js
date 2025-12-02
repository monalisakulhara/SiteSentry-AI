const mongoose = require('mongoose');

const UpdateResultSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  plugin: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'rolled-back', 'failed'],
    required: true
  },
  diffPercentage: {
    type: Number
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UpdateResult', UpdateResultSchema);