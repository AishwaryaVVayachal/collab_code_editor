import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

const RoomPage = () => {
  const { roomId } = useParams()
  const { user } = useAuth()

  const [code, setCode] = useState('// Loading...')
  const [language, setLanguage] = useState('javascript')
  const [versions, setVersions] = useState([])
  const [versionMsg, setVersionMsg] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [roomUsers, setRoomUsers] = useState([])

  const socketRef = useRef(null)
  const codeRef = useRef(code)

  const myUserId = user?.id || user?._id || 'unknown'
  const myName = user?.name || user?.email || 'Anonymous'

  useEffect(() => {
    socketRef.current = io(SOCKET_URL)

    socketRef.current.emit('join-room', {
      roomId,
      userId: myUserId,
      userName: myName
    })

    socketRef.current.on('load-code', ({ code, language }) => {
      setCode(code || '')
      setLanguage(language || 'javascript')
      codeRef.current = code || ''
    })

    socketRef.current.on('code-update', (newCode) => {
      setCode(newCode || '')
      codeRef.current = newCode || ''
    })

    socketRef.current.on('language-update', (lang) => {
      setLanguage(lang || 'javascript')
    })

    socketRef.current.on('room-users', (users) => {
      setRoomUsers(users || [])
    })

    socketRef.current.on('run-output', (out) => {
      setOutput(out || 'No output')
      setIsRunning(false)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId, myUserId, myName])

  const handleCodeChange = (value = '') => {
    setCode(value)
    codeRef.current = value
    if (socketRef.current) {
      socketRef.current.emit('code-change', { roomId, code: value })
    }
  }

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    if (socketRef.current) {
      socketRef.current.emit('language-change', { roomId, language: lang })
    }
  }

  const runCode = async () => {
    try {
      setIsRunning(true)
      setOutput('⏳ Running...')

      const res = await API.post('/run', {
        code: codeRef.current,
        language
      })

      const result =
        res.data.run?.stdout ||
        res.data.run?.output ||
        res.data.run?.stderr ||
        res.data.compile?.stderr ||
        'No output'

      if (socketRef.current) {
        socketRef.current.emit('run-output', { roomId, output: result })
      }

      setOutput(result)
    } catch (err) {
      const errMsg =
        err.response?.data?.message || `Error: ${err.message}`

      if (socketRef.current) {
        socketRef.current.emit('run-output', { roomId, output: errMsg })
      }

      setOutput(errMsg)
    } finally {
      setIsRunning(false)
    }
  }

  const saveVersion = async () => {
    try {
      await API.post('/versions/save', {
        roomId,
        code: codeRef.current,
        message: versionMsg || 'No message'
      })
      setVersionMsg('')
      alert('Version saved!')
    } catch (err) {
      alert('Failed to save version')
    }
  }

  const fetchVersions = async () => {
    try {
      const res = await API.get(`/versions/${roomId}`)
      setVersions(res.data || [])
      setShowVersions(true)
    } catch (err) {
      alert('Failed to fetch versions')
    }
  }

  const restoreVersion = async (versionId) => {
    try {
      const res = await API.post('/versions/restore', { roomId, versionId })
      setCode(res.data.code || '')
      codeRef.current = res.data.code || ''

      if (socketRef.current) {
        socketRef.current.emit('code-change', {
          roomId,
          code: res.data.code || ''
        })
      }

      alert('Version restored!')
    } catch (err) {
      alert('Failed to restore version')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#1e1e1e',
        color: '#fff'
      }}
    >
      <div
        style={{
          padding: '8px 16px',
          background: '#252526',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontWeight: 600, color: '#569cd6' }}>
          Room: {roomId}
        </span>

        <div
          style={{
            background: '#0e639c',
            borderRadius: '4px',
            padding: '3px 10px',
            fontSize: '12px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}
        >
          <span>👤 {myName}</span>
          <span
            style={{
              color: '#9cdcfe',
              fontFamily: 'monospace',
              fontSize: '10px',
              opacity: 0.8
            }}
          >
            #{String(myUserId).slice(-6)}
          </span>
        </div>

        {roomUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#9cdcfe' }}>In room:</span>
            {roomUsers.map((u, i) => (
              <span
                key={i}
                style={{
                  background:
                    String(u.userId) === String(myUserId) ? '#267f99' : '#333',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  border:
                    String(u.userId) === String(myUserId)
                      ? '1px solid #569cd6'
                      : '1px solid #555'
                }}
              >
                {u.userName}
                {String(u.userId) === String(myUserId) && ' (you)'}
              </span>
            ))}
          </div>
        )}

        <select
          value={language}
          onChange={handleLanguageChange}
          style={{
            padding: '4px 8px',
            background: '#3c3c3c',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px'
          }}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="typescript">TypeScript</option>
        </select>

        <button
          onClick={runCode}
          disabled={isRunning}
          style={{
            padding: '5px 18px',
            background: isRunning ? '#555' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '13px'
          }}
        >
          {isRunning ? '⏳ Running…' : '▶ Run'}
        </button>

        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <input
            placeholder="Version message"
            value={versionMsg}
            onChange={(e) => setVersionMsg(e.target.value)}
            style={{
              padding: '4px 8px',
              background: '#3c3c3c',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              width: '160px'
            }}
          />
          <button
            onClick={saveVersion}
            style={{
              padding: '4px 10px',
              background: '#3c3c3c',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            💾 Save
          </button>
          <button
            onClick={fetchVersions}
            style={{
              padding: '4px 10px',
              background: '#3c3c3c',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🕐 History
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            language={language}
            value={code}
            theme="vs-dark"
            onChange={handleCodeChange}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true
            }}
          />
        </div>

        <div
          style={{
            height: '200px',
            background: '#0d0d0d',
            borderTop: '2px solid #3c3c3c',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              background: '#252526',
              borderBottom: '1px solid #3c3c3c',
              fontSize: '11px',
              color: '#9cdcfe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 600
            }}
          >
            <span>OUTPUT</span>
            <button
              onClick={() => setOutput('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Clear
            </button>
          </div>

          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: '10px 14px',
              fontFamily: '"Cascadia Code", "Fira Code", monospace',
              fontSize: '13px',
              color: output.startsWith('Error') ? '#f48771' : '#d4d4d4',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {output || '// Click ▶ Run to execute the code. Output is shared with all users in the room.'}
          </pre>
        </div>
      </div>

      {showVersions && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: '300px',
            height: '100vh',
            background: '#252526',
            color: '#fff',
            overflowY: 'auto',
            padding: '16px',
            borderLeft: '1px solid #3c3c3c',
            zIndex: 100,
            boxShadow: '-4px 0 12px rgba(0,0,0,0.4)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px' }}>VERSION HISTORY</h3>
            <button
              onClick={() => setShowVersions(false)}
              style={{
                background: 'none',
                border: '1px solid #555',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          {versions.length === 0 && (
            <p style={{ color: '#888', fontSize: '13px' }}>No versions saved yet.</p>
          )}

          {versions.map((v) => (
            <div
              key={v._id}
              style={{
                borderBottom: '1px solid #3c3c3c',
                marginBottom: '12px',
                paddingBottom: '12px'
              }}
            >
              <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '13px' }}>
                {v.message}
              </p>
              <small style={{ color: '#888' }}>
                {new Date(v.createdAt || v.timestamp).toLocaleString()}
              </small>
              <br />
              <small style={{ color: '#888' }}>By: {v.savedBy?.name}</small>
              <br />
              <button
                onClick={() => restoreVersion(v._id)}
                style={{
                  marginTop: '8px',
                  padding: '4px 12px',
                  background: '#0e639c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RoomPage