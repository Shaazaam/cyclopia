import pg from 'pg'

import config from './config.js'
import * as factory from './factory.js'
import {isNotEmpty, isNotNull, isNotUndefined, numericRange} from './functions.js'

const pool = new pg.Pool(config.db)
const query = (text, values) => pool.query(text, values).catch((err) => pool.query(`INSERT INTO errors (data) VALUES ($1)`, [err.toString()]))

const allowedColumns = {
  deck_id: 'deck_id',
  game_id: 'game_id',
  user_id: 'user_id',
}
const allowedTables = {
  decks: 'decks',
  game_invites: 'game_invites',
}

export const exists = async (table, columns, values) => {
  const where = columns.reduce((agg, cur, index) =>
    agg.concat(`${allowedTables[table]}.${allowedColumns[cur]} = $${(1 + index)}`), []
  ).join(' AND ')
  const {rowCount} = await query(`
    SELECT ${allowedTables[table]}.*
    FROM ${allowedTables[table]}
    WHERE ${where}
  `, values)
  return rowCount === 1
}

export const upsertCard = async ({
  id,
  oracle_id,
  name,
  released_at,
  color_identity,
  color_indicator,
  colors,
  produced_mana,
  keywords,
  type_line,
  layout,
  rarity,
  cmc,
  mana_cost,
  power,
  toughness,
  oracle_text,
  flavor_text,
  set_id,
  set,
  set_name,
  image_status,
  image_uris,
  rulings_uri,
  scryfall_uri,
  uri,
  scryfall_set_uri,
  set_uri,
  card_faces,
  card_parts,
} = factory.card()) => {
  const {rows: [row]} = await query(`
    INSERT INTO cards (
      id,
      oracle_id,
      name,
      released_at,
      color_identity,
      color_indicator,
      colors,
      produced_mana,
      keywords,
      type_line,
      layout,
      rarity,
      cmc,
      mana_cost,
      power,
      toughness,
      oracle_text,
      flavor_text,
      set_id,
      set,
      set_name,
      image_status,
      image_uris,
      rulings_uri,
      scryfall_uri,
      uri,
      scryfall_set_uri,
      set_uri
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
    ON CONFLICT ON CONSTRAINT cards_pkey
    DO UPDATE SET
      oracle_id = $2,
      name = $3,
      released_at = $4,
      color_identity = $5,
      color_indicator = $6,
      colors = $7,
      produced_mana = $8,
      keywords = $9,
      type_line = $10,
      layout = $12,
      rarity = $12,
      cmc = $13,
      mana_cost = $14,
      power = $15,
      toughness = $16,
      oracle_text = $17,
      flavor_text = $18,
      set_id = $19,
      set = $20,
      set_name = $21,
      image_status = $22,
      image_uris = $23,
      rulings_uri = $24,
      scryfall_uri = $25,
      uri = $26,
      scryfall_set_uri = $27,
      set_uri = $28
    RETURNING *
  `, [
    id,
    oracle_id,
    name,
    released_at,
    color_identity,
    color_indicator,
    colors,
    produced_mana,
    keywords,
    type_line,
    layout,
    rarity,
    cmc,
    mana_cost,
    power,
    toughness,
    oracle_text,
    flavor_text,
    set_id,
    set,
    set_name,
    image_status,
    image_uris,
    rulings_uri,
    scryfall_uri,
    uri,
    scryfall_set_uri,
    set_uri,
  ])
  if (isNotUndefined(card_faces) && isNotNull(card_faces)) {
    for (const {
      name,
      color_indicator,
      colors,
      keywords,
      type_line,
      layout,
      cmc,
      mana_cost,
      power,
      toughness,
      oracle_text,
      image_uris,
    } of card_faces) {
      const {rows: [face]} = await query(`
        INSERT INTO card_faces (
          card_id,
          name,
          color_indicator,
          colors,
          type_line,
          layout,
          cmc,
          mana_cost,
          power,
          toughness,
          oracle_text,
          image_uris
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT ON CONSTRAINT card_faces_pkey
        DO UPDATE SET
          card_id = $1,
          name = $2,
          color_indicator = $3,
          colors = $4,
          type_line = $5,
          layout = $6,
          cmc = $7,
          mana_cost = $8,
          power = $9,
          toughness = $10,
          oracle_text = $11,
          image_uris = $12
        RETURNING *
      `, [
        row.id,
        name,
        color_indicator,
        colors,
        type_line,
        layout,
        cmc,
        mana_cost,
        power,
        toughness,
        oracle_text,
        image_uris,
      ])
    }
  }
  return factory.card(row)
}
export const getCard = async (name) => {
  const {rows: [row]} = await query(`SELECT cards.* FROM cards WHERE cards.name = $1 LIMIT 1`, [name])
  return factory.card(row)
}
export const getCardsByUser = async (user_id) => {
  const {rows} = await query(`
    SELECT
      decks.id AS deck_id,
      cards.id AS card_id,
      card_faces.id AS card_face_id,
      TO_JSON(cards.*) AS card,
      TO_JSON(card_faces.*) AS active_face,
      card_deck.count
    FROM decks
    JOIN card_deck ON decks.id = card_deck.deck_id
    JOIN cards ON cards.id = card_deck.card_id
    LEFT JOIN card_faces ON cards.id = card_faces.card_id
    WHERE decks.user_id = $1
    ORDER BY cards.name
  `, [user_id])
  return rows.map(factory.object)
}

