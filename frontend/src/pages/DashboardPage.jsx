import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'

const DashboardPage = () => {
  const [roomName, setRoomName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const createRoom = async () => {
    if (!roomName.trim()) return setError('Enter a room name')
    setCreating(true); setError('')
    try {
      const res = await API.post('/rooms/create', { name: roomName.trim() })
      navigate(`/room/${res.data.roomId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room')
      setCreating(false)
    }
  }

  const joinRoom = () => {
    if (!joinId.trim()) return setError('Enter a room ID')
    navigate(`/room/${joinId.trim()}`)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1e1e1e', color: '#d4d4d4',
      fontFamily: "'Segoe UI', system-ui, sans-serif',",
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Top bar */}
      <div style={{
        height: 35, background: '#323233', borderBottom: '1px solid #252526',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px'
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700,
          background: 'linear-gradient(90deg, #00c6ff, #7c3aed)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>⚡ CollabCode</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#888' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%',
              background: `hsl(${(user?.name?.charCodeAt(0) || 65) * 5}, 70%, 50%)`,
              color: '#111', fontSize: 11, fontWeight: 700, marginRight: 7
            }}>{(user?.name || '?')[0].toUpperCase()}</span>
            {user?.name}
          </span>
          <button onClick={() => { logout(); navigate('/login') }} style={{
            background: 'none', border: '1px solid #3d3d3d', color: '#888',
            padding: '3px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12
          }}>Logout</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 700, color: '#e8e8e8',
              letterSpacing: -0.5
            }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
              Create a room to start collaborating, or join an existing one.
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)',
              color: '#f87171', padding: '8px 14px', borderRadius: 6,
              fontSize: 13, marginBottom: 16
            }}>{error}</div>
          )}

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Create Room Card */}
            <div style={{
              background: '#252526', border: '1px solid #3d3d3d',
              borderRadius: 8, padding: 20, transition: 'border-color 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🚀</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>Create a Room</div>
                  <div style={{ fontSize: 11, color: '#666' }}>You'll be the owner — full control</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" placeholder="Room name…"
                  value={roomName} onChange={e => setRoomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createRoom()}
                  style={{
                    flex: 1, background: '#3c3c3c', border: '1px solid #555',
                    color: '#d4d4d4', padding: '8px 12px', borderRadius: 5,
                    fontSize: 13, outline: 'none'
                  }}
                />
                <button onClick={createRoom} disabled={creating} style={{
                  background: creating ? '#555' : '#007acc', border: 'none',
                  color: '#fff', padding: '8px 18px', borderRadius: 5,
                  cursor: creating ? 'not-allowed' : 'pointer', fontSize: 13,
                  fontWeight: 600, transition: 'background 0.2s', whiteSpace: 'nowrap'
                }}>
                  {creating ? '…' : 'Create'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#3d3d3d' }} />
              <span style={{ color: '#555', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#3d3d3d' }} />
            </div>

            {/* Join Room Card */}
            <div style={{
              background: '#252526', border: '1px solid #3d3d3d',
              borderRadius: 8, padding: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🔑</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>Join a Room</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Enter the 8-character room ID</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" placeholder="e.g. a1b2c3d4"
                  value={joinId} onChange={e => setJoinId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && joinRoom()}
                  style={{
                    flex: 1, background: '#3c3c3c', border: '1px solid #555',
                    color: '#d4d4d4', padding: '8px 12px', borderRadius: 5,
                    fontSize: 13, outline: 'none', fontFamily: 'monospace'
                  }}
                />
                <button onClick={joinRoom} style={{
                  background: '#2d5a1b', border: '1px solid #3d7a25',
                  color: '#4ade80', padding: '8px 18px', borderRadius: 5,
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap'
                }}>Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input::placeholder { color: #555; }
        input:focus { border-color: #007acc !important; }
      `}</style>
    </div>
  )
}

export default DashboardPage
