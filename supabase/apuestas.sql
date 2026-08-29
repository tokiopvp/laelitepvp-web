-- ============================================================
-- La Elite PvP · Apuestas PvP con Elite Coin
-- Ejecutar DESPUES de economia.sql, economia_v2.sql y economia_v3.sql.
-- Idempotente.
--
-- COMO FUNCIONA
-- -------------
--   1. Alguien crea una apuesta por N coins.   -> se le RETIRAN las N coins
--   2. Otro la acepta.                          -> se le RETIRAN las N coins
--   3. Juegan el PvP y mandan foto del resultado.
--   4. Un moderador pulsa quien gano.           -> el ganador cobra 2N
--
-- POR QUE SE RETIRAN LAS COINS AL COMPROMETERSE
-- ---------------------------------------------
-- La alternativa -"reservarlas" logicamente y descontar al final- es una
-- promesa que la base de datos no puede cumplir: entre que aceptas la apuesta
-- y se resuelve el combate, esa persona puede canjear un premio y quedarse a
-- cero. Entonces el ganador no cobra y la culpa es del sistema. Retirandolas al
-- comprometerse, el bote existe de verdad desde el primer segundo.
--
-- POR QUE EL VEREDICTO LO DA UNA PERSONA
-- --------------------------------------
-- Un pantallazo de Free Fire no se puede verificar automaticamente sin abrir la
-- puerta a montajes. Se asume que un moderador mira la foto y decide; el
-- sistema garantiza lo que SI puede garantizar: que el bote esta intacto, que
-- nadie cobra dos veces, y que queda registrado quien dio el veredicto.
-- ============================================================

