import {copy} from './functions.js'

let config = {}

config = copy(config, {
  app: {
    PORT: process.env.PORT,
    SESSION_KEY: process.env.SESSION_KEY,
    WSS_URL: process.env.WSS_URL,
    SCRYFALL_API_URL: process.env.SCRYFALL_API_URL,
  },
  db: {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
  },
})

/*const mount = ({
  PORT,
  SESSION_KEY,
  WSS_URL,
  POSTGRES_USER: user,
  POSTGRES_PASSWORD: password,
  POSTGRES_DB: database,
  PGHOST: host,
  PGPORT: port,
  NODE_ENV,
  SCRYFALL_API_URL,
}) => {
  config = copy(config, {
    app: {
      PORT,
      SESSION_KEY,
      WSS_URL,
      SCRYFALL_API_URL,
    },
    db: {
      user,
      password,
      database,
      host,
      port,
    },
  })
}
mount(process.env)*/

export default config
