import bcrypt from 'bcrypt'
import {readFile} from 'fs/promises'

import * as dal from './dal.js'
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
import {wss, send, close} from './wss.js'

const codeMessages = {
  200: null,
  401: 'Not Authorized',
  404: 'Not Found',
  500: 'Server Error',
}

const jsonRes = (status, message = null, data = []) => ({status, message, data: isArray(data) ? data : [data]})
const response = (req, res, code) => {
  const {message} = req.cyclopia
  req.cyclopia.message = null
  return res.status(code).send(jsonRes(code, message || codeMessages[code]))
}

const res200 = async (req, res) => response(req, res, 200)
const res401 = async (req, res) => response(req, res, 401)
const res404 = async (req, res) => response(req, res, 404)
const res500 = async (error, req, res, next) => req.is('json')
  ? res.status(500).send(jsonRes(500, 'Server error'))
  : res.sendFile('500.html', {root: './public'})

const isAuthenticated = async ({user}) => isNotUndefined(user)
  && isNotNull(user)
  && isNotNull((await dal.getUser(user.id)).id)

const mutateReq = async (req, res, next) => {
  req.cyclopia = {
    event: {},
    challenges: [],
    message: null,
  }
  next()
}
const authenticate = async (req, res, next) => {
  if (! await isAuthenticated(req.session)) {
    return await res401(req, res)
  }
  next()
}

const event = (entity_id, name, data, user_id) => ({entity_id, name, data, user_id})

const _log = async (event) => {
  const {entity_id, name, data, user_id} = event
  return dal.insertEvents(entity_id, name, data, user_id)
}

const log = async (data, req, res, next) => {
  const {entity_id} = data
  const events = await _log(data)
  next(entity_id)
}
const sendGame = async (id, req, res, next) => {
  const game = await dal.getGame(id)
  const users = game.users.map((user) => user.user_id)
  req.cyclopia.event = {entity_id: id, users}
  send(users, {kind: 'game', data: game})
  next()
}
const sendEvents = async (req, res, next) => {
  const {entity_id, users} = req.cyclopia.event
  const events = await dal.getEvents(entity_id)
  send(users, {kind: 'event', data: events})
  next()
}

