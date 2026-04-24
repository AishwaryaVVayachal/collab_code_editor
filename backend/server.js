const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const dotenv = require('dotenv')
const cors = require('cors')
const connectDB = require('./config/db')

dotenv.config()
connectDB()

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] },
  // Fix for college/restricted WiFi: websocket first, auto-fallback to polling
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
})

app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/execute', require('./routes/execute'))
app.use('/api/rooms', require('./routes/rooms'))
app.use('/api/versions', require('./routes/versions'))

// roomId -> { socketId: { socketId, userId, username, color } }
const roomUsers = {}

function generateUserColor(userId) {
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
    '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9','#82E0AA','#F8C471']
  if (!userId) return colors[0]
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', async ({ roomId, userId, username }) => {
    socket.join(roomId)
    socket.roomId = roomId
    socket.userId = userId
    socket.username = username

    if (!roomUsers[roomId]) roomUsers[roomId] = {}
    roomUsers[roomId][socket.id] = {
      socketId: socket.id, userId, username,
      color: generateUserColor(userId)
    }

    const Room = require('./models/Room')
    const room = await Room.findOne({ roomId }).populate('owner', 'name _id')
    if (room) {
      socket.emit('load-code', {
        code: room.currentCode,
        language: room.language,
        ownerId: room.owner?._id?.toString()
      })
    }
    io.to(roomId).emit('room-users', Object.values(roomUsers[roomId]))
  })

  socket.on('code-change', async ({ roomId, code }) => {
    socket.to(roomId).emit('code-update', code)
    const Room = require('./models/Room')
    await Room.findOneAndUpdate({ roomId }, { currentCode: code })
  })

  socket.on('language-change', ({ roomId, language }) => {
    io.to(roomId).emit('language-update', language)
    const Room = require('./models/Room')
    Room.findOneAndUpdate({ roomId }, { language }).exec()
  })

  socket.on('kick-user', async ({ roomId, targetSocketId, requesterId }) => {
    const Room = require('./models/Room')
    const room = await Room.findOne({ roomId })
    if (!room || room.owner?.toString() !== requesterId) return
    const target = io.sockets.sockets.get(targetSocketId)
    if (target) {
      target.emit('kicked', { message: 'You have been removed from the room by the owner.' })
      target.leave(roomId)
    }
    if (roomUsers[roomId]) delete roomUsers[roomId][targetSocketId]
    io.to(roomId).emit('room-users', Object.values(roomUsers[roomId] || {}))
  })

  socket.on('clear-code', async ({ roomId, requesterId }) => {
    const Room = require('./models/Room')
    const room = await Room.findOne({ roomId })
    if (!room || room.owner?.toString() !== requesterId) return
    const cleared = '// Code cleared by room owner\n'
    await Room.findOneAndUpdate({ roomId }, { currentCode: cleared })
    io.to(roomId).emit('code-update', cleared)
  })

  socket.on('delete-room', async ({ roomId, requesterId }) => {
    const Room = require('./models/Room')
    const room = await Room.findOne({ roomId })
    if (!room || room.owner?.toString() !== requesterId) return
    io.to(roomId).emit('room-deleted', { message: 'Room deleted by the owner.' })
    await Room.findOneAndDelete({ roomId })
    if (roomUsers[roomId]) delete roomUsers[roomId]
  })

  socket.on('disconnect', () => {
    const { roomId } = socket
    if (roomId && roomUsers[roomId]) {
      delete roomUsers[roomId][socket.id]
      io.to(roomId).emit('room-users', Object.values(roomUsers[roomId]))
    }
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`))
