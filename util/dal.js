import pg from 'pg'

import config from './config.js'
import * as factory from './factory.js'
import {
  chunk,
  copy,
  isNotEmpty,
  isNotNull,
  isNotObject,
  isNotUndefined,
  numericRange,
  toNumber,
} from './functions.js'

const pool = new pg.Pool(config.db)
const query = (text, values, expectedCount = null) => pool.query(text, values)
  .then((res) => {
    if (isNotNull(expectedCount) && toNumber(expectedCount) !== res.rowCount) {
      return Promise.reject(new Error('Row count does not match expected result', {cause: text.replace(/^\s{2,}/g, '').replace(/\s{2,}/g, ' ').replace(/\s{1,}$/g, '')}))
    }
    return res
  })
  .catch(async ({message, cause = 'no cause provided'}) => {
    await query(`INSERT INTO errors (data) VALUES ($1)`, [{message, cause}])
    throw new Error(message, {cause})
  })
const formatPlaceholders = (data, numValues) => data.reduce((agg, _, index) =>
  agg.concat(`($${numericRange(1 + (numValues * index), numValues + (numValues * index)).join(', $')})`), []
).join(', ')

const MAX = 60000

const allowedColumns = {
  deck_id: 'deck_id',
  email: 'email',
  game_id: 'game_id',
  user_id: 'user_id',
}
const allowedTables = {
  decks: 'decks',
  game_invites: 'game_invites',
  game_user: 'game_user',
  users: 'users',
}

export const exists = async (table, columns, values) => {
  const where = columns.reduce((agg, cur, index) =>
    agg.concat(`${allowedTables[table]}.${allowedColumns[cur]} = $${(1 + index)}`), []
  ).join(' AND ')
  const {rowCount} = await query(`
    SELECT ${allowedTables[table]}.*
    FROM ${allowedTables[table]}
    WHERE ${where}
  `, isNotObject(values) ? [values] : Object.values(values))
  return rowCount === 1
}

export const insertCatalog = async (kind, data) => {
  const numPlaceholders = 2
  const chunked = chunk(data, Math.floor(MAX / numPlaceholders))
  for (const chunk of chunked) {
    await query(`
      INSERT INTO catalog (kind, value)
      VALUES ${formatPlaceholders(chunk, numPlaceholders)}
      ON CONFLICT ON CONSTRAINT catalog_pkey
      DO NOTHING
    `, chunk.reduce((agg, cur) => agg.concat([kind, cur]), []))
  }
  return true
}

export const insertRulings = async (data) => {
  const numPlaceholders = Object.keys(data[0]).length
  const chunked = chunk(data, Math.floor(MAX / numPlaceholders))
  for (const chunk of chunked) {
    await query(`
      INSERT INTO rulings (oracle_id, published_at, comment)
      VALUES ${formatPlaceholders(chunk, numPlaceholders)}
    `, chunk.reduce((agg, cur) => agg.concat(Object.values(cur)), []))
  }
  return true
}
export const deleteRulings = async () => {
  await query(`DELETE FROM rulings`)
  return true
}

