import bcrypt from 'bcrypt'
import {readFile} from 'fs/promises'

import config from './config.js'
import * as dal from './dal.js'
import * as factory from './factory.js'
import fetch from './fetch.js'
import {
  copy,
  isArray,
  isArrayOfObjects,
  isNotEmpty,
  isNull,
  isNotNull,
  isUndefined,
  isNotUndefined,
} from './functions.js'
import * as val from './validate.js'
import * as wss from './wss.js'

const {SCRYFALL_API_URL} = config.app

const codeMessages = {
  200: null,
  401: 'Not Authorized',
  404: 'Not Found',
  422: 'Validation Error',
  500: 'Server Error',
}
const response = (req, res, status) => {
  const {data, message} = req.cyclopia
  req.cyclopia = copy(req.cyclopia, {message: null, data: []})
  return res.status(status).send({
    status,
    message: message || codeMessages[status],
    data: isArray(data) ? data : [data],
  })
}
const res200 = async (req, res) => response(req, res, 200)
const res401 = async (req, res) => response(req, res, 401)
const res404 = async (req, res) => response(req, res, 404)
const res422 = async (req, res) => response(req, res, 422)
const res500 = async (req, res) => response(req, res, 500)

const isAuthenticated = async ({user}) => isNotUndefined(user)
  && isNotNull(user)
  && isNotNull((await dal.getUser(user.id)).id)

const mutateReq = async (req, res, next) => {
  req.cyclopia = {
    game_id: null,
    event_entity_id: null,
    users: [],
    event: {},
    games: [],
    invitations: [],
    data: [],
    message: null,
  }
  next()
}
const authenticate = async (req, res, next) => {
  if (! await isAuthenticated(req.session)) {
    return res401(req, res)
  }
  next()
}
const authorize = async (req, res, next) => {
  const {user: {id}} = req.session
  const {game_id} = req.method === 'GET' ? req.params : req.body
  const users = await dal.getGameUsers(game_id)
  if (!users.map(({user_id}) => user_id).includes(id)) {
    return res401(req, res)
  }
  next()
}
const isAdmin = async (req, res, next) => {
  const {user: {is_admin}} = req.session
  if (!is_admin) {
    return res422(req, res)
  }
  next()
}

const event = (entity_id, name, data, user_id) => ({entity_id, name, data, user_id})
const invitation = (user_id, invitations) => ({user_id, invitations})

const validate = async ([input, rules], req, res, next) => {
  const results = await val.validate(input, rules)
  if (!val.isValid(results)) {
    req.cyclopia.data = [results]
    return res422(req, res)
  }
  next()
}
const log = async (req, res, next) => {
  const {entity_id, name, data, user_id} = req.cyclopia.event
  const events = await dal.insertEvents(entity_id, name, data, user_id)
  req.cyclopia.game_id = entity_id
  next()
}
const sendGame = async (req, res, next) => {
  const {game_id} = req.cyclopia
  const game = await dal.getGame(game_id)
  const users = game.users.map(({user_id}) => user_id).concat(game.spectators.map(({user_id}) => user_id))
  req.cyclopia = copy(req.cyclopia, {event_entity_id: game_id, users})
  wss.send(users, {kind: 'game', data: game})
  next()
}
const sendEvents = async (req, res, next) => {
  const {event_entity_id, users} = req.cyclopia
  const events = await dal.getEvents(event_entity_id)
  wss.send(users, {kind: 'event', data: events})
  next()
}
const sendInvitations = async (req, res, next) => {
  const {invitations} = req.cyclopia
  invitations.forEach((game) =>
    wss.send([game.user_id], {
      kind: 'invitations',
      data: game.invitations
    })
  )
  next()
}
const sendGames = async (req, res, next) => {
  const {games, users} = req.cyclopia
  wss.send(users, {
    kind: 'games',
    data: games,
  })
  next()
}

