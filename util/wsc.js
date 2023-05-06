//import config from './config.js'
import {wsc} from './factory.js'
import {copy, isNull, isNotNull} from './functions.js'
import store from './store.js'

let {
  socket,
  reconnect,
  heartbeat,
  timeout,
  connected,
  parameters,
} = wsc()

const webSocketStatusCodesToMessages = {
  1000: 'Normal Closure',
  1001: 'Going Away',
  1002: 'Protocol Error',
  1003: 'Unsupported Data',
  1004: '(For Future)',
  1005: 'No Status Received',
  1006: 'Abnormal Closure',
  1007: 'Invalid Frame Payload Data',
  1008: 'Policy Violation',
  1009: 'Message Too Big',
  1010: 'Missing Extension',
  1011: 'Internal Error',
  1012: 'Service Restart',
  1013: 'Try Again Later',
  1014: 'Bad Gateway',
  1015: 'TLS Handshake',
  default: 'No Code Provided',
}
const getWebSocketErrorCode = (code = 'default') => webSocketStatusCodesToMessages[code]

const connect = (message) => {
  update(message || 'Connecting...')

  if (isNotNull(socket) && isNull(timeout.event)) {
    update('Socket already connected and no timeout event to run')
    return
  }

  socket = new WebSocket(
    'ws://localhost:8080',
    //'wss://676c-174-54-100-114.ngrok-free.app',
    [
      'cyclopia-web',
      store.get('user').id
    ]
  )

  socket.onclose = onClose
  socket.onopen = onOpen
  socket.onmessage = onMessage
  socket.onerror = onError
}

const send = ({kind, data}) => {
  socket.send(JSON.stringify({kind, data}))
}

const close = () => socket.close(1000, 'logout')

const update = (message, event = {}) => {
  // At minimum put something in the log
  console.log(message, event, getWebSocketErrorCode(event.code))
}

const onError = (event) => {
  connected = false
  update('Error!', event)
}

const onClose = (event) => {
  window.clearInterval(heartbeat)
  window.clearTimeout(timeout.event)

  if (event.code === 1000 && event.reason === 'logout') {
    ({
      socket,
      reconnect,
      heartbeat,
      timeout,
      connected,
      parameters,
    } = wsc())
  }

  if (isNotNull(socket) && reconnect && timeout.attempts >= timeout.attempted) {
    timeout.attempted = timeout.attempted + 1
    update('Disconnected. Reconnecting...', event)
    timeout.event = window.setTimeout(connect, timeout.duration * timeout.attempted)
  }
}

const onOpen = (event) => {
  connected = true
  window.clearTimeout(timeout.event)
  timeout.attempted = 0
  update('Connected.', event)
  heartbeat = window.setInterval(() => {
    send({kind: '__ping__', data: ''})
    timeout.event = window.setTimeout(() => close(), timeout.duration);
  }, 1000 * 25);
}

const onMessage = (event) => {
  const {kind, data} = JSON.parse(event.data)
  const func = (() => ({
    '__auth__': () => {
      reconnect = false
      update('Invalid authorization token. Try refreshing the page.', event)
    },
    '__pong__': () => window.clearTimeout(timeout.event),
    'game': () => store.set('games', store.get('games').concat(data)),
    'challenge': () => store.set('challenges', data),
    'event': () => store.set('events', data),
  }))()[kind]
  func()
}

export default {connect, send, close}
