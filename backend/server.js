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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', async ({ roomId }) => {
    socket.join(roomId)
    const Room = require('./models/Room')
    const room = await Room.findOne({ roomId })
    if (room) {
      socket.emit('load-code', { code: room.currentCode, language: room.language })
    }
  })

  socket.on('code-change', async ({ roomId, code }) => {
    socket.to(roomId).emit('code-update', code)
    const Room = require('./models/Room')
    await Room.findOneAndUpdate({ roomId }, { currentCode: code })
  })

  socket.on('language-change', ({ roomId, language }) => {
    socket.to(roomId).emit('language-update', language)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`))