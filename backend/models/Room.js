const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentCode: { type: String, default: '// Start coding here...' },
  language: { type: String, default: 'javascript' }
}, { timestamps: true })

module.exports = mongoose.model('Room', roomSchema)