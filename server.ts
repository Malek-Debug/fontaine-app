import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './src/lib/socket/handlers'

const dev = process.env.NODE_ENV !== 'production'
const hostname = dev ? 'localhost' : '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: dev ? '*' : false,
    },
    transports: ['websocket', 'polling'],
  })

  registerSocketHandlers(io)

  ;(globalThis as any).__io = io

  httpServer.listen(port, () => {
    console.log(`> Fontaine ready on http://${hostname}:${port}`)
    console.log(`> Socket.IO path: /api/socketio`)
    console.log(`> Mode: ${dev ? 'development' : 'production'}`)
  })
})
