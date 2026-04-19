const Room = require('../models/Room')
const { v4: uuidv4 } = require('uuid')

exports.createRoom = async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ message: 'Room name required' })
  try {
    const roomId = uuidv4().slice(0, 8)
    const room = await Room.create({
      roomId, name, owner: req.user.id, collaborators: [req.user.id]
    })
    res.status(201).json(room)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
    if (!room) return res.status(404).json({ message: 'Room not found' })
    res.json(room)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}