export const getDeck = async (id) => {
  const {rows: [row]} = await query(`
    SELECT
      decks.id,
      decks.user_id,
      decks.name,
      JSON_AGG(cards.*) AS cards
    FROM decks
    JOIN card_deck ON decks.id = card_deck.deck_id
    JOIN cards ON cards.id = card_deck.card_id
    WHERE decks.id = $1
    GROUP BY decks.id
  `, [id])
  return factory.deck(row)
}
export const getDecks = async (user_id) => {
  const {rows} = await query(`
    SELECT
      decks.id,
      decks.user_id,
      decks.name
    FROM decks
    WHERE decks.user_id = $1
    ORDER BY LOWER(decks.name)
  `, [user_id])
  return rows.map(factory.deck)
}
export const upsertDeck = async ({user_id, name} = factory.deck()) => {
  const {rows: [row]} = await query(`
    WITH ins AS (
      INSERT INTO decks (user_id, name)
      VALUES ($1, $2)
      ON CONFLICT ON CONSTRAINT decks_user_id_name_key DO NOTHING
      RETURNING *
    )
    SELECT ins.*
    FROM ins
    UNION
    SELECT decks.*
    FROM decks
    WHERE decks.user_id = $1 AND decks.name = $2
  `, [user_id, name])
  return factory.deck(row)
}
export const deleteDeck = async (id) => {
  await deleteFromDeck(id)
  await query(`DELETE FROM decks WHERE decks.id = $1`, [id])
  return true
}
export const deleteFromDeck = async (deck_id) => {
  await query(`DELETE FROM card_deck WHERE card_deck.deck_id = $1`, [deck_id])
  return true
}
export const insertIntoDeck = async ({card_id, deck_id, count}) => {
  const {rows: [row]} = await query(`
    INSERT INTO card_deck (card_id, deck_id, count)
    VALUES ($1, $2, $3)
    ON CONFLICT ON CONSTRAINT card_deck_pkey
    DO UPDATE SET count = card_deck.count + EXCLUDED.count
    RETURNING *
  `, [card_id, deck_id, count])
  return true
}

