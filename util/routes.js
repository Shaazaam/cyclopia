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
import * as val from './validate.js'
import {wss, send, close} from './wss.js'

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
    data: isArray(data) ? data : [data]
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
    event: {},
    challenges: [],
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

const event = (entity_id, name, data, user_id) => ({entity_id, name, data, user_id})
const challenge = (user_id, games, invitations) => ({user_id, games, invitations})

const validate = async ([input, rules], req, res, next) => {
  const results = val.validate(input, rules)
  if (!val.isValid(results)) {
    req.cyclopia.data = [results]
    return res422(req, res)
  }
  next()
}
const log = async (event, req, res, next) => {
  const {entity_id, name, data, user_id} = event
  const events = await dal.insertEvents(entity_id, name, data, user_id)
  req.cyclopia.game_id = entity_id
  next()
}
const sendGame = async (req, res, next) => {
  const {game_id} = req.cyclopia
  const game = await dal.getGame(game_id)
  const users = game.users.map((user) => user.user_id)
  req.cyclopia.event = {entity_id: game_id, users}
  send(users, {kind: 'game', data: game})
  next()
}
const sendEvents = async (req, res, next) => {
  const {entity_id, users} = req.cyclopia.event
  const events = await dal.getEvents(entity_id)
  send(users, {kind: 'event', data: events})
  next()
}
const sendChallenges = async (req, res, next) => {
  const {challenges} = req.cyclopia
  challenges.forEach(({user_id, games, invitations}) =>
    send([user_id], {
      kind: 'challenge',
      data: {
        active: games.filter(({pending_invite, winner}) => !pending_invite && isNull(winner)),
        pending: games.filter(({pending_invite}) => pending_invite),
        completed: games.filter(({pending_invite, winner}) => !pending_invite && isNotNull(winner)),
        invitations
      }
    })
  )
  next()
}

const routes = {
  'challenges': {
    middleware: [authenticate],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {games, invitations} = await dal.getChallenges(user_id)
        req.cyclopia.challenges = [challenge(user_id, games, invitations)]
        next()
      },
      sendChallenges,
      res200,
    ],
    post: [
      async (req, res, next) => {
        const {deck_id: send_deck_id, user_id} = req.body
        next([
          {send_deck_id, user_id},
          {
            send_deck_id: [val.required()],
            user_id: [val.required()],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {deck_id, user_id: invited_user_id} = req.body
        const {game_id} = await dal.insertGame(invited_user_id)
        await dal.joinGame(deck_id, game_id, user_id)
        const userChallanges = await dal.getChallenges(user_id)
        const invitedUserChallenges = await dal.getChallenges(invited_user_id)
        req.cyclopia.challenges = [
          challenge(user_id, userChallanges.games, userChallanges.invitations),
          challenge(invited_user_id, invitedUserChallenges.games, invitedUserChallenges.invitations),
        ]
        req.cyclopia.message = 'Challenge Sent'
        next()
      },
      sendChallenges,
      res200,
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
        const {deck_id, game_id, opponent_id} = req.body
        await dal.joinGame(deck_id, game_id, user_id)
        const userChallanges = await dal.getChallenges(user_id)
        const opponentChallenges = await dal.getChallenges(opponent_id)
        req.cyclopia.challenges = [
          challenge(user_id, userChallanges.games, userChallanges.invitations),
          challenge(invited_user_id, opponentChallenges.games, opponentChallenges.invitations),
        ]
        req.cyclopia.message = 'Challenge Accepted'
        next()
      },
      sendChallenges,
      res200,
    ],
    del: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, opponent_id} = req.body
        await dal.declineGame(game_id, user_id, opponent_id)
        const userChallanges = await dal.getChallenges(user_id)
        const opponentChallenges = await dal.getChallenges(opponent_id)
        req.cyclopia.challenges = [
          challenge(user_id, userChallanges.games, userChallanges.invitations),
          challenge(opponent_id, opponentChallenges.games, opponentChallenges.invitations),
        ]
        req.cyclopia.message = 'Challenge Declined'
        next()
      },
      sendChallenges,
      res200,
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
      async (req, res, next) => {
        const counters = await dal.getCounters()
        req.cyclopia.data = counters
        next()
      },
      res200,
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
      res200,
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
    middleware: [authenticate, authorize],
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
    middleware: [authenticate, authorize],
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
        req.cyclopia.game_id = req.params.id
        next()
      },
      sendGame,
      res200,
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
      res200,
    ],
  },
  'life': {
    middleware: [authenticate, authorize],
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
        const {id, handle, password: hash} = await dal.authorizeUser(email)
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
            req.session.user = {id, handle, email}
            req.session.save(() => {
              req.cyclopia.data = {id, handle, email}
              next()
            })
          })
        })
      },
      res200
    ],
  },
  'logout': {
    middleware: [authenticate],
    del: [
      async (req, res, next) => {
        close(req.session.user)
        req.session.destroy(() => next())
      },
      res200,
    ],
  },
  'mill': {
    middleware: [authenticate, authorize],
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
    middleware: [authenticate, authorize],
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
    middleware: [authenticate, authorize],
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
      res200,
    ],
  },
  'power': {
    middleware: [authenticate, authorize],
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
    post: [
      async (req, res, next) => {
        const {email, handle, password} = req.body
        next([
          {email, handle, password},
          {
            email: [val.required(), val.email()],
            handle: [val.required(), val.max(50)],
            password: [val.required()],
          }
        ])
      },
      validate,
      async (req, res, next) => {
        const {email, handle, password} = req.body
        bcrypt.hash(password, 10).then((hash) =>
          dal.insertUser({email, handle, password: hash}).then(({id}) => {
            req.session.regenerate(() => {
              req.session.user = {id, handle, email}
              req.session.save(() => {
                req.cyclopia.data = {id, handle, email}
                next()
              })
            })
          })
        )
      },
      res200,
    ],
  },
  'scry': {
    middleware: [authenticate, authorize],
    params: ['game_id', 'amount'],
    get: [
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {game_id, amount} = req.params
        const objects = await dal.scry(game_id, user_id, amount)
        req.cyclopia.data = objects
        next(event(game_id, 'scry', [{amount}], user_id))
      },
      log,
      res200,
    ],
  },
  'shuffle': {
    middleware: [authenticate, authorize],
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
    middleware: [authenticate, authorize],
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
    middleware: [authenticate, authorize],
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
      async (req, res, next) => {
        const {user: {id: user_id}} = req.session
        const {name} = req.params
        const tokens = await dal.getTokens(name)
        req.cyclopia.data = tokens
        next()
      },
      res200,
    ],
    put: [
      authorize,
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
    middleware: [authenticate, authorize],
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
    middleware: [authenticate, authorize],
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
      async (req, res, next) => {
        const {user: {id}} = req.session
        const {email, handle} = req.body
        await dal.updateUser(id, email, handle)
        req.session.regenerate(() => {
          req.session.user = {id, handle, email}
          req.session.save(() => {
            req.cyclopia.data = {id, handle, email}
            req.cyclopia.message = 'Profile Updated'
            next()
          })
        })
      },
      res200,
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
      res200,
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
      res200,
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
      res200,
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
