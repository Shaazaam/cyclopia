import {WebSocketServer} from 'ws'

export const socket = new WebSocketServer({noServer: true})

export const users = () => [...socket.clients].map((ws) => ws.user.id)

export const send = (users, data) => {
  socket.clients.forEach((ws) => {
    if (users.includes(ws.user.id)) {
      ws.send(JSON.stringify(data))
    }
  })
}

export const close = (user) => {
  socket.clients.forEach((ws) => {
    if (user.id === ws.user.id) {
      ws.close(1000, 'logout')
    }
  })
}

const error = (err) => console.error(err)

socket.on('connection', (ws, req) => {
  ws.user = req.session.user
  ws.on('error', error)
  ws.on('message', (data) => {
    data = JSON.parse(data.toString())
    const res = (() => ({
      '__ping__': () => ({kind: '__pong__', data: ''}),
      'default': () => ({kind: '__test__', data: ''}),
    }))()[data.kind || 'default']
    ws.send(JSON.stringify(res()))
  })
})
