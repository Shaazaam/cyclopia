import {copy, deepCopy, isArray, isNotArray, isObject, isNotNull, encodeObjectAsQueryString} from './functions.js'

export const route = (endpoint, params = null) => {
  if (isNotNull(params) && isObject(params) && isNotArray(params)) {
    endpoint = endpoint + encodeObjectAsQueryString(params)
  }
  if (isArray(params)) {
    endpoint = endpoint + `/${params.join('/')}`
  }
  return endpoint
}

export const actions = (x) => copy({
  counters: [],
  drag: true,
  expand: true,
  move: [],
  tap: false,
  transform: true,
  create: false,
}, x)

export const card = (x) => copy({
  id: null,
  oracle_id: null,
  name: '',
  released_at: null,
  color_identity: [],
  color_indicator: [],
  colors: [],
  produced_mana: [],
  keywords: [],
  type_line: '',
  layout: '',
  rarity: '',
  cmc: 0.0,
  mana_cost: '',
  power: '',
  toughness: '',
  oracle_text: null,
  flavor_text: null,
  set_id: null,
  set: '',
  set_name: '',
  image_status: '',
  image_uris: null,
  rulings_uri: '',
  scryfall_uri: '',
  uri: '',
  scryfall_set_uri: '',
  set_uri: '',
  card_faces: null,
  card_parts: null,
}, x)

export const card_face = (x) => copy({
  id: null,
  card_id: null,
  name: '',
  color_indicator: [],
  colors: [],
  type_line: '',
  layout: '',
  cmc: 0.0,
  mana_cost: '',
  power: '',
  toughness: '',
  oracle_text: '',
  image_uris: {},
}, x)

export const counter = (x) => copy({
  name: null,
  kind: '',
}, x)

export const deck = (x) => copy({
  id: null,
  user_id: null,
  name: '',
}, x)

export const game = (x) => copy({
  id: null,
  users: [game_user(), game_user()],
  spectators: [],
  objects: [],
  counts: [],
}, x)

export const game_user = (x) => copy({
  game_id: null,
  deck_id: null,
  user_id: null,
  life: 20,
  is_ready: false,
  active_turn: false,
  handle: '',
  counters: null,
}, x)

export const object = (x) => copy({
  id: null,
  card_id: null,
  card_face_id: null,
  game_id: null,
  position: null,
  zone: '',
  power: null,
  toughness: null,
  is_tapped: false,
  card: card(),
  counters: null,
  active_face: null,
  card_faces: null,
}, x)

export const user = (x) => copy({
  id: null,
  email: '',
  handle: '',
  is_admin: false,
}, x)

export const wsc = (x) => deepCopy({
  socket: null,
  reconnect: true,
  heartbeat: null,
  timeout: {
    event: null,
    duration: 5000,
    attempts: 5,
    attempted: 0,
  },
  connected: false,
  parameters: [],
}, x)

export const zone = (x) => copy({
  name: null,
}, x)