const routes = {
  'challenges': {
    middleware: [authenticate],
    get: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const games = await dal.getGames(user_id)
        const invitations = await dal.getInvitations(user_id)
        send([user_id], {
          kind: 'challenge',
          data: {
            active: games.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
            pending: games.filter(({pending_invite}) => pending_invite),
            completed: games.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
            invitations
          }
        })
        return res.send(jsonRes(200))
      },
    ],
    post: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const {deck_id, user_id: invited_user_id} = req.body
        const {game_id} = await dal.insertGame(invited_user_id)
        await dal.joinGame(deck_id, game_id, user_id)
        const games = await dal.getGames(user_id)
        const invitations = await dal.getInvitations(invited_user_id)
        send([user_id], {
          kind: 'challenge',
          data: {
            active: games.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
            pending: games.filter(({pending_invite}) => pending_invite),
            completed: games.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
          },
        })
        send([invited_user_id], {kind: 'challenge', data: {invitations}})
        return res.send(jsonRes(200, 'Challenge Sent'))
      },
    ],
    put: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const {deck_id, game_id, opponent_id} = req.body
        await dal.joinGame(deck_id, game_id, user_id)
        const games = await dal.getGames(user_id)
        const acceptedOpponentGames = await dal.getGames(opponent_id)
        const invitations = await dal.getInvitations(user_id)
        send([user_id], {
          kind: 'challenge',
          data: {
            active: games.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
            pending: games.filter(({pending_invite}) => pending_invite),
            completed: games.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
            invitations,
          },
        })
        send([opponent_id], {
          kind: 'challenge',
          data: {
            active: acceptedOpponentGames.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
            pending: acceptedOpponentGames.filter(({pending_invite}) => pending_invite),
            completed: acceptedOpponentGames.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
          },
        })
        return res.send(jsonRes(200, 'Challenge Accepted'))
      },
    ],
    del: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const {game_id, opponent_id} = req.body
        await dal.declineGame(game_id, user_id, opponent_id)
        const games = await dal.getGames(user_id)
        const acceptedOpponentGames = await dal.getGames(opponent_id)
        const invitations = await dal.getInvitations(user_id)
        send([user_id], {
          kind: 'challenge',
          data: {
            active: games.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
            pending: games.filter(({pending_invite}) => pending_invite),
            completed: games.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
            invitations,
          },
        })
        send([opponent_id], {
          kind: 'challenge',
          data: {
            active: acceptedOpponentGames.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
            pending: acceptedOpponentGames.filter(({pending_invite}) => pending_invite),
            completed: acceptedOpponentGames.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
          },
        })
        return res.send(jsonRes(200, 'Challenge Declined'))
      },
    ],
  },
  'counter': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, name, kind, amount} = req.body
        const func = ((x) => ({
          card: async () => await dal.cardCounter(object_id, name, amount),
          user: async () => await dal.userCounter(game_id, user_id, name, amount),
        })[x])(kind)
        const data = await func()
        next(event(game_id, `counter-${kind}`, data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'counters': {
    middleware: [authenticate],
    get: [
      async (req, res) => {
        const counters = await dal.getCounters()
        return res.send(jsonRes(200, null, counters))
      },
    ],
  },
  'decks': {
    middleware: [authenticate],
    get: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const decks = await dal.getDecks(user_id)
        return res.send(jsonRes(200, null, decks))
      },
    ],
    del: [
      async (req, res) => {
        const {id} = req.body
        await dal.deleteDeck(id)
        return res.send(jsonRes(200, 'Deck deleted'))
      },
    ],
  },
  'draw': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.body
        const data = await dal.draw(game_id, user_id, amount)
        next(event(game_id, 'draw', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'end-game': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        const data = await dal.endGame(game_id, user_id)
        next(event(game_id, 'end-game', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'end-turn': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        const data = await dal.endTurn(game_id, user_id)
        next(event(game_id, 'end-turn', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'events': {
    middleware: [authenticate],
    params: ['entity_id'],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {entity_id} = req.params
        req.cyclopia.event = {entity_id, users: [user_id]}
        next()
      },
      sendEvents,
      res200,
    ],
  },
  'game': {
    middleware: [authenticate],
    params: ['id'],
    get: [
      async (req, res, next) => {
        next(req.params.id)
      },
      sendGame,
      res200,
    ],
  },
  'import': {
    middleware: [authenticate],
    post: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const {name, type, base64, size} = req.body

        if (type !== 'text/plain') {
          return res.status(422).send(jsonRes(422, 'Must be text file'))
        }
        if (size > 2048) {
          return res.status(422).send(jsonRes(422, 'Must be smaller than 2kb'))
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
          res.send(jsonRes(200, 'Deck imported', deck))
        })
        .catch((error) => res.status(500).send(jsonRes(500, error)))
      },
    ],
  },
  'life': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.body
        const data = await dal.life(game_id, user_id, amount)
        next(event(game_id, 'life', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'login': {
    post: async (req, res) => {
      const {email, password} = req.body
      const {id, handle, password: hash} = await dal.authorizeUser(email)
      if (isNull(id)) {
        return res.status(422).send(jsonRes(422, 'User not found'))
      }
      bcrypt.compare(password, hash).then((result) => {
        if (!result) {
          return res.status(422).send(jsonRes(422, 'Password invalid'))
        }
        req.session.regenerate(() => {
          req.session.user = {id, handle, email}
          req.session.save(() => {
            res.send(jsonRes(200, null, {id, handle, email}))
          })
        })
      })
    },
  },
  'logout': {
    middleware: [authenticate],
    del: [
      async (req, res) => {
        close(req.session.user)
        req.session.destroy(() => res.send(jsonRes(200)))
      },
    ],
  },
  'mill': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.body
        const data = await dal.mill(game_id, user_id, amount)
        next(event(game_id, 'mill', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'move': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, zone, location} = req.body
        const data = await dal.move(game_id, object_id, user_id, zone, location)
        next(event(game_id, 'move', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'mulligan': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        await dal.mulligan(game_id, user_id)
        next(event(game_id, 'mulligan', [{}], user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'password': {
    middleware: [authenticate],
    put: [
      async (req, res) => {
        const {user: {id}} = req.session
        const {password} = req.body
        bcrypt.hash(password, 10).then((hash) =>
          dal.changePassword(id, hash).then(() => {
            res.send(jsonRes(200, 'Password Changed'))
          })
        )
      },
    ],
  },
  'power': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, value} = req.body
        const data = await dal.power(game_id, object_id, user_id, value)
        next(event(game_id, 'power', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'register': {
    post: async (req, res) => {
      const {email, handle, password} = req.body
      bcrypt.hash(password, 10).then((hash) =>
        dal.insertUser({email, handle, password: hash}).then(({id}) => {
          req.session.regenerate(() => {
            req.session.user = {id, handle, email}
            req.session.save(() => {
              res.send(jsonRes(200, null, {id, handle, email}))
            })
          })
        })
      )
    },
  },
  'scry': {
    middleware: [authenticate],
    params: ['game_id', 'amount'],
    get: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.params
        const objects = await dal.scry(game_id, user_id, amount)
        _log(event(game_id, 'scry', [{amount}], user_id))
        return res.send(jsonRes(200, null, objects))
      },
    ],
  },
  'shuffle': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        await dal.shuffle(game_id, user_id)
        next(event(game_id, 'shuffle', [{}], user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'start': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id} = req.body
        await dal.start(game_id, user_id)
        next(game_id)
      },
      sendGame,
      res200,
    ],
  },
  'tap': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, state} = req.body
        const data = await dal.tap(game_id, object_id, user_id, state)
        next(event(game_id, 'tap', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'token': {
    middleware: [authenticate],
    params: ['name'],
    get: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const {name} = req.params
        const tokens = await dal.getTokens(name)
        return res.send(jsonRes(200, null, tokens))
      },
    ],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, card_id, amount} = req.body
        const data = await dal.insertTokens(game_id, card_id, user_id, amount)
        next(event(game_id, 'token', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'toughness': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, value} = req.body
        const data = await dal.toughness(game_id, object_id, user_id, value)
        next(event(game_id, 'toughness', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'transform': {
    middleware: [authenticate],
    put: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, object_id, card_face_id} = req.body
        const data = await dal.transform(game_id, object_id, user_id, card_face_id)
        next(event(game_id, 'transform', data, user_id))
      },
      log,
      sendGame,
      sendEvents,
      res200,
    ],
  },
  'user': {
    middleware: [authenticate],
    put: [
      async (req, res) => {
        const {user: {id}} = req.session
        const {email, handle} = req.body
        await dal.updateUser(id, email, handle)
        req.session.regenerate(() => {
          req.session.user = {id, handle, email}
          req.session.save(() => {
            res.send(jsonRes(200, 'Profile Updated', {id, handle, email}))
          })
        })
      },
    ],
  },
  'users': {
    middleware: [authenticate],
    get: [
      async (req, res) => {
        const users = await dal.getUsers()
        return res.send(jsonRes(200, null, users))
      },
    ],
  },
  'user-cards': {
    middleware: [authenticate],
    get: [
      async (req, res) => {
        const {user: {id: user_id}} = req.session
        const cards = await dal.getCardsByUser(user_id)
        return res.send(jsonRes(200, null, cards))
      },
    ],
  },
  'zones': {
    middleware: [authenticate],
    get: [
      async (req, res) => {
        const zones = await dal.getZones()
        return res.send(jsonRes(200, null, zones))
      },
    ],
  },
  /*seed: {
    get: async (req, res) => readFile('./files/default-cards-20230319210756.json', 'utf8')
      .then(async (cards) => {
        cards = JSON.parse(cards)
        for (const card of cards) {
          await dal.upsertCard(card)
        }
        return res.send('cards imported')
      })
      .catch((error) => {
        console.log(error)
        return res.send(error)
      }),
  },*/
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

    middleware = [mutateReq].concat(isUndefined(middleware) ? [] : middleware)

    app.get(isUndefined(params) ? `/${route}` : `/${route}/:${params.join('/:')}`, middleware, get)

    app.route(`/${route}`)
      .post(middleware, post)
      .put(middleware, put)
      .delete(middleware, del)
  })
}
