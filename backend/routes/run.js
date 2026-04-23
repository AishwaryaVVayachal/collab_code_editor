const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')

const languageMap = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  typescript: { language: 'typescript', version: '5.0.3' }
}

router.post('/', async (req, res) => {
  try {
    const { code, language } = req.body

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' })
    }

    const selected = languageMap[language] || languageMap.javascript

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: selected.language,
        version: selected.version,
        files: [{ name: 'main', content: code }]
      })
    })

    const data = await response.json()
    return res.json(data)
  } catch (error) {
    console.error('Run route error:', error.message)
    return res.status(500).json({ message: 'Failed to execute code' })
  }
})

module.exports = router