import * as dotenv from 'dotenv'

import {copy} from './functions.js'
import magic from './path.js'

const {__dirname} = magic(import.meta.url)

dotenv.config({path: `${__dirname}/.env`})

let config = {}

const mount = ({
  PORT: PORT = 8080,
  SESSION_KEY,
  WSS_URL: WSS_URL = 'ws://localhost:8080',
  POSTGRES_USER: user = 'postgres',
  POSTGRES_PASSWORD: password = null,
  POSTGRES_DB: database = 'postgres',
  PGHOST: host = 'postgres',
  PGPORT: port = 5432,
  NODE_ENV: NODE_ENV = 'development',
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
mount(process.env)

export default config
