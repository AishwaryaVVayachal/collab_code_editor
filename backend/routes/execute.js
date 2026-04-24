const express = require('express')
const router = express.Router()

// Judge0 CE - free public instance, no key needed
const JUDGE0_URL = 'https://ce.judge0.com'

const LANG_IDS = {
  javascript: 63,
  typescript: 74,
  python: 71,
  cpp: 54,
  java: 62,
  rust: 73,
  go: 60,
}

router.post('/', async (req, res) => {
  const { code, language } = req.body
  const langId = LANG_IDS[language]

  if (!langId) {
    return res.status(400).json({ error: `Language "${language}" not supported.` })
  }

  try {
    // Submit code
    const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Auth-Token': 'guest'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: '',
      })
    })

    const text = await submitRes.text()
    console.log('Judge0 response:', text.substring(0, 300))

    let data
    try { data = JSON.parse(text) } catch {
      return res.status(500).json({ error: 'Invalid response: ' + text.substring(0, 100) })
    }

    const output = data.stdout || ''
    const stderr = data.stderr || data.compile_output || ''
    const error = data.message || ''

    if (error && !output && !stderr) {
      return res.status(500).json({ error })
    }

    return res.json({
      output: output,
      stderr: stderr,
      exitCode: data.exit_code ?? 0
    })

  } catch (err) {
    console.error('Execute error:', err.message)
    return res.status(500).json({ error: 'Failed to reach code runner: ' + err.message })
  }
})

module.exports = router
