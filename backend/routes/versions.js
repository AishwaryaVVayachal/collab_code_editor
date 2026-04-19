const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const { saveVersion, getVersions, restoreVersion } = require('../controllers/versionController')

router.post('/save', protect, saveVersion)
router.get('/:roomId', protect, getVersions)
router.post('/restore', protect, restoreVersion)

module.exports = router