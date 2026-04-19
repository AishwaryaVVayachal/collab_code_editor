const mongoose = require('mongoose')

const versionSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  code: { type: String, required: true },
  message: { type: String, default: 'No message' },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Version', versionSchema)