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
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/rooms', require('./routes/rooms'))
app.use('/api/versions', require('./routes/versions'))
app.use('/api/run', require('./routes/run'))

const roomUsers = {}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', async ({ roomId, userId, userName }) => {
    socket.join(roomId)

    if (!roomUsers[roomId]) roomUsers[roomId] = []

    const exists = roomUsers[roomId].some(
      (u) => String(u.userId) === String(userId)
    )

    if (!exists) {
      roomUsers[roomId].push({
        socketId: socket.id,
        userId,
        userName
      })
    }

    io.to(roomId).emit('room-users', roomUsers[roomId])

    try {
      const Room = require('./models/Room')
      const room = await Room.findOne({ roomId })

      if (room) {
        socket.emit('load-code', {
          code: room.currentCode || '',
          language: room.language || 'javascript'
        })
      } else {
        socket.emit('load-code', {
          code: '',
          language: 'javascript'
        })
      }
    } catch (err) {
      console.error('Error loading room:', err.message)
      socket.emit('load-code', {
        code: '',
        language: 'javascript'
      })
    }
  })

  socket.on('code-change', async ({ roomId, code }) => {
    socket.to(roomId).emit('code-update', code)

    try {
      const Room = require('./models/Room')
      await Room.findOneAndUpdate({ roomId }, { currentCode: code })
    } catch (err) {
      console.error('Error updating code:', err.message)
    }
  })

  socket.on('language-change', async ({ roomId, language }) => {
    socket.to(roomId).emit('language-update', language)

    try {
      const Room = require('./models/Room')
      await Room.findOneAndUpdate({ roomId }, { language })
    } catch (err) {
      console.error('Error updating language:', err.message)
    }
  })

  socket.on('run-output', ({ roomId, output }) => {
    io.to(roomId).emit('run-output', output)
  })

  socket.on('disconnect', () => {
    for (const roomId in roomUsers) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (u) => u.socketId !== socket.id
      )

      io.to(roomId).emit('room-users', roomUsers[roomId])

      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId]
      }
    }

    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})