export const upsertCards = async (data) => {
  const reduced = data.map(({
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
  }) => ({
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
  }))
  const numPlaceholders = Object.keys(reduced[0]).length - 1
  for (const hunk of chunk(reduced, Math.floor(MAX / numPlaceholders))) {
    await query(`
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
      ) VALUES ${formatPlaceholders(hunk, numPlaceholders)}
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
    `, hunk.reduce((agg, cur) => agg.concat(Object.values(cur).slice(0, numPlaceholders)), []))
    const cardIds = hunk.map(({id}) => id)
    await query(`UPDATE objects SET card_face_id = NULL WHERE card_id = ANY ($1)`, [cardIds])
    await query(`DELETE FROM card_faces WHERE card_id = ANY ($1)`, [cardIds])
    const faces = hunk.filter((row) => isNotUndefined(row.card_faces)).map(({id, card_faces}) => card_faces.map(({
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
    }) => copy(
      {card_id: id},
      {
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
      }
    ))).flat()
    if (isNotEmpty(faces)) {
      const numPlaceholders2 = Object.keys(faces[0]).length
      for (const hunk2 of chunk(faces, numPlaceholders2)) {
        await query(`
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
          ) VALUES ${formatPlaceholders(hunk2, numPlaceholders2)}
          RETURNING id
        `, hunk2.reduce((agg, cur) => agg.concat(Object.values(cur)), []))
      }
    }
    await query(`
      WITH card_face AS (
        SELECT
          card_faces.id AS card_face_id,
          objects.id AS object_id
        FROM objects
        JOIN cards ON objects.card_id = cards.id
        LEFT JOIN (
          SELECT
            id,
            card_id,
            ROW_NUMBER() OVER (PARTITION BY card_faces.card_id ORDER BY card_faces.card_id) AS rn
          FROM card_faces
        ) card_faces ON card_faces.card_id = cards.id AND rn = 1
      )
      UPDATE objects
      SET card_face_id = card_face.card_face_id
      FROM card_face
      WHERE objects.id = object_id
    `)
  }
  return true
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

export const authenticateUser = async (email) => {
  const {rows: [row]} = await query(`SELECT users.* FROM users WHERE users.email = $1`, [email])
  return factory.user(row)
}
export const getUser = async (id) => {
  const {rows: [row]} = await query(`
    SELECT
      users.id,
      users.handle,
      users.email,
      users.is_admin
    FROM users
    WHERE users.id = $1
  `, [id])
  return factory.user(row)
}
export const getUsers = async (id) => {
  const {rows} = await query(`SELECT users.id, users.handle, users.is_admin FROM users`)
  return rows.map(factory.user)
}
export const insertUser = async ({email, handle, password} = factory.getUser()) => {
  const {rows: [row]} = await query(`
    INSERT INTO users (email, handle, password)
    VALUES ($1, $2, $3)
    RETURNING id, email, handle, is_admin
  `, [email, handle, password])
  return factory.user(row)
}
export const updateUser = async (id, email, handle) => {
  const {rows: [row]} = await query(`
    UPDATE users
    SET
      email = $2,
      handle = $3
    WHERE users.id = $1
    RETURNING id, email, handle, is_admin
  `, [id, email, handle])
  return factory.user(row)
}
export const changePassword = async (id, password) => {
  await query(`UPDATE users SET password = $2 WHERE users.id = $1`, [id, password])
  return true
}

const deleteInvitation = async (game_id, user_id) => {
  await query(`DELETE FROM game_invites WHERE game_id = $1 AND user_id = $2`, [game_id, user_id])
  return true
}
export const insertGame = async (deck_id, user_id) => {
  const {rows: [{id: game_id}]} = await query(`INSERT INTO games DEFAULT VALUES RETURNING id`)
  await query(`INSERT INTO game_invites (deck_id, game_id, user_id) VALUES ($1, $2, $3)`, [deck_id, game_id, user_id])
  return {game_id}
}
export const joinGame = async (deck_id, game_id, user_id) => {
  await query(`INSERT INTO game_user (deck_id, game_id, user_id) VALUES ($1, $2, $3)`, [deck_id, game_id, user_id])
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
export const getGames = async () => {
  const {rows} = await query(`
    SELECT
      games.id,
      JSON_AGG(JSON_BUILD_OBJECT(
        'deck', decks.name,
        'user_id', users.id,
        'handle', users.handle
      )) AS users,
      games.created_on,
      games.winner
    FROM games
    JOIN game_user ON game_user.game_id = games.id
    JOIN decks ON decks.id = game_user.deck_id
    JOIN users ON users.id = game_user.user_id
    LEFT JOIN game_invites ON game_invites.game_id = games.id
    WHERE game_invites.game_id IS NULL
    GROUP BY games.id, games.created_on, games.winner
  `)
  return rows
}
export const getInvitations = async (user_id) => {
  const {rows} = await query(`
    SELECT
      games.id,
      CASE game_invites.user_id
        WHEN $1 THEN 'received'
        ELSE 'sent'
      END AS type,
      CASE
        WHEN d1.name IS NOT NULL THEN d1.name
        ELSE d2.name
      END AS deck_name,
      CASE game_invites.user_id
        WHEN $1 THEN u2.handle
        ELSE u1.handle
      END AS handle,
      CASE game_invites.user_id
        WHEN $1 THEN u2.id
        ELSE u1.id
      END AS opponent_id,
      games.created_on
    FROM games
    JOIN game_user ON game_user.game_id = games.id
    JOIN game_invites ON game_invites.game_id = games.id
    LEFT JOIN decks d1 ON d1.id = game_invites.deck_id
    LEFT JOIN decks d2 ON d2.id = game_user.deck_id
    LEFT JOIN users u1 ON u1.id = game_invites.user_id
    LEFT JOIN users u2 ON u2.id = game_user.user_id
    WHERE game_invites.user_id = $1 OR game_user.user_id = $1
  `, [user_id])
  return rows
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
      objects.card_id,
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
    WHERE objects.zone IN ('exile', 'field', 'graveyard', 'remove')
      AND objects.game_id = $1
    UNION ALL
    SELECT
      objects.id,
      objects.card_id,
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
      SUM(CASE WHEN zone = 'library' THEN 1 ELSE 0 END)::integer AS library_total,
      SUM(CASE WHEN zone = 'graveyard' THEN 1 ELSE 0 END)::integer AS graveyard_total,
      SUM(CASE WHEN zone = 'exile' THEN 1 ELSE 0 END)::integer AS exile_total,
      SUM(CASE WHEN zone = 'remove' THEN 1 ELSE 0 END)::integer AS remove_total
    FROM objects
    WHERE objects.game_id = $1
    GROUP BY objects.user_id
  `, [id])
  return factory.game({id, users, objects, counts})
}
export const getGameUsers = async (game_id) => {
  const {rows} = await query(`
    SELECT game_user.user_id
    FROM game_user
    WHERE game_user.game_id = $1
  `, [game_id], 2)
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
    ORDER BY events.created_on DESC
  `, [entity_id])
  return rows
}

export const insertEvents = async (entity_id, name, data, user_id) => {
  const placeholders = formatPlaceholders(data, 4)
  const values = data.reduce((agg, cur) => agg.concat([entity_id, name, cur, user_id]), [])
  const {rows} = await query(`
    INSERT INTO events (entity_id, name, data, created_by)
    VALUES ${placeholders}
    RETURNING *
  `, values)
  return rows
}

export const life = async (game_id, user_id, amount) => {
  const {rows} = await query(`
    UPDATE game_user
    SET life = $3
    WHERE game_user.game_id = $1
      AND game_user.user_id = $2
    RETURNING *
  `, [game_id, user_id, amount], 1)
  return rows
}
export const userCounter = async (game_id, user_id, name, amount) => {
  const {rows} = await query(`
    INSERT INTO counter_game_user (game_id, user_id, counter, amount)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT ON CONSTRAINT counter_game_user_pkey
    DO UPDATE SET amount = $4
  `, [game_id, user_id, name, amount], 1)
  return rows
}

export const start = async (game_id, user_id) => {
  const {rows: user} = await query(`
    UPDATE game_user
    SET is_ready = TRUE
    WHERE game_user.game_id = $1
      AND game_user.user_id = $2
    RETURNING *
  `, [game_id, user_id], 1)
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
  const {rows} = await query(`
    UPDATE games
    SET active_turn = (
      SELECT game_user.user_id
      FROM game_user
      WHERE game_user.game_id = $1
        AND game_user.user_id != $2
    )
    WHERE games.id = $1
    RETURNING *
  `, [game_id, user_id], 1)
  return rows
}
export const endGame = async (game_id, user_id) => {
  const {rows} = await query(`
    UPDATE games
    SET winner = (
      SELECT game_user.user_id
      FROM game_user
      WHERE game_user.game_id = $1
        AND game_user.user_id != $2
    )
    WHERE games.id = $1
    RETURNING *
  `, [game_id, user_id], 1)
  return rows
}

const moveAmountFromLibrary = async (game_id, user_id, amount, zone) => {
  const {rows} = await query(`
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
  `, [game_id, user_id, amount, zone], amount)
  return rows
}
export const draw = async (game_id, user_id, amount = 1) => moveAmountFromLibrary(game_id, user_id, amount, 'hand')
export const mill = async (game_id, user_id, amount = 1) => moveAmountFromLibrary(game_id, user_id, amount, 'graveyard')
export const move = async (game_id, object_id, user_id, zone, location) => {
  const {rows} = await query(`
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
  `, [object_id, game_id, user_id, zone, location], 1)
  return rows
}
export const mulligan = async (game_id, user_id) => {
  const {rows} = await query(`
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
  const {rows} = await query(`
    INSERT INTO counter_object (object_id, counter, amount)
    VALUES ($1, $2, $3)
    ON CONFLICT ON CONSTRAINT counter_object_pkey
    DO UPDATE SET amount = $3
    RETURNING *
  `, [object_id, name, amount], 1)
  return rows
}
export const power = async (game_id, object_id, user_id, value) => {
  const {rows} = await query(`
    UPDATE objects
    SET power = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
      AND objects.zone = 'field'
    RETURNING *
  `, [object_id, game_id, user_id, value], 1)
  return rows
}
export const scry = async (game_id, user_id, amount) => {
  const {rows} = await query(`
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
  `, [game_id, user_id, amount], amount)
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
  const {rows} = await query(`
    UPDATE objects
    SET is_tapped = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
      AND objects.zone = 'field'
    RETURNING *
  `, [object_id, game_id, user_id, state], 1)
  return rows
}
export const untapAll = async (game_id, user_id) => {
  const {rows} = await query(`
    UPDATE objects
    SET is_tapped = false
    WHERE objects.game_id = $1
      AND objects.user_id = $2
      AND objects.zone = 'field'
    RETURNING *
  `, [game_id, user_id])
  return rows
}
export const insertTokens = async (game_id, card_id, user_id, amount) => {
  const {rows} = await query(`
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
  `, [game_id, card_id, user_id, amount], amount)
  return rows
}
export const toughness = async (game_id, object_id, user_id, value) => {
  const {rows} = await query(`
    UPDATE objects
    SET toughness = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
      AND objects.zone = 'field'
    RETURNING *
  `, [object_id, game_id, user_id, value], 1)
  return rows
}
export const transform = async (game_id, object_id, user_id, card_face_id) => {
  const {rows} = await query(`
    UPDATE objects
    SET card_face_id = $4
    WHERE objects.id = $1
      AND objects.game_id = $2
      AND objects.user_id = $3
    RETURNING *
  `, [object_id, game_id, user_id, card_face_id], 1)
  return rows
}