-- ------------------------------------------------------------
-- AJUSTES
-- ------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('apuestas.min',            '50'),     -- apuesta minima
  ('apuestas.max',            '50000'),  -- maxima, freno a un mal dia
  ('apuestas.max_abiertas',   '3'),      -- apuestas sin emparejar por persona
  ('apuestas.comision_pct',   '0'),      -- % que se queda el clan (0 = nada)
  ('apuestas.caducidad_horas','24')      -- una apuesta sin aceptar se devuelve
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- TABLA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Se guarda el perfil (para cobrar) Y el id de Discord (para mencionar en el
  -- canal sin tener que cruzar tablas en cada mensaje).
  creador_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creador_discord text NOT NULL,
  creador_nombre  text NOT NULL,

  rival_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rival_discord  text,
  rival_nombre   text,

  monto bigint NOT NULL CHECK (monto > 0),

  -- abierta   -> esperando rival (coins del creador ya retenidas)
  -- jugando   -> emparejada, bote completo, jugando el PvP
  -- resuelta  -> pagada al ganador
  -- cancelada -> devuelto lo retenido
  estado text NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta','jugando','resuelta','cancelada')),

  ganador_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderador_discord text,
  prueba_url text,          -- foto del resultado
  nota text,

  -- Ids de Discord para poder editar el mensaje de la apuesta en su canal.
  mensaje_id text,
  canal_id text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  aceptada_en  timestamptz,
  resuelta_en  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bets_estado ON bets(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_creador ON bets(creador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_rival ON bets(rival_id, created_at DESC);

-- El saldo se mueve por estas funciones, nunca a mano.
ALTER TABLE point_events DROP CONSTRAINT IF EXISTS point_events_type_check;
ALTER TABLE point_events ADD CONSTRAINT point_events_type_check
  CHECK (type IN ('checkin','link','challenge','task','discord','redeem','admin',
                  'apuesta','premio'));

-- ------------------------------------------------------------
-- HELPER: perfil a partir del id de Discord
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION bet_perfil(p_discord text)
RETURNS profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM profiles WHERE discord_id = p_discord LIMIT 1;
$$;

-- ============================================================
-- CREAR
-- ============================================================
CREATE OR REPLACE FUNCTION bet_create(p_discord text, p_monto bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p      profiles%ROWTYPE;
  v_min    bigint := eco_num('apuestas.min', 50)::bigint;
  v_max    bigint := eco_num('apuestas.max', 50000)::bigint;
  v_tope   integer := eco_num('apuestas.max_abiertas', 3)::integer;
  v_id     uuid;
  v_abiertas integer;
BEGIN
  SELECT * INTO v_p FROM bet_perfil(p_discord);
  IF v_p.id IS NULL THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Primero entra a laelitepvp.com con Discord para tener saldo.');
  END IF;

  IF p_monto < v_min OR p_monto > v_max THEN
    RETURN jsonb_build_object('ok', false,
      'error', format('La apuesta debe estar entre %s y %s Elite Coin.', v_min, v_max));
  END IF;

  -- Sin este tope, una persona abre veinte apuestas, congela todo su saldo y
  -- deja el canal lleno de ofertas que no puede sostener.
  SELECT count(*) INTO v_abiertas FROM bets
   WHERE creador_id = v_p.id AND estado = 'abierta';
  IF v_abiertas >= v_tope THEN
    RETURN jsonb_build_object('ok', false,
      'error', format('Ya tienes %s apuestas abiertas. Cierra alguna primero.', v_abiertas));
  END IF;

  -- Bloqueo de la fila del saldo: sin esto, dos apuestas creadas en el mismo
  -- instante podrian comprometer las mismas coins dos veces.
  PERFORM 1 FROM profiles WHERE id = v_p.id FOR UPDATE;
  SELECT * INTO v_p FROM profiles WHERE id = v_p.id;

  IF COALESCE(v_p.points, 0) < p_monto THEN
    RETURN jsonb_build_object('ok', false,
      'error', format('Te faltan %s Elite Coin.', p_monto - COALESCE(v_p.points, 0)));
  END IF;

  UPDATE profiles SET points = points - p_monto, updated_at = now() WHERE id = v_p.id;
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_p.id, 'apuesta', -p_monto);

  INSERT INTO bets (creador_id, creador_discord, creador_nombre, monto)
    VALUES (v_p.id, p_discord,
            COALESCE(v_p.display_name, v_p.username, 'Jugador'), p_monto)
    RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'monto', p_monto,
    'creador', COALESCE(v_p.display_name, v_p.username),
    'saldo', (SELECT points FROM profiles WHERE id = v_p.id));
END;
$$;

-- ============================================================
-- ACEPTAR
-- ============================================================
CREATE OR REPLACE FUNCTION bet_accept(p_bet uuid, p_discord text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b profiles%ROWTYPE;
  v_a bets%ROWTYPE;
BEGIN
  -- FOR UPDATE sobre la apuesta: si dos personas pulsan ACEPTAR a la vez, la
  -- segunda espera y encuentra la apuesta ya en 'jugando'. Sin esto, ambas
  -- pagarian y una se quedaria sin combate y sin coins.
  SELECT * INTO v_a FROM bets WHERE id = p_bet FOR UPDATE;
  IF v_a.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa apuesta ya no existe.');
  END IF;
  IF v_a.estado <> 'abierta' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Alguien se te adelantó.');
  END IF;

  SELECT * INTO v_b FROM bet_perfil(p_discord);
  IF v_b.id IS NULL THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Primero entra a laelitepvp.com con Discord para tener saldo.');
  END IF;
  IF v_b.id = v_a.creador_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No puedes aceptar tu propia apuesta.');
  END IF;

  PERFORM 1 FROM profiles WHERE id = v_b.id FOR UPDATE;
  SELECT * INTO v_b FROM profiles WHERE id = v_b.id;
  IF COALESCE(v_b.points, 0) < v_a.monto THEN
    RETURN jsonb_build_object('ok', false,
      'error', format('Te faltan %s Elite Coin para esta apuesta.',
                      v_a.monto - COALESCE(v_b.points, 0)));
  END IF;

  UPDATE profiles SET points = points - v_a.monto, updated_at = now() WHERE id = v_b.id;
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_b.id, 'apuesta', -v_a.monto);

  UPDATE bets SET
      rival_id      = v_b.id,
      rival_discord = p_discord,
      rival_nombre  = COALESCE(v_b.display_name, v_b.username, 'Jugador'),
      estado        = 'jugando',
      aceptada_en   = now()
    WHERE id = p_bet;

  RETURN jsonb_build_object('ok', true, 'id', p_bet, 'monto', v_a.monto,
    'bote', v_a.monto * 2,
    'creador', v_a.creador_nombre, 'creador_discord', v_a.creador_discord,
    'rival', COALESCE(v_b.display_name, v_b.username),
    'rival_discord', p_discord);
END;
$$;

-- ============================================================
-- CANCELAR
--
-- Solo mientras nadie la haya aceptado, o por un moderador. Una apuesta
-- 'jugando' cancelada por un moderador devuelve a LOS DOS: si el combate no se
-- pudo jugar, nadie debe perder.
-- ============================================================
CREATE OR REPLACE FUNCTION bet_cancel(p_bet uuid, p_discord text, p_es_mod boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a bets%ROWTYPE;
BEGIN
  SELECT * INTO v_a FROM bets WHERE id = p_bet FOR UPDATE;
  IF v_a.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa apuesta ya no existe.');
  END IF;
  IF v_a.estado IN ('resuelta', 'cancelada') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa apuesta ya está cerrada.');
  END IF;
  IF NOT p_es_mod AND v_a.creador_discord <> p_discord THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo quien la creó puede cancelarla.');
  END IF;
  IF NOT p_es_mod AND v_a.estado = 'jugando' THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Ya está emparejada. Que la cancele un moderador.');
  END IF;

  -- Devolucion de lo retenido.
  UPDATE profiles SET points = points + v_a.monto, updated_at = now()
    WHERE id = v_a.creador_id;
  INSERT INTO point_events (profile_id, type, amount)
    VALUES (v_a.creador_id, 'apuesta', v_a.monto);

  IF v_a.rival_id IS NOT NULL THEN
    UPDATE profiles SET points = points + v_a.monto, updated_at = now()
      WHERE id = v_a.rival_id;
    INSERT INTO point_events (profile_id, type, amount)
      VALUES (v_a.rival_id, 'apuesta', v_a.monto);
  END IF;

  UPDATE bets SET estado = 'cancelada', resuelta_en = now(),
                  moderador_discord = CASE WHEN p_es_mod THEN p_discord END
    WHERE id = p_bet;

  RETURN jsonb_build_object('ok', true, 'devuelto', v_a.monto);
END;
$$;

-- ============================================================
-- VEREDICTO
--
-- El moderador elige ganador y el bote entero se paga de una vez. Solo puede
-- ocurrir UNA vez: el `estado <> 'jugando'` de arriba es lo que lo impide,
-- incluso si el bot manda el mismo clic dos veces por un reintento de red.
-- ============================================================
CREATE OR REPLACE FUNCTION bet_resolve(p_bet uuid, p_ganador_discord text,
                                       p_moderador text, p_prueba text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a       bets%ROWTYPE;
  v_gan     uuid;
  v_gan_nom text;
  v_per_nom text;
  v_bote    bigint;
  v_com     numeric := eco_num('apuestas.comision_pct', 0);
  v_pago    bigint;
BEGIN
  SELECT * INTO v_a FROM bets WHERE id = p_bet FOR UPDATE;
  IF v_a.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa apuesta ya no existe.');
  END IF;
  IF v_a.estado <> 'jugando' THEN
    RETURN jsonb_build_object('ok', false,
      'error', format('La apuesta está %s, no se puede resolver.', v_a.estado));
  END IF;

  IF p_ganador_discord = v_a.creador_discord THEN
    v_gan := v_a.creador_id; v_gan_nom := v_a.creador_nombre; v_per_nom := v_a.rival_nombre;
  ELSIF p_ganador_discord = v_a.rival_discord THEN
    v_gan := v_a.rival_id;   v_gan_nom := v_a.rival_nombre;   v_per_nom := v_a.creador_nombre;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Ese jugador no está en esta apuesta.');
  END IF;

  v_bote := v_a.monto * 2;
  -- La comision se queda en la cuenta de la casa. Por defecto es 0: cobrar por
  -- jugar entre ellos desanima justo lo que se quiere fomentar.
  v_pago := v_bote - floor(v_bote * v_com / 100.0)::bigint;

  UPDATE profiles SET points = points + v_pago, updated_at = now() WHERE id = v_gan;
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_gan, 'premio', v_pago);

  IF v_bote - v_pago > 0 THEN
    UPDATE house_account SET coins = coins + (v_bote - v_pago) WHERE id = 1;
  END IF;

  UPDATE bets SET estado = 'resuelta', ganador_id = v_gan, resuelta_en = now(),
                  moderador_discord = p_moderador,
                  prueba_url = COALESCE(p_prueba, prueba_url)
    WHERE id = p_bet;

  -- El mercado tiene que enterarse. Una apuesta no crea ni destruye coins -lo
  -- que pierde uno lo gana el otro-, asi que se empujan las DOS patas: sale el
  -- ganador comprando y el perdedor vendiendo. El precio queda practicamente
  -- igual, que es lo honesto, pero el movimiento se VE en la cinta en directo,
  -- que es lo que hace que un combate se sienta en la pagina.
  PERFORM market_push('compra', v_gan_nom, v_a.monto);
  PERFORM market_push('venta',  v_per_nom, v_a.monto);

  RETURN jsonb_build_object('ok', true, 'ganador', v_gan_nom, 'perdedor', v_per_nom,
    'pago', v_pago, 'bote', v_bote,
    'saldo_ganador', (SELECT points FROM profiles WHERE id = v_gan));
END;
$$;

-- ============================================================
-- CADUCIDAD
--
-- Una apuesta que nadie acepta no puede retener las coins de alguien para
-- siempre. Esto lo llama el bot cada cierto tiempo.
-- ============================================================
CREATE OR REPLACE FUNCTION bet_caducar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_h integer := eco_num('apuestas.caducidad_horas', 24)::integer;
  v_n integer := 0;
  r   record;
BEGIN
  FOR r IN SELECT id FROM bets
            WHERE estado = 'abierta'
              AND created_at < now() - (v_h || ' hours')::interval
  LOOP
    PERFORM bet_cancel(r.id, 'sistema', true);
    v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'caducadas', v_n);
END;
$$;

-- ============================================================
-- LECTURA
-- ============================================================
CREATE OR REPLACE FUNCTION bet_saldo(p_discord text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v profiles%ROWTYPE;
  v_ret bigint;
BEGIN
  SELECT * INTO v FROM bet_perfil(p_discord);
  IF v.id IS NULL THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'No tienes cuenta. Entra a laelitepvp.com con Discord.');
  END IF;
  SELECT COALESCE(SUM(monto), 0) INTO v_ret FROM bets
   WHERE estado IN ('abierta','jugando')
     AND (creador_id = v.id OR rival_id = v.id);
  RETURN jsonb_build_object('ok', true,
    'nombre', COALESCE(v.display_name, v.username),
    'saldo', COALESCE(v.points, 0),
    'comprometido', v_ret,
    'es_miembro', COALESCE(v.is_member, false));
END;
$$;

-- ------------------------------------------------------------
-- RLS: lo publico se ve, lo demas solo staff. El saldo lo mueven
-- exclusivamente las funciones de arriba.
-- ------------------------------------------------------------
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bets read" ON bets;
-- Las apuestas son publicas a proposito: la pagina muestra los duelos en vivo,
-- y eso es media gracia del asunto.
CREATE POLICY "bets read" ON bets FOR SELECT USING (true);

DROP POLICY IF EXISTS "bets staff write" ON bets;
CREATE POLICY "bets staff write" ON bets FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator')));

-- Estas funciones SOLO las llama el bot con la service role key. Si un jugador
-- pudiera invocarlas desde el navegador, podria crear apuestas a nombre de
-- cualquiera pasandole su id de Discord.
REVOKE ALL ON FUNCTION bet_create(text, bigint)               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bet_accept(uuid, text)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bet_cancel(uuid, text, boolean)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bet_resolve(uuid, text, text, text)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bet_caducar()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bet_saldo(text)                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION bet_perfil(text)                       FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

SELECT 'apuestas listas' AS estado;
