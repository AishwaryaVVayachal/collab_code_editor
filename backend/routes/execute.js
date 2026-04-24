const express = require('express')
const router = express.Router()

// Piston language map
const PISTON_LANGS = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  rust: { language: 'rust', version: '1.50.0' },
  go: { language: 'go', version: '1.16.2' },
}

router.post('/', async (req, res) => {
  const { code, language } = req.body

  const lang = PISTON_LANGS[language]
  if (!lang) {
    return res.status(400).json({ error: `Language "${language}" is not supported for execution.` })
  }

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: lang.language,
        version: lang.version,
        files: [{ content: code }],
        stdin: ''
      })
    })

    const data = await response.json()
    const run = data?.run

    if (!run) {
      return res.status(500).json({ error: 'Code runner returned unexpected response.' })
    }

    return res.json({
      output: run.output || run.stdout || '',
      stderr: run.stderr || '',
      exitCode: run.code
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach code runner: ' + err.message })
  }
})

module.exports = router
