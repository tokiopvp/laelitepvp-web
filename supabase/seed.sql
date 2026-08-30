-- ============================================
-- La Elite PvP - Seed Data
-- Run AFTER schema.sql
-- ============================================

-- MEMBERS
INSERT INTO members (nickname, role_in_clan, rank, level, kd_ratio, headshots, wins, booyahs, is_active) VALUES
  ('TokioCEO', 'leader', 'Grandmaster', 80, 12.5, 15420, 3200, 890, true),
  ('ShadowKiller', 'interim_leader', 'Grandmaster', 78, 11.2, 13200, 2980, 810, true),
  ('NightmareOP', 'elder', 'Master', 75, 10.8, 11800, 2750, 760, true),
  ('GhostAim', 'member', 'Master', 72, 9.5, 9800, 2400, 680, true),
  ('VenomPro', 'member', 'Diamond', 68, 8.7, 8200, 2100, 590, true),
  ('PhantomX', 'member', 'Diamond', 65, 8.1, 7600, 1950, 540, true),
  ('CrimsonFang', 'member', 'Platinum', 60, 7.3, 6400, 1700, 480, true),
  ('BlazeKing', 'member', 'Platinum', 58, 6.9, 5800, 1550, 430, true);

-- TOPS (generated from members)
INSERT INTO tops (category, member_id, value, rank_position)
SELECT 'kd', id, kd_ratio, ROW_NUMBER() OVER (ORDER BY kd_ratio DESC)
FROM members WHERE is_active = true;

INSERT INTO tops (category, member_id, value, rank_position)
SELECT 'headshots', id, headshots, ROW_NUMBER() OVER (ORDER BY headshots DESC)
FROM members WHERE is_active = true;

INSERT INTO tops (category, member_id, value, rank_position)
SELECT 'wins', id, wins, ROW_NUMBER() OVER (ORDER BY wins DESC)
FROM members WHERE is_active = true;

INSERT INTO tops (category, member_id, value, rank_position)
SELECT 'booyahs', id, booyahs, ROW_NUMBER() OVER (ORDER BY booyahs DESC)
FROM members WHERE is_active = true;

INSERT INTO tops (category, member_id, value, rank_position)
SELECT 'level', id, level, ROW_NUMBER() OVER (ORDER BY level DESC)
FROM members WHERE is_active = true;

-- TOURNAMENTS
INSERT INTO tournaments (name, game_mode, prize, placement, date_played, participants_count) VALUES
  ('Elite Cup Season 12', 'Squad', '$500 USD', 1, '2025-07-15', 64),
  ('Free Fire Pro League', 'Squad', '$1000 USD', 1, '2025-06-20', 128),
  ('Solo Masters', 'Solo', '$200 USD', 1, '2025-05-10', 256),
  ('Duo Showdown', 'Duo', '$300 USD', 2, '2025-04-22', 64),
  ('Clash Squad Championship', 'Clash Squad', '$400 USD', 1, '2025-03-18', 32);

-- PRODUCTS (PagoStore)
INSERT INTO products (name, category, diamonds_amount, price_usd, discount_percent, is_featured) VALUES
  ('100 Diamantes', 'diamonds', 100, 1.99, 0, false),
  ('310 Diamantes', 'diamonds', 310, 4.99, 5, true),
  ('520 Diamantes', 'diamonds', 520, 7.99, 5, false),
  ('1060 Diamantes', 'diamonds', 1060, 14.99, 10, true),
  ('2180 Diamantes', 'diamonds', 2180, 29.99, 10, false),
  ('5600 Diamantes', 'diamonds', 5600, 74.99, 15, true),
  ('50k Diamantes', 'diamonds', 50000, 325.00, 0, false),
  ('100k Diamantes', 'diamonds', 100000, 650.00, 5, true),
  ('1M Diamantes', 'diamonds', 1000000, 6000.00, 10, true),
  ('Weekly Membership', 'membership', 0, 3.99, 0, false),
  ('Monthly Membership', 'membership', 0, 12.99, 0, true),
  ('Elite Bundle', 'bundle', 2200, 24.99, 20, false),
  ('Booyah Pass', 'pass', 0, 9.99, 0, false);

-- NEWS
INSERT INTO news (title, slug, excerpt, content, is_published, published_at) VALUES
  ('La Elite PvP conquista la Elite Cup S12', 'elite-cup-s12', 'Ganamos el torneo más grande de la temporada.', '# Victoria\n\nNuestro squad dominó la Elite Cup Season 12 con un performance perfecto.', true, NOW()),
  ('Nuevos ingresos abiertos', 'nuevos-ingresos', 'Buscamos talento competitivo.', 'Estamos reclutando jugadores Diamond+ para la próxima temporada.', true, NOW());