const routes = {
  'cards': {
    middleware: [authenticate],
    post: [
      isAdmin,
      async (req, res, next) => {
        fetch.get(`${SCRYFALL_API_URL}/bulk-data`, ['default_cards'], (data) => {
          fetch.get(data.download_uri, {}, async ({data}) => {
            await dal.upsertCards(data)
            req.cyclopia.message = `Cards Imported`
            next()
          }).catch((err) => next(err))
        }).catch((err) => next(err))
      },
    ],
  },
  'catalog': {
    middleware: [authenticate],
    post: [
      isAdmin,
      async (req, res, next) => {
        const {kind} = req.body
        fetch.get(`${SCRYFALL_API_URL}/catalog`, [kind], async ({data}) => {
          await dal.insertCatalog(kind, data)
          req.cyclopia.message = `Catalog ${kind} Imported`
          next()
        }).catch((err) => next(err))
      },
    ],
  },
  'counter': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, name, kind, amount} = req.body
        const func = ((x) => ({
          card: async () => await dal.cardCounter(object_id, name, amount),
          user: async () => await dal.userCounter(game_id, user_id, name, amount),
        })[x])(kind)
        const data = await func().catch((err) => next(err))
        req.cyclopia.event = event(game_id, `counter-${kind}`, data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'counters': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const counters = await dal.getCounters()
        req.cyclopia.data = counters
        next()
      },
    ],
  },
  'decks': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const decks = await dal.getDecks(user_id)
        req.cyclopia.data = decks
        next()
      },
    ],
    /*del: [
      async (req, res, next) => {
        const {id} = req.body
        await dal.deleteDeck(id)
        req.cyclopia.message = 'Deck Deleted'
        next()
      },
      res200,
    ],*/
  },
  'draw': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {amount: draw_amount} = req.body
        next([
          {draw_amount},
          {
            draw_amount: [val.required(), val.min(1)],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.body
        const data = await dal.draw(game_id, user_id, amount).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'draw', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'end-game': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        const data = await dal.endGame(game_id, user_id).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'end-game', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'end-turn': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        const data = await dal.endTurn(game_id, user_id).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'end-turn', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'events': {
    middleware: [authenticate],
    params: ['entity_id'],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {entity_id} = req.params
        req.cyclopia = copy(req.cyclopia, {event_entity_id: entity_id, users: [user_id]})
        next()
      },
      sendEvents,
    ],
  },
  'game': {
    middleware: [authenticate],
    params: ['id'],
    get: [
      async (req, res, next) => {
        req.cyclopia.game_id = req.params.id
        next()
      },
      sendGame,
    ],
  },
  'games': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const games = await dal.getGames()
        req.cyclopia = copy(req.cyclopia, {
          games,
          users: [user_id],
        })
        next()
      },
      sendGames,
    ],
    put: [
      async (req, res, next) => {
        const {deck_id: recieved_deck_id, opponent_id} = req.body
        next([
          {recieved_deck_id, opponent_id},
          {
            recieved_deck_id: [val.required()],
            opponent_id: [val.required()],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {deck_id, id, opponent_id} = req.body
        await dal.joinGame(deck_id, id, user_id)
        const games = await dal.getGames()
        const userInvitations = await dal.getInvitations(user_id)
        const opponentInvitations = await dal.getInvitations(opponent_id)
        req.cyclopia = copy(req.cyclopia, {
          games,
          users: wss.users(),
          invitations: [
            invitation(user_id, userInvitations),
            invitation(opponent_id, opponentInvitations),
          ],
          message: 'Challenge Accepted'
        })
        next()
      },
      sendInvitations,
      sendGames,
    ],
  },
  'game-users': {
    params: ['id'],
    get: [
      async (req, res, next) => {
        const {id: game_id} = req.params
        const users = await dal.getGameUsers(game_id)
        req.cyclopia.data = users
        next()
      },
    ],
  },
  'invitations': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const invitations = await dal.getInvitations(user_id)
        req.cyclopia.invitations = [invitation(user_id, invitations)]
        next()
      },
      sendInvitations,
    ],
    post: [
      async (req, res, next) => {
        const {deck_id: send_deck_id, user_id} = req.body
        next([
          {send_deck_id, user_id},
          {
            send_deck_id: [val.required()],
            user_id: [
              val.required(),
              val.notExists(
                'game_invites',
                ['deck_id', 'user_id'],
                async (input, [table, columns]) => ! (await dal.exists(table, columns, input)),
                'Challange already sent to this user with this deck'
              )
            ],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {deck_id, user_id: opponent_id} = req.body
        const {game_id} = await dal.insertGame(deck_id, opponent_id)
        await dal.joinGame(deck_id, game_id, user_id)
        const userInvitations = await dal.getInvitations(user_id)
        const opponentInvitations = await dal.getInvitations(opponent_id)
        req.cyclopia = copy(req.cyclopia, {
          invitations: [
            invitation(user_id, userInvitations),
            invitation(opponent_id, opponentInvitations),
          ],
          message: 'Challenge Sent'
        })
        next()
      },
      sendInvitations,
    ],
    del: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {id, opponent_id} = req.body
        await dal.declineGame(id, user_id, opponent_id)
        const userInvitations = await dal.getInvitations(user_id)
        const opponentInvitations = await dal.getInvitations(opponent_id)
        req.cyclopia = copy(req.cyclopia, {
          invitations: [
            invitation(user_id, userInvitations),
            invitation(opponent_id, opponentInvitations),
          ],
          message: 'Challenge Declined'
        })
        next()
      },
      sendInvitations,
    ],
  },
  'import': {
    middleware: [authenticate],
    post: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {name, type, base64, size} = req.body

        if (type !== 'text/plain') {
          req.cyclopia.message = 'Must be text file'
          return res422(req, res)
        }
        if (size > 2048) {
          req.cyclopia.message = 'Must be smaller than 2kb'
          return res422(req, res)
        }

        const content = Buffer.from(base64, 'base64').toString()

        Promise.all([
          dal.getUser(user_id),
          dal.upsertDeck({user_id, name: name.replace('.txt', '')})
        ]).then(async ([user, {id: deck_id}]) => {
          let cards = content.split('\r\n').filter((l) => isNotEmpty(l))
          let [start, end] = [cards.findIndex((v) => v === 'Main') + 1, cards.findIndex((v) => v === 'Sideboard')]
          end = end === -1 ? cards.length + 1 : end
          await dal.deleteFromDeck(deck_id)
          for (const [{name, count}] of cards.slice(start, end)
            .map((l) => [...l.matchAll(/^(\d*)\s(.*)/g)].map(([line, count, name]) => ({name, count})))
          ) {
            const {id: card_id} = await dal.getCard(name)
            const inserted = await dal.insertIntoDeck({card_id, deck_id, count})
          }
          const deck = await dal.getDeck(deck_id)
          req.cyclopia.message = 'Deck Imported'
          req.cyclopia.data = deck
          next()
        })
        .catch((error) => {
          req.cyclopia.message = error
          return res500(req, res)
        })
      },
    ],
  },
  'life': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.body
        const data = await dal.life(game_id, user_id, amount).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'life', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'login': {
    post: [
      async (req, res, next) => {
        const {email, password} = req.body
        next([
          {email, password},
          {
            email: [val.required(), val.email()],
            password: [val.required()],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {email, password} = req.body
        const {id, handle, password: hash, is_admin} = await dal.authenticateUser(email)
        if (isNull(id)) {
          req.cyclopia.message = 'User Not Found'
          return res422(req, res)
        }
        bcrypt.compare(password, hash).then((result) => {
          if (!result) {
            req.cyclopia.message = 'Password Invalid'
            return res422(req, res)
          }
          req.session.regenerate(() => {
            req.session.user = {id, handle, email, is_admin}
            req.session.save(() => {
              req.cyclopia.data = {id, handle, email, is_admin}
              next()
            })
          })
        })
      },
    ],
  },
  'logout': {
    middleware: [authenticate],
    del: [
      async (req, res, next) => {
        wss.close(req.session.user)
        req.session.destroy(() => next())
      },
    ],
  },
  'mill': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {amount: mill_amount} = req.body
        next([
          {mill_amount},
          {
            mill_amount: [val.required(), val.min(1)],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.body
        const data = await dal.mill(game_id, user_id, amount).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'mill', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'move': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, zone, location} = req.body
        const data = await dal.move(game_id, object_id, user_id, zone, location).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'move', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'mulligan': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        await dal.mulligan(game_id, user_id)
        req.cyclopia.event = event(game_id, 'mulligan', [{}], user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'password': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id}} = req.session
        const {password} = req.body
        bcrypt.hash(password, 10).then((hash) =>
          dal.changePassword(id, hash).then(() => {
            req.cyclopia.message = 'Password Changed'
            next()
          })
        )
      },
    ],
  },
  'power': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, value} = req.body
        const data = await dal.power(game_id, object_id, user_id, value).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'power', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'register': {
    post: [
      async (req, res, next) => {
        const {email, handle, password} = req.body
        next([
          {email, handle, password},
          {
            email: [
              val.required(),
              val.email(),
              val.notExists('users', ['email']),
            ],
            handle: [val.required(), val.max(50)],
            password: [val.required()],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {email, handle, password} = req.body
        const user = factory.user({id, handle, email})
        bcrypt.hash(password, 10).then((hash) =>
          dal.insertUser({email, handle, password: hash}).then(({id}) => {
            req.session.regenerate(() => {
              req.session.user = user
              req.session.save(() => {
                req.cyclopia.data = user
                next()
              })
            })
          })
        )
      },
    ],
  },
  'rulings': {
    middleware: [authenticate],
    post: [
      isAdmin,
      async (req, res, next) => {
        fetch.get(`${SCRYFALL_API_URL}/bulk-data`, ['rulings'], (data) => {
          fetch.get(data.download_uri, {}, async ({data}) => {
            await dal.deleteRulings()
            await dal.insertRulings(data)
            req.cyclopia = copy(req.cyclopia, {
              message: 'Rulings Imported',
              data: 'rulings',
            })
            next()
          }).catch((err) => next(err))
        }).catch((err) => next(err))
      },
    ],
  },
  'scry': {
    middleware: [authenticate, authorize],
    params: ['game_id', 'amount'],
    get: [
      async (req, res, next) => {
        const {amount: scry_amount} = req.params
        next([
          {scry_amount},
          {
            scry_amount: [val.required(), val.min(1)],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.params
        const objects = await dal.scry(game_id, user_id, amount).catch((err) => next(err))
        req.cyclopia.data = objects
        req.cyclopia.event = event(game_id, 'scry', [{amount}], user_id)
        next()
      },
      log,
    ],
  },
  'shuffle': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        await dal.shuffle(game_id, user_id)
        req.cyclopia.event = event(game_id, 'shuffle', [{}], user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'spectators': {
    middleware: [authenticate],
    post: [
      async (req, res, next) => {
        const {id: game_id} = req.body
        const {user: {id: user_id}} = req.session
        const users = await dal.getGameUsers(game_id).catch((err) => next(err))
        const spectators = await dal.getGameSpectators(game_id).catch((err) => next(err))
        if (
          !users.map(({user_id: id}) => id).includes(user_id)
          && !spectators.map(({user_id: id}) => id).includes(user_id)
        ) {
          await dal.insertSpectator(game_id, user_id).catch((err) => next(err))
        }
        req.cyclopia.game_id = game_id
        next()
      },
      sendGame,
    ],
  },
  'start': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        await dal.start(game_id, user_id).catch((err) => next(err))
        req.cyclopia.game_id = game_id
        next()
      },
      sendGame,
    ],
  },
  'tap': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, state} = req.body
        const data = await dal.tap(game_id, object_id, user_id, state).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'tap', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'token': {
    middleware: [authenticate],
    params: ['name'],
    get: [
      async (req, res, next) => {
        const {name: token} = req.params
        next([
          {token},
          {token: [val.required()]}
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {name} = req.params
        const tokens = await dal.getTokens(name)
        req.cyclopia.data = tokens
        next()
      },
    ],
    put: [
      authorize,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, card_id, amount} = req.body
        const data = await dal.insertTokens(game_id, card_id, user_id, amount).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'token', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'toughness': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, value} = req.body
        const data = await dal.toughness(game_id, object_id, user_id, value).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'toughness', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'transform': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, card_face_id} = req.body
        const data = await dal.transform(game_id, object_id, user_id, card_face_id).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'transform', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'untap': {
    middleware: [authenticate, authorize],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        const data = await dal.untapAll(game_id, user_id).catch((err) => next(err))
        req.cyclopia.event = event(game_id, 'untap', data, user_id)
        next()
      },
      log,
      sendGame,
      sendEvents,
    ],
  },
  'user': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id}} = req.session
        const {email, handle} = req.body
        const user = await dal.updateUser(id, email, handle)
        req.session.regenerate(() => {
          req.session.user = user
          req.session.save(() => {
            req.cyclopia.data = user
            req.cyclopia.message = 'Profile Updated'
            next()
          })
        })
      },
    ],
  },
  'users': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const users = await dal.getUsers()
        req.cyclopia.data = users
        next()
      },
    ],
  },
  'user-cards': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const cards = await dal.getCardsByUser(user_id)
        req.cyclopia.data = cards
        next()
      },
    ],
  },
  'zones': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const zones = await dal.getZones()
        req.cyclopia.data = zones
        next()
      },
    ],
  },
}

export default (app) => {
  app.get('/', async (req, res) => res.sendFile('index.html', {root: './dist'}))
  Object.entries(routes).forEach(([route, {middleware, params, get, post, put, del}]) => {
    ({get, post, del, put} = copy(
      routes[route],
      isUndefined(get)
        ? {get: res404}
        : {},
      isUndefined(post)
        ? {post: res404}
        : {},
      isUndefined(put)
        ? {put: res404}
        : {},
      isUndefined(del)
        ? {del: res404}
        : {},
    ))

    const beforeMiddleware = [mutateReq].concat(isUndefined(middleware) ? [] : middleware)
    const afterMiddleware = [res200]

    app.get(isUndefined(params) ? `/${route}` : `/${route}/:${params.join('/:')}`, beforeMiddleware, get, afterMiddleware)

    app.route(`/${route}`)
      .post(beforeMiddleware, post, afterMiddleware)
      .put(beforeMiddleware, put, afterMiddleware)
      .delete(beforeMiddleware, del, afterMiddleware)
  })
}
