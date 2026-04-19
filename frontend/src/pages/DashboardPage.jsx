import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'

const DashboardPage = () => {
  const [roomName, setRoomName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const createRoom = async () => {
    if (!roomName) return setError('Enter a room name')
    try {
      const res = await API.post('/rooms/create', { name: roomName })
      navigate(`/room/${res.data.roomId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room')
    }
  }

  const joinRoom = () => {
    if (!joinId) return setError('Enter a room ID')
    navigate(`/room/${joinId}`)
  }

  return (
    <div style={{ maxWidth: '500px', margin: '60px auto', padding: '20px' }}>
      <h2>Welcome, {user?.name}</h2>
      <button onClick={() => { logout(); navigate('/login') }} style={{ marginBottom: '20px' }}>Logout</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: '30px' }}>
        <h3>Create a Room</h3>
        <input
          type="text" placeholder="Room name"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '70%' }}
        />
        <button onClick={createRoom} style={{ padding: '8px 16px' }}>Create</button>
      </div>

      <div>
        <h3>Join a Room</h3>
        <input
          type="text" placeholder="Enter Room ID"
          value={joinId}
          onChange={e => setJoinId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '70%' }}
        />
        <button onClick={joinRoom} style={{ padding: '8px 16px' }}>Join</button>
      </div>
    </div>
  )
}

export default DashboardPage