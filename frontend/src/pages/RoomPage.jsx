import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'

const SOCKET_URL = 'https://collab-code-editor-mnxl.onrender.com'

const RoomPage = () => {
  const { roomId } = useParams()
  const { user } = useAuth()
  const [code, setCode] = useState('// Loading...')
  const [language, setLanguage] = useState('javascript')
  const [versions, setVersions] = useState([])
  const [versionMsg, setVersionMsg] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const socketRef = useRef(null)
  const codeRef = useRef(code)

  useEffect(() => {
    socketRef.current = io(SOCKET_URL)

    socketRef.current.emit('join-room', { roomId, userId: user?.id })

    socketRef.current.on('load-code', ({ code, language }) => {
      setCode(code)
      setLanguage(language)
      codeRef.current = code
    })

    socketRef.current.on('code-update', (newCode) => {
      setCode(newCode)
      codeRef.current = newCode
    })

    socketRef.current.on('language-update', (lang) => {
      setLanguage(lang)
    })

    return () => socketRef.current.disconnect()
  }, [roomId])

  const handleCodeChange = (value) => {
    setCode(value)
    codeRef.current = value
    socketRef.current.emit('code-change', { roomId, code: value })
  }

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    socketRef.current.emit('language-change', { roomId, language: lang })
  }

  const saveVersion = async () => {
    try {
      await API.post('/versions/save', { roomId, code: codeRef.current, message: versionMsg || 'No message' })
      setVersionMsg('')
      alert('Version saved!')
    } catch (err) {
      alert('Failed to save version')
    }
  }

  const fetchVersions = async () => {
    try {
      const res = await API.get(`/versions/${roomId}`)
      setVersions(res.data)
      setShowVersions(true)
    } catch (err) {
      alert('Failed to fetch versions')
    }
  }

  const restoreVersion = async (versionId) => {
    try {
      const res = await API.post('/versions/restore', { roomId, versionId })
      setCode(res.data.code)
      codeRef.current = res.data.code
      socketRef.current.emit('code-change', { roomId, code: res.data.code })
      alert('Version restored!')
    } catch (err) {
      alert('Failed to restore version')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '8px 16px', background: '#1e1e1e', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>Room: {roomId}</span>
        <select value={language} onChange={handleLanguageChange} style={{ padding: '4px' }}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="typescript">TypeScript</option>
        </select>
        <input
          placeholder="Version message"
          value={versionMsg}
          onChange={e => setVersionMsg(e.target.value)}
          style={{ padding: '4px', width: '200px' }}
        />
        <button onClick={saveVersion} style={{ padding: '4px 12px' }}>Save Version</button>
        <button onClick={fetchVersions} style={{ padding: '4px 12px' }}>Version History</button>
      </div>

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={handleCodeChange}
          options={{ fontSize: 14, minimap: { enabled: false } }}
        />
      </div>

      {showVersions && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: '300px', height: '100vh', background: '#252526', color: '#fff', overflowY: 'auto', padding: '16px' }}>
          <h3>Version History</h3>
          <button onClick={() => setShowVersions(false)} style={{ marginBottom: '10px' }}>Close</button>
          {versions.map(v => (
            <div key={v._id} style={{ borderBottom: '1px solid #444', marginBottom: '10px', paddingBottom: '10px' }}>
              <p style={{ margin: '0 0 4px' }}>{v.message}</p>
              <small>{new Date(v.createdAt).toLocaleString()}</small><br />
              <small>By: {v.savedBy?.name}</small><br />
              <button onClick={() => restoreVersion(v._id)} style={{ marginTop: '6px', padding: '4px 10px' }}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RoomPage