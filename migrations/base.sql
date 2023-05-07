CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IDX_session_expire ON session(expire);

CREATE TABLE IF NOT EXISTS cards (
  id UUID NOT NULL PRIMARY KEY,
  oracle_id UUID,
  name VARCHAR(200) NOT NULL,
  released_at DATE NOT NULL,
  color_identity VARCHAR(1)[] NOT NULL,
  color_indicator VARCHAR(1)[],
  colors VARCHAR(1)[],
  produced_mana VARCHAR(1)[],
  keywords VARCHAR(100)[] NOT NULL,
  type_line VARCHAR(100),
  layout VARCHAR(20) NOT NULL,
  rarity VARCHAR(25) NOT NULL,
  cmc DECIMAL(9,1),
  mana_cost VARCHAR(50),
  power VARCHAR(5),
  toughness VARCHAR(5),
  oracle_text TEXT,
  flavor_text TEXT,
  set_id UUID NOT NULL,
  set VARCHAR(25) NOT NULL,
  set_name VARCHAR(100) NOT NULL,
  image_status VARCHAR(12),
  image_uris JSONB,
  rulings_uri VARCHAR(200) NOT NULL,
  scryfall_uri VARCHAR(200) NOT NULL,
  uri VARCHAR(200) NOT NULL,
  scryfall_set_uri VARCHAR(200) NOT NULL,
  set_uri VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS card_faces (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id),
  name VARCHAR(200) NOT NULL,
  color_indicator VARCHAR(1)[],
  colors VARCHAR(1)[],
  type_line VARCHAR(100),
  layout VARCHAR(20),
  cmc DECIMAL(9,1),
  mana_cost VARCHAR(50),
  power VARCHAR(5),
  toughness VARCHAR(5),
  oracle_text TEXT,
  image_uris JSONB
);

CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(50) UNIQUE NOT NULL,
  handle VARCHAR(50) NOT NULL,
  password VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS decks (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(50) UNIQUE NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS card_deck (
  card_id UUID REFERENCES cards(id) NOT NULL,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (card_id, deck_id)
);

CREATE TABLE IF NOT EXISTS games (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  active_turn UUID REFERENCES users(id),
  winner UUID REFERENCES users(id),
  created_on TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_user (
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES users(id),
  life SMALLINT NOT NULL DEFAULT 20,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (game_id, user_id)
);

CREATE TABLE IF NOT EXISTS game_invites (
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (game_id, user_id)
);

CREATE TABLE IF NOT EXISTS zones (
  name VARCHAR(10) NOT NULL PRIMARY KEY
);

INSERT INTO zones (name) VALUES
  ('exile'),
  ('field'),
  ('graveyard'),
  ('hand'),
  ('library'),
  ('remove')
ON CONFLICT zones_pkey DO NOTHING;

CREATE TABLE IF NOT EXISTS objects (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id),
  card_face_id UUID REFERENCES card_faces(id),
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES users(id),
  zone VARCHAR(10) NOT NULL REFERENCES zones(name),
  position SMALLINT,
  power VARCHAR(5),
  toughness VARCHAR(5),
  is_tapped BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS counters (
  name VARCHAR(20) NOT NULL PRIMARY KEY,
  kind VARCHAR(4) NOT NULL
);

INSERT INTO counters
  (name, kind)
VALUES
  ('acorn', 'card'),
  ('aegis', 'card'),
  ('age', 'card'),
  ('aim', 'card'),
  ('arrow', 'card'),
  ('arrowhead', 'card'),
  ('awakening', 'card'),
  ('blaze', 'card'),
  ('blood', 'card'),
  ('bloodline', 'card'),
  ('book', 'card'),
  ('bounty', 'card'),
  ('bribery', 'card'),
  ('spore', 'card'),
  ('-1/-1', 'card'),
  ('+1/+1', 'card'),
  ('loyalty', 'card'),
  ('poison', 'user'),
  ('experience', 'user'),
  ('charge', 'card'),
  ('energy', 'user'),
  ('growth', 'card'),
  ('time', 'card');

CREATE TABLE IF NOT EXISTS counter_object (
  object_id UUID NOT NULL REFERENCES objects(id),
  counter VARCHAR(20) NOT NULL REFERENCES counters(name),
  amount INTEGER DEFAULT 1,
  PRIMARY KEY (object_id, counter)
);

CREATE TABLE IF NOT EXISTS counter_game_user (
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES users(id),
  counter VARCHAR(20) NOT NULL REFERENCES counters(name),
  amount INTEGER DEFAULT 1,
  PRIMARY KEY (game_id, user_id, counter)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  name VARCHAR(25) NOT NULL,
  data JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_on TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
