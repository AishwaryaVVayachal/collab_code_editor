const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { createRoom, getRoom } = require('../controllers/roomController')

router.post('/create', protect, createRoom)
router.get('/:roomId', protect, getRoom)

module.exports = router