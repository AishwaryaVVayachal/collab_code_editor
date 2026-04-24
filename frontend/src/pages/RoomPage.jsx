import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://collab-code-editor-mnxl.onrender.com'

// Piston API - 100% free, no key needed
const PISTON_LANGS = {
  javascript: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  python: { language: "python", version: "3.10.0" },
  cpp: { language: "cpp", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
  rust: { language: "rust", version: "1.50.0" },
  go: { language: "go", version: "1.16.2" },
  html: null,
  css: null,
}

const LANG_META = {
  javascript: { icon: '🟨', label: 'JavaScript' },
  typescript: { icon: '🔷', label: 'TypeScript' },
  python: { icon: '🐍', label: 'Python' },
  cpp: { icon: '⚡', label: 'C++' },
  java: { icon: '☕', label: 'Java' },
  rust: { icon: '🦀', label: 'Rust' },
  go: { icon: '🐹', label: 'Go' },
  html: { icon: '🌐', label: 'HTML' },
  css: { icon: '🎨', label: 'CSS' },
}

function UserAvatar({ user, size = 28 }) {
  const [tip, setTip] = useState(false)
  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: user.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 700, color: '#111',
        border: '2px solid rgba(255,255,255,0.12)', cursor: 'default',
        boxShadow: `0 0 0 2px ${user.color}44`, flexShrink: 0,
        userSelect: 'none'
      }}>
        {(user.username || '?')[0].toUpperCase()}
      </div>
      {tip && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', color: '#e2e8f0', padding: '3px 10px',
          borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.1)', zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>{user.username}</div>
      )}
    </div>
  )
}

function Toast({ msg, type }) {
  const bg = type === 'error' ? '#c0392b' : type === 'success' ? '#27ae60' : '#2475b0'
  return (
    <div style={{
      position: 'fixed', top: 44, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, padding: '9px 22px', borderRadius: 6, background: bg,
      color: '#fff', fontSize: 13, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      animation: 'toastIn 0.2s ease', pointerEvents: 'none'
    }}>{msg}</div>
  )
}

function SidePanel({ show, title, onClose, children }) {
  if (!show) return null
  return (
    <div style={{
      width: 270, background: '#252526', borderLeft: '1px solid #3d3d3d',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{
        height: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', background: '#2d2d30', borderBottom: '1px solid #3d3d3d'
      }}>
        <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>{title}</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#666', cursor: 'pointer',
          fontSize: 18, lineHeight: 1, padding: '1px 4px'
        }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {children}
      </div>
    </div>
  )
}

