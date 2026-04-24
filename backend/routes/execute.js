const express = require('express')
const router = express.Router()

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
  if (!lang) return res.status(400).json({ error: `Language "${language}" not supported.` })

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
    const text = await response.text()
    console.log('Piston response:', text.substring(0, 300))
    let data
    try { data = JSON.parse(text) } catch { return res.status(500).json({ error: 'Piston invalid JSON: ' + text }) }
    const run = data?.run
    if (!run) return res.status(500).json({ error: 'No run field. Got: ' + JSON.stringify(data).substring(0, 200) })
    return res.json({ output: run.output || run.stdout || '', stderr: run.stderr || '', exitCode: run.code ?? 0 })
  } catch (err) {
    return res.status(500).json({ error: 'Piston fetch failed: ' + err.message })
  }
})

module.exports = router