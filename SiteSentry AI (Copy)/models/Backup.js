const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  size: {
    type: Number
  },
  s3Path: {
    type: String
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Backup', BackupSchema);