function TBtn({ onClick, icon, label, active, danger, disabled, highlight }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={disabled ? 'Owner only' : label}
      style={{
        background: highlight ? (hov ? '#1a9e3f' : '#27ae60') : active ? 'rgba(0,122,204,0.18)' : hov ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: `1px solid ${highlight ? '#27ae60' : active ? '#007acc88' : hov ? '#555' : '#3d3d3d'}`,
        color: disabled ? '#444' : highlight ? '#fff' : danger ? (hov ? '#f87171' : '#c0392b88') : active ? '#4da6ff' : hov ? '#ccc' : '#888',
        padding: highlight ? '4px 16px' : '3px 11px',
        borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: highlight ? 13 : 12,
        fontWeight: highlight ? 700 : 400,
        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
        flexShrink: 0
      }}>
      <span style={{ fontSize: highlight ? 14 : 13 }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

const RoomPage = () => {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [code, setCode] = useState('// Loading...')
  const [language, setLanguage] = useState('javascript')
  const [versions, setVersions] = useState([])
  const [versionMsg, setVersionMsg] = useState('')
  const [panel, setPanel] = useState('users')
  const [roomUsers, setRoomUsers] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [ownerId, setOwnerId] = useState(null)
  const [connStatus, setConnStatus] = useState('connecting')
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)
  const [roomName, setRoomName] = useState('')

  // Run code state
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const [outputType, setOutputType] = useState('idle') // idle | success | error

  const socketRef = useRef(null)
  const codeRef = useRef(code)

  // Fix: backend returns id OR _id depending on mongoose version
  const myUserId = user?.id || user?._id
  const myUsername = user?.name

  const notify = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnectionAttempts: 6,
      reconnectionDelay: 1500
    })
    const s = socketRef.current

    s.on('connect', () => setConnStatus('connected'))
    s.on('disconnect', () => setConnStatus('disconnected'))
    s.on('connect_error', () => setConnStatus('reconnecting…'))

    // Wait a tick to ensure user is loaded from localStorage
    setTimeout(() => {
      const uid = user?.id || user?._id
      const uname = user?.name
      console.log('Joining room with:', { uid, uname })
      s.emit('join-room', { roomId, userId: uid, username: uname })
    }, 100)

    s.on('load-code', ({ code: c, language: l, ownerId: o }) => {
      setCode(c); codeRef.current = c; setLanguage(l)
      setOwnerId(o)
      const uid = user?.id || user?._id
      setIsOwner(uid?.toString() === o?.toString())
    })
    s.on('code-update', c => { setCode(c); codeRef.current = c })
    s.on('language-update', l => setLanguage(l))
    s.on('room-users', u => setRoomUsers(u))
    s.on('kicked', ({ message }) => { notify(message, 'error'); setTimeout(() => navigate('/dashboard'), 2000) })
    s.on('room-deleted', ({ message }) => { notify(message, 'error'); setTimeout(() => navigate('/dashboard'), 2500) })

    API.get(`/rooms/${roomId}`).then(r => setRoomName(r.data.name || roomId)).catch(() => {})
    // Debug: log what user object looks like
    console.log('User object:', user, 'myUserId:', myUserId)

    return () => s.disconnect()
  }, [roomId, myUserId])

  const handleCodeChange = useCallback(v => {
    setCode(v); codeRef.current = v
    socketRef.current?.emit('code-change', { roomId, code: v })
  }, [roomId])

  const handleLangChange = l => {
    setLanguage(l)
    socketRef.current?.emit('language-change', { roomId, language: l })
  }

  // ===== RUN CODE =====
  const runCode = async () => {
    const pistonLang = PISTON_LANGS[language]
    if (!pistonLang) {
      setOutput(`Cannot run ${language} — HTML/CSS are not executable.`)
      setOutputType('error')
      setShowOutput(true)
      return
    }

    setRunning(true)
    setShowOutput(true)
    setOutput('Running your code...')
    setOutputType('idle')

    try {
      // Call our own backend which proxies to Piston — avoids CORS issues
      const res = await API.post('/execute', {
        code: codeRef.current,
        language
      })
      const { output, stderr } = res.data
      if (stderr && stderr.trim()) {
        setOutput(stderr)
        setOutputType('error')
      } else if (output && output.trim()) {
        setOutput(output)
        setOutputType('success')
      } else {
        setOutput('(no output — did you forget console.log / print?)')
        setOutputType('success')
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      setOutput('Failed to run code: ' + msg)
      setOutputType('error')
    }
    setRunning(false)
  }

  const saveVersion = async () => {
    try {
      await API.post('/versions/save', { roomId, code: codeRef.current, message: versionMsg || 'Snapshot' })
      setVersionMsg(''); notify('Version saved!', 'success')
    } catch { notify('Failed to save', 'error') }
  }

  const fetchVersions = async () => {
    try {
      const r = await API.get(`/versions/${roomId}`)
      setVersions(r.data); setPanel('versions')
    } catch { notify('Failed to load history', 'error') }
  }

  const restoreVersion = async id => {
    try {
      const r = await API.post('/versions/restore', { roomId, versionId: id })
      setCode(r.data.code); codeRef.current = r.data.code
      socketRef.current?.emit('code-change', { roomId, code: r.data.code })
      notify('Restored!', 'success')
    } catch { notify('Failed to restore', 'error') }
  }

  const kickUser = (socketId, name) => {
    if (!isOwner) return
    if (!confirm(`Remove "${name}" from the room?`)) return
    socketRef.current?.emit('kick-user', { roomId, targetSocketId: socketId, requesterId: myUserId })
    notify(`${name} removed`, 'info')
  }

  const clearCode = () => {
    if (!isOwner || !confirm('Clear all code for everyone?')) return
    socketRef.current?.emit('clear-code', { roomId, requesterId: myUserId })
  }

  const deleteRoom = () => {
    if (!isOwner || !confirm('Permanently delete this room?')) return
    socketRef.current?.emit('delete-room', { roomId, requesterId: myUserId })
    navigate('/dashboard')
  }

  const copyId = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const togglePanel = p => setPanel(prev => prev === p ? null : p)
  const connColor = { connected: '#4ade80', disconnected: '#f87171', 'reconnecting…': '#fbbf24', connecting: '#fbbf24' }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#1e1e1e', color: '#d4d4d4',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", overflow: 'hidden'
    }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* TITLE BAR */}
      <div style={{
        height: 33, background: '#323233', borderBottom: '1px solid #252526',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        justifyContent: 'space-between', flexShrink: 0, userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: -0.3,
            background: 'linear-gradient(90deg, #00c6ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>⚡ CollabCode</span>
          <span style={{ color: '#4a4a4a' }}>›</span>
          <span style={{ fontSize: 13, color: '#ccc' }}>{roomName || roomId}</span>
          {isOwner && (
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 3,
              background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
              color: '#fbbf24'
            }}>👑 Owner</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {roomUsers.slice(0, 6).map((u, i) => (
              <div key={u.socketId} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }}>
                <UserAvatar user={u} size={22} />
              </div>
            ))}
            {roomUsers.length > 6 && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#3d3d3d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#888', marginLeft: -8, border: '2px solid #323233'
              }}>+{roomUsers.length - 6}</div>
            )}
          </div>

          <button onClick={copyId} style={{
            background: copied ? '#27ae6022' : '#2d2d2d', border: `1px solid ${copied ? '#27ae60' : '#4a4a4a'}`,
            color: copied ? '#4ade80' : '#888', padding: '2px 10px',
            borderRadius: 4, cursor: 'pointer', fontSize: 11, transition: 'all 0.2s'
          }}>
            {copied ? '✓ Copied!' : `🔑 ${roomId}`}
          </button>

          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: '1px solid #3d3d3d', color: '#777',
            padding: '2px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 11
          }}>← Back</button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{
        height: 40, background: '#2d2d30', borderBottom: '1px solid #3d3d3d',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
        flexShrink: 0, overflowX: 'auto'
      }}>
        {/* RUN BUTTON - most prominent */}
        <TBtn onClick={runCode} icon={running ? '⏳' : '▶'} label={running ? 'Running...' : 'Run Code'}
          highlight disabled={running} />

        <div style={{ width: 1, background: '#3d3d3d', height: 20 }} />

        {/* Language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 10, borderRight: '1px solid #3d3d3d' }}>
          <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>Lang</span>
          <select value={language} onChange={e => handleLangChange(e.target.value)} style={{
            background: '#3c3c3c', border: '1px solid #555', color: '#d4d4d4',
            padding: '3px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', outline: 'none'
          }}>
            {Object.entries(LANG_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {/* Save version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 10, borderRight: '1px solid #3d3d3d' }}>
          <input value={versionMsg} onChange={e => setVersionMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveVersion()}
            placeholder="Snapshot message…"
            style={{
              background: '#3c3c3c', border: '1px solid #4a4a4a', color: '#d4d4d4',
              padding: '3px 10px', borderRadius: 4, fontSize: 12, width: 160, outline: 'none'
            }} />
          <TBtn onClick={saveVersion} icon="💾" label="Save" />
        </div>

        <TBtn onClick={fetchVersions} icon="🕐" label="History" active={panel === 'versions'} />
        <TBtn onClick={() => togglePanel('users')} icon="👥"
          label={`Users (${roomUsers.length})`} active={panel === 'users'} />

        {/* Output toggle */}
        <TBtn onClick={() => setShowOutput(v => !v)} icon="🖥️" label="Output" active={showOutput} />

        {isOwner && <>
          <div style={{ width: 1, background: '#3d3d3d', height: 20, marginLeft: 4 }} />
          <TBtn onClick={clearCode} icon="🗑️" label="Clear Code" danger />
          <TBtn onClick={deleteRoom} icon="💥" label="Delete Room" danger />
        </>}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor + Output stacked vertically */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Editor */}
          <div style={{ flex: showOutput ? '0 0 60%' : 1, overflow: 'hidden', minHeight: 0 }}>
            <Editor
              height="100%"
              language={language}
              value={code}
              theme="vs-dark"
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                fontLigatures: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true },
                padding: { top: 10 },
                lineHeight: 22,
                letterSpacing: 0.3,
                wordWrap: 'on',
              }}
            />
          </div>

          {/* OUTPUT PANEL */}
          {showOutput && (
            <div style={{
              flex: '0 0 40%', background: '#0d1117', borderTop: '1px solid #3d3d3d',
              display: 'flex', flexDirection: 'column', minHeight: 0
            }}>
              <div style={{
                height: 30, background: '#161b22', borderBottom: '1px solid #3d3d3d',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 12px', flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Output</span>
                  {outputType === 'success' && <span style={{ fontSize: 10, color: '#3fb950', background: 'rgba(63,185,80,0.1)', padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(63,185,80,0.3)' }}>✓ Success</span>}
                  {outputType === 'error' && <span style={{ fontSize: 10, color: '#f85149', background: 'rgba(248,81,73,0.1)', padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(248,81,73,0.3)' }}>✗ Error</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setOutput('')} style={{
                    background: 'none', border: '1px solid #30363d', color: '#8b949e',
                    padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10
                  }}>Clear</button>
                  <button onClick={() => setShowOutput(false)} style={{
                    background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16
                  }}>×</button>
                </div>
              </div>
              <pre style={{
                flex: 1, margin: 0, padding: '12px 16px', overflowY: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13,
                color: outputType === 'error' ? '#f85149' : outputType === 'success' ? '#e6edf3' : '#8b949e',
                lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>
                {output || 'Click ▶ Run Code to execute your code'}
              </pre>
            </div>
          )}
        </div>

        {/* USERS PANEL */}
        <SidePanel show={panel === 'users'} title={`Collaborators (${roomUsers.length})`} onClose={() => setPanel(null)}>
          {roomUsers.length === 0
            ? <div style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 30 }}>No users connected</div>
            : roomUsers.map(u => (
              <div key={u.socketId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 6, marginBottom: 6,
                background: u.userId === myUserId ? 'rgba(0,122,204,0.08)' : '#2d2d30',
                border: `1px solid ${u.userId === myUserId ? 'rgba(0,122,204,0.25)' : '#3a3a3a'}`
              }}>
                <UserAvatar user={u} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#d4d4d4', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {u.username}
                    {u.userId === myUserId && <span style={{ color: '#555', fontSize: 10 }}>(you)</span>}
                    {u.userId === ownerId && <span style={{ fontSize: 12 }}>👑</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#555' }}>online</span>
                  </div>
                </div>
                {isOwner && u.userId !== myUserId && (
                  <button onClick={() => kickUser(u.socketId, u.username)} style={{
                    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                    color: '#f87171', padding: '2px 9px', borderRadius: 4,
                    cursor: 'pointer', fontSize: 10, flexShrink: 0
                  }}>Kick</button>
                )}
              </div>
            ))
          }
        </SidePanel>

        {/* VERSIONS PANEL */}
        <SidePanel show={panel === 'versions'} title="Version History" onClose={() => setPanel(null)}>
          {versions.length === 0
            ? <div style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 30 }}>No saved versions yet.</div>
            : versions.map(v => (
              <div key={v._id} style={{
                background: '#2d2d30', border: '1px solid #3a3a3a',
                borderRadius: 6, padding: '10px 12px', marginBottom: 8
              }}>
                <div style={{ fontSize: 12, color: '#d4d4d4', fontWeight: 600, marginBottom: 4 }}>{v.message}</div>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 8 }}>
                  {new Date(v.createdAt).toLocaleString()} · {v.savedBy?.name}
                </div>
                <button onClick={() => restoreVersion(v._id)} style={{
                  width: '100%', background: 'rgba(0,122,204,0.12)',
                  border: '1px solid rgba(0,122,204,0.3)', color: '#4da6ff',
                  padding: '4px 0', borderRadius: 4, cursor: 'pointer', fontSize: 11
                }}>↩ Restore this version</button>
              </div>
            ))
          }
        </SidePanel>
      </div>

      {/* STATUS BAR */}
      <div style={{
        height: 22, background: '#007acc', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 14px', fontSize: 11,
        color: '#fff', userSelect: 'none', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: connColor[connStatus] || '#fbbf24' }}>●</span>
            {connStatus}
          </span>
          <span>{(LANG_META[language]?.icon || '📄')} {language}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, opacity: 0.85 }}>
          <span>👥 {roomUsers.length} online</span>
          <span>Room: {roomId}</span>
        </div>
      </div>

      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #1e1e1e; }
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        select option { background: #3c3c3c; color: #d4d4d4; }
        input::placeholder { color: #555; }
      `}</style>
    </div>
  )
}

export default RoomPage