export const authorizeUser = async (email) => {
  const {rows: [row]} = await query(`SELECT users.* FROM users WHERE users.email = $1`, [email])
  return factory.user(row)
}
export const getUser = async (id) => {
  const {rows: [row]} = await query(`
    SELECT
      users.id,
      users.handle,
      users.email
    FROM users
    WHERE users.id = $1
  `, [id])
  return factory.user(row)
}
export const getUsers = async (id) => {
  const {rows} = await query(`SELECT users.id, users.handle FROM users`)
  return rows.map(factory.user)
}
export const insertUser = async ({email, handle, password} = factory.getUser()) => {
  const {rows: [row]} = await query(`
    INSERT INTO users (email, handle, password)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [email, handle, password])
  return factory.user(row)
}
export const updateUser = async (id, email, handle) => {
  await query(`
    UPDATE users
    SET
      email = $2,
      handle = $3
    WHERE users.id = $1
  `, [id, email, handle])
  return true
}
export const changePassword = async (id, password) => {
  await query(`UPDATE users SET password = $2 WHERE users.id = $1`, [id, password])
  return true
}

const deleteInvitation = async (game_id, user_id) => {
  await query(`DELETE FROM game_invites WHERE game_id = $1 AND user_id = $2`, [game_id, user_id])
  return true
}
export const insertGame = async (user_id) => {
  const {rows: [{id: game_id}]} = await query(`INSERT INTO games DEFAULT VALUES RETURNING id`)
  await query(`INSERT INTO game_invites (game_id, user_id) VALUES ($1, $2)`, [game_id, user_id])
  return {game_id}
}
export const joinGame = async (deck_id, game_id, user_id) => {
  await query(`INSERT INTO game_user (game_id, user_id) VALUES ($1, $2)`, [game_id, user_id])
  await query(`
    INSERT INTO objects (
      card_id,
      card_face_id,
      game_id,
      user_id,
      zone,
      power,
      toughness,
      position
    )
    SELECT
      cd.card_id,
      cd.card_face_id,
      $1 AS game_id,
      $2 AS user_id,
      'library' AS zone,
      cd.power,
      cd.toughness,
      ROW_NUMBER() OVER (ORDER BY RANDOM()) AS position
    FROM (
      SELECT
        card_deck.card_id,
        CASE
          WHEN cards.power ~ '^\\d+(\\.\\d+)?$' THEN cards.power
        END AS power,
        CASE
          WHEN cards.toughness ~ '^\\d+(\\.\\d+)?$' THEN cards.toughness
        END AS toughness,
        GENERATE_SERIES(1, card_deck.count),
        (card_faces->0->>'id')::uuid AS card_face_id
      FROM card_deck
      JOIN cards ON card_deck.card_id = cards.id
      LEFT JOIN (
        SELECT
          card_faces.card_id,
          JSON_AGG(card_faces.*) AS card_faces
        FROM card_faces
        GROUP BY card_faces.card_id
      ) cf ON cards.id = cf.card_id
      WHERE deck_id = $3
    ) cd
  `, [game_id, user_id, deck_id])
  await deleteInvitation(game_id, user_id)
  return true
}
export const declineGame = async (game_id, user_id, opponent_id) => {
  await deleteInvitation(game_id, user_id)
  await query(`DELETE FROM game_user WHERE game_id = $1 AND user_id = $2`, [game_id, opponent_id])
  await query(`DELETE FROM objects WHERE game_id = $1 AND user_id = $2`, [game_id, opponent_id])
  await query('DELETE FROM games WHERE id = $1', [game_id])
  return true
}
const getGames = async (user_id) => {
  const {rows} = await query(`
    SELECT
      game_user.game_id,
      games.created_on,
      COALESCE(game_invites.user_id IS NOT NULL, FALSE) AS pending_invite,
      JSON_BUILD_OBJECT(
        'id', COALESCE(invited_user.id, accepted_user.id),
        'handle', COALESCE(invited_user.handle, accepted_user.handle)
      ) AS opponent,
      games.winner
    FROM game_user
    JOIN games ON games.id = game_user.game_id
    LEFT JOIN game_invites ON game_user.game_id = game_invites.game_id
    LEFT JOIN users invited_user ON game_invites.user_id = invited_user.id
    LEFT JOIN game_user self ON game_user.game_id = self.game_id AND self.user_id != $1
    LEFT JOIN users accepted_user ON self.user_id = accepted_user.id
    WHERE game_user.user_id = $1
  `, [user_id])
  return rows
}
const getInvitations = async (user_id) => {
  const {rows} = await query(`
    SELECT
      game_invites.game_id,
      JSON_BUILD_OBJECT(
        'id', users.id,
        'handle', users.handle
      ) AS opponent,
      games.created_on
    FROM game_invites
    JOIN game_user ON game_user.game_id = game_invites.game_id
    JOIN games ON games.id = game_invites.game_id
    JOIN users ON game_user.user_id = users.id
    WHERE game_invites.user_id = $1
  `, [user_id])
  return rows
}
export const getChallenges = async (user_id) => {
  const games = await getGames(user_id)
  const invitations = await getInvitations(user_id)
  return {games, invitations}
}

export const getGame = async (id) => {
  const {rows: users} = await query(`
    SELECT
      game_user.user_id,
      game_user.life,
      game_user.is_ready,
      COALESCE(games.active_turn = game_user.user_id, FALSE) AS is_active_turn,
      COALESCE(games.winner = game_user.user_id, FALSE) AS is_winner,
      users.handle,
      COALESCE(cu.counters, '{}') AS counters
    FROM game_user
    JOIN users ON game_user.user_id = users.id
    JOIN games ON games.id = game_user.game_id
    LEFT JOIN (
      SELECT
        counter_game_user.game_id,
        counter_game_user.user_id,
        JSON_OBJECT_AGG(counter_game_user.counter, counter_game_user.amount) AS counters
      FROM counter_game_user
      GROUP BY counter_game_user.game_id, counter_game_user.user_id
    ) cu ON $1 = cu.game_id
      AND users.id = cu.user_id
    WHERE game_user.game_id = $1
  `, [id])
  const {rows: objects} = await query(`
    SELECT
      objects.id,
      objects.user_id,
      objects.zone,
      objects.position,
      objects.power,
      objects.toughness,
      objects.is_tapped,
      TO_JSON(cards.*) AS card,
      COALESCE(co.counters, '[]') AS counters,
      cf.card_faces,
      TO_JSON(card_faces.*) AS active_face
    FROM objects
    JOIN cards ON objects.card_id = cards.id
    LEFT JOIN card_faces ON objects.card_face_id = card_faces.id
    LEFT JOIN (
      SELECT
        card_faces.card_id,
        JSON_AGG(card_faces.*) AS card_faces
      FROM card_faces
      GROUP BY card_faces.card_id
    ) cf ON objects.card_id = cf.card_id
    LEFT JOIN (
      SELECT
        counter_object.object_id,
        JSON_AGG(JSON_BUILD_OBJECT('name', counter_object.counter, 'amount', counter_object.amount)) AS counters
      FROM counter_object
      GROUP BY counter_object.object_id
    ) co ON objects.id = co.object_id
    WHERE objects.zone IN ('exile', 'field', 'graveyard')
      AND objects.game_id = $1
    UNION ALL
    SELECT
      objects.id,
      objects.user_id,
      objects.zone,
      CASE
        WHEN objects.zone = 'library' THEN NULL
        ELSE objects.position
      END AS position,
      objects.power,
      objects.toughness,
      objects.is_tapped,
      JSON_BUILD_OBJECT('image_uris', cards.image_uris) AS card,
      '[]' AS counters,
      cf.card_faces,
      TO_JSON(card_faces.*) AS active_face
    FROM objects
    JOIN cards ON objects.card_id = cards.id
    LEFT JOIN card_faces ON objects.card_face_id = card_faces.id
    LEFT JOIN (
      SELECT
        card_faces.card_id,
        JSON_AGG(card_faces.*) AS card_faces
      FROM card_faces
      GROUP BY card_faces.card_id
    ) cf ON objects.card_id = cf.card_id
    WHERE objects.zone IN ('hand', 'library')
      AND objects.game_id = $1
  `, [id])
  const {rows: counts} = await query(`
    SELECT
      objects.user_id,
      COUNT(*)::integer AS library_total
    FROM objects
    WHERE objects.game_id = $1
      AND objects.zone = 'library'
    GROUP BY objects.user_id
  `, [id])
  return factory.game({id, users, objects, counts})
}
export const getGameUsers = async (game_id) => {
  const {rows, rowCount} = await query(`
    SELECT game_user.user_id
    FROM game_user
    WHERE game_user.game_id = $1
  `, [game_id])
  if (rowCount !== 2) {
    //throw
  }
  return rows
}
export const getCounters = async () => {
  const {rows} = await query(`SELECT counters.* FROM counters ORDER BY name`)
  return rows.map(factory.counter)
}
export const getTokens = async (name) => {
  const {rows} = await query(`
    SELECT TO_JSON(cards.*) as card
    FROM cards
    WHERE cards.type_line LIKE 'Token%'
      AND cards.name LIKE CONCAT('%', $1::text, '%')
    ORDER BY name
  `, [name])
  return rows.map(factory.object)
}
export const getZones = async () => {
  const {rows} = await query(`SELECT zones.name FROM zones ORDER BY name`)
  return rows.map(factory.zone)
}
export const getEvents = async (entity_id) => {
  const {rows} = await query(`
    SELECT
      events.*,
      creator.handle,
      CASE
        WHEN events.name = 'counter-card' THEN indirect.name
        WHEN events.name <> 'draw' AND events.name <> 'counter-card' THEN direct.name
      END AS card_name,
      CASE
        WHEN events.name = 'end-game' THEN winner.handle
      END AS winner
    FROM events
    JOIN users creator ON events.created_by = creator.id
    LEFT JOIN cards direct ON (events.data->>'card_id')::uuid = direct.id
    LEFT JOIN objects ON (events.data->>'object_id')::uuid = objects.id
    LEFT JOIN cards indirect ON objects.card_id = indirect.id
    LEFT JOIN users winner ON (events.data->>'winner')::uuid = winner.id
    WHERE events.entity_id = $1
    ORDER BY events.created_on ASC
  `, [entity_id])
  return rows
}

export const insertEvents = async (entity_id, name, data, user_id) => {
  const placeholders = data.reduce((agg, cur, index) =>
    agg.concat(`($${numericRange(1 + (4 * index), 4 + (4 * index)).join(', $')})`), []
  ).join(', ')
  const values = data.reduce((agg, cur) => agg.concat([entity_id, name, cur, user_id]), [])
  const {rows} = await query(`
    INSERT INTO events (entity_id, name, data, created_by)
    VALUES ${placeholders}
    RETURNING *
  `, values)
  return rows
}

export const life = async (game_id, user_id, amount) => {
  const {rows, rowCount} = await query(`
    UPDATE game_user
    SET life = $3
    WHERE game_user.game_id = $1
      AND game_user.user_id = $2
    RETURNING *
  `, [game_id, user_id, amount])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const userCounter = async (game_id, user_id, name, amount) => {
  const {rows, rowCount} = await query(`
    INSERT INTO counter_game_user (game_id, user_id, counter, amount)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT ON CONSTRAINT counter_game_user_pkey
    DO UPDATE SET amount = $4
  `, [game_id, user_id, name, amount])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}

export const start = async (game_id, user_id) => {
  const {rows: user, rowCount: userRowCount} = await query(`
    UPDATE game_user
    SET is_ready = TRUE
    WHERE game_user.game_id = $1
      AND game_user.user_id = $2
    RETURNING *
  `, [game_id, user_id])
  if (userRowCount !== 1) {
    //throw
  }
  const {rows: game, rowCount: gameRowCount} = await query(`
    UPDATE games
    SET active_turn = (
      SELECT game_user.user_id
      FROM game_user
      WHERE NOT EXISTS (
        SELECT 1
        FROM game_user
        WHERE game_user.game_id = $1
          AND game_user.is_ready = FALSE
      )
      ORDER BY RANDOM()
      LIMIT 1
    )
    WHERE games.id = $1
    RETURNING *
  `, [game_id])
  if (isNotEmpty(game) && gameRowCount !== 1) {
    //throw
  }
  return [user, game]
}
export const endTurn = async (game_id, user_id) => {
  const {rows, rowCount} = await query(`
    UPDATE games
    SET active_turn = (
      SELECT game_user.user_id
      FROM game_user
      WHERE game_user.game_id = $1
        AND game_user.user_id != $2
    )
    WHERE games.id = $1
    RETURNING *
  `, [game_id, user_id])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const endGame = async (game_id, user_id) => {
  const {rows, rowCount} = await query(`
    UPDATE games
    SET winner = (
      SELECT game_user.user_id
      FROM game_user
      WHERE game_user.game_id = $1
        AND game_user.user_id != $2
    )
    WHERE games.id = $1
    RETURNING *
  `, [game_id, user_id])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}

const moveAmountFromLibrary = async (game_id, user_id, amount, zone) => {
  const {rows, rowCount} = await query(`
    WITH cards AS (
      SELECT
        objects.id,
        ROW_NUMBER() OVER (ORDER BY objects.position DESC) + (
          SELECT COALESCE(MAX(objects.position), 0)
          FROM objects
          WHERE objects.game_id = $1
            AND objects.user_id = $2
            AND objects.zone = $4
        ) AS position
      FROM objects
      WHERE objects.game_id = $1
        AND objects.user_id = $2
        AND objects.zone = 'library'
      ORDER BY objects.position DESC
      LIMIT $3
    )
    UPDATE objects
    SET
      zone = $4,
      position = cards.position
    FROM cards
    WHERE objects.id = cards.id
    RETURNING *
  `, [game_id, user_id, amount, zone])
  if (rowCount !== amount) {
    //throw
  }
  return rows
}
export const draw = async (game_id, user_id, amount = 1) => moveAmountFromLibrary(game_id, user_id, amount, 'hand')
export const mill = async (game_id, user_id, amount = 1) => moveAmountFromLibrary(game_id, user_id, amount, 'graveyard')
export const move = async (game_id, object_id, user_id, zone, location) => {
  const {rows, rowCount} = await query(`
    WITH count AS (
      SELECT
        CASE $5
          WHEN 'bottom' THEN COALESCE(MIN(objects.position) - 1, 1)
          WHEN 'top' THEN COALESCE(MAX(objects.position) + 1, 1)
        END AS position
      FROM objects
      WHERE game_id = $2
        AND user_id = $3
        AND zone = $4
    )
    UPDATE objects
    SET
      zone = $4,
      position = count.position,
      is_tapped = FALSE
    FROM count
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
    RETURNING *
  `, [object_id, game_id, user_id, zone, location])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const mulligan = async (game_id, user_id) => {
  const {rows, rowCount} = await query(`
    UPDATE objects
    SET zone = 'library'
    WHERE objects.game_id = $1
      AND objects.user_id = $2
      AND objects.zone = 'hand'
    RETURNING *
  `, [game_id, user_id])
  await shuffle(game_id, user_id)
  return rows
}

export const cardCounter = async (object_id, name, amount) => {
  const {rows, rowCount} = await query(`
    INSERT INTO counter_object (object_id, counter, amount)
    VALUES ($1, $2, $3)
    ON CONFLICT ON CONSTRAINT counter_object_pkey
    DO UPDATE SET amount = $3
    RETURNING *
  `, [object_id, name, amount])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const power = async (game_id, object_id, user_id, value) => {
  const {rows, rowCount} = await query(`
    UPDATE objects
    SET power = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
      AND objects.zone = 'field'
    RETURNING *
  `, [object_id, game_id, user_id, value])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const scry = async (game_id, user_id, amount) => {
  const {rows, rowCount} = await query(`
    SELECT
      objects.id,
      objects.card_id,
      objects.user_id,
      objects.position,
      objects.zone,
      TO_JSON(cards.*) AS card,
      cf.card_faces,
      TO_JSON(card_faces.*) AS active_face
    FROM objects
    JOIN cards ON objects.card_id = cards.id
    LEFT JOIN card_faces ON objects.card_face_id = card_faces.id
    LEFT JOIN (
      SELECT
        card_faces.card_id,
        JSON_AGG(card_faces.*) AS card_faces
      FROM card_faces
      GROUP BY card_faces.card_id
    ) cf ON objects.card_id = cf.card_id
    WHERE objects.game_id = $1
      AND objects.user_id = $2
      AND objects.zone = 'library'
    ORDER BY objects.position DESC
    LIMIT $3
  `, [game_id, user_id, amount])
  if (rowCount !== amount) {
    //throw
  }
  return rows.map(factory.object)
}
export const shuffle = async (game_id, user_id) => {
  await query(`
    WITH ordered AS (
      SELECT
        objects.id,
        ROW_NUMBER() OVER (ORDER BY RANDOM()) AS position
      FROM objects
      WHERE game_id = $1
        AND user_id = $2
        AND zone = 'library'
    )
    UPDATE objects
    SET position = ordered.position
    FROM ordered
    WHERE objects.id = ordered.id
  `, [game_id, user_id])
  return true
}
export const tap = async (game_id, object_id, user_id, state) => {
  const {rows, rowCount} = await query(`
    UPDATE objects
    SET is_tapped = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
      AND objects.zone = 'field'
    RETURNING *
  `, [object_id, game_id, user_id, state])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const insertTokens = async (game_id, card_id, user_id, amount) => {
  const {rows, rowCount} = await query(`
    WITH count AS (
      SELECT
        GENERATE_SERIES(COALESCE(MAX(objects.position) + 1, 1), COALESCE(MAX(objects.position) + $4::integer, 1)) AS position
      FROM objects
      WHERE game_id = $1
        AND user_id = $3
        AND zone = 'field'
    )
    INSERT INTO objects (
      card_id,
      card_face_id,
      game_id,
      user_id,
      zone,
      power,
      toughness,
      position
    )
    SELECT
      cd.id,
      cd.card_face_id,
      $1 AS game_id,
      $3 AS user_id,
      'field' AS zone,
      cd.power,
      cd.toughness,
      count.position
    FROM count, (
      SELECT
        cards.id,
        CASE
          WHEN cards.power ~ '^\\d+(\\.\\d+)?$' THEN cards.power
        END AS power,
        CASE
          WHEN cards.toughness ~ '^\\d+(\\.\\d+)?$' THEN cards.toughness
        END AS toughness,
        (card_faces->0->>'id')::uuid AS card_face_id
      FROM cards
      LEFT JOIN (
        SELECT
          card_faces.card_id,
          JSON_AGG(card_faces.*) AS card_faces
        FROM card_faces
        GROUP BY card_faces.card_id
      ) cf ON cards.id = cf.card_id
      WHERE cards.id = $2
    ) cd
    RETURNING *
  `, [game_id, card_id, user_id, amount])
  if (rowCount !== amount) {
    //throw
  }
  return rows
}
export const toughness = async (game_id, object_id, user_id, value) => {
  const {rows, rowCount} = await query(`
    UPDATE objects
    SET toughness = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
      AND objects.zone = 'field'
    RETURNING *
  `, [object_id, game_id, user_id, value])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
export const transform = async (game_id, object_id, user_id, card_face_id) => {
  const {rows, rowCount} = await query(`
    UPDATE objects
    SET card_face_id = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
    RETURNING *
  `, [object_id, game_id, user_id, card_face_id])
  if (rowCount !== 1) {
    //throw
  }
  return rows
}
