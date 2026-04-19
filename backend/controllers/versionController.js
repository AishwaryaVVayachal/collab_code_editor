const Version = require('../models/Version')
const Room = require('../models/Room')

exports.saveVersion = async (req, res) => {
  const { roomId, code, message } = req.body
  try {
    const version = await Version.create({ roomId, code, message, savedBy: req.user.id })
    await Room.findOneAndUpdate({ roomId }, { currentCode: code })
    res.status(201).json(version)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getVersions = async (req, res) => {
  try {
    const versions = await Version.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .populate('savedBy', 'name')
    res.json(versions)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

exports.restoreVersion = async (req, res) => {
  const { roomId, versionId } = req.body
  try {
    const version = await Version.findById(versionId)
    if (!version) return res.status(404).json({ message: 'Version not found' })
    await Room.findOneAndUpdate({ roomId }, { currentCode: version.code })
    res.json({ code: version.code })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}