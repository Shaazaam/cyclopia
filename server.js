import bodyParser from 'body-parser'
import dbSession from 'connect-pg-simple'
import express from 'express'
import session from 'express-session'
import {createServer} from 'http'

import config from './util/config.js'
import mount from './util/routes.js'
import {wss} from './util/wss.js'

const app = express()
const sessionManager = dbSession(session)
const sessionParser = session({
  resave: false,
  saveUninitialized: false,
  secret: config.app.SESSION_KEY,
  store: new sessionManager({
    conObject: config.db,
  }),
})

app.use([
  bodyParser.json(),
  express.static('./dist'),
  express.static('./public'),
  sessionParser,
])

mount(app)

const server = createServer(app)

const error = (err) => console.error(err)

server.on('upgrade', (req, socket, head) => {
  socket.on('error', error)
  sessionParser(req, {}, () => {
    if (!req.session.user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    socket.removeListener('error', error)
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })
})

server.listen(config.app.PORT, () => console.log(`listening on port ${config.app.PORT}`))
