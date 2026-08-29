-- ============================================================
-- La Elite PvP · Economía Elite Coin
-- Tareas, tienda de canjes, actividad de Discord y mercado.
-- Ejecuta este script UNA vez en Supabase > SQL Editor.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ============================================================

-- ============================================================
-- 0) AJUSTES DE LA ECONOMIA
--
-- Todo lo que decide cuanto vale una Elite Coin vive aqui, no en el codigo:
-- el precio de un canje, lo que paga una hora en voz, la deriva del mercado.
-- Asi se puede subir o bajar la dificultad desde el panel sin desplegar nada,
-- que es lo que de verdad hace falta cuando un premio se vacia en un dia.
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('eco.discord_voz_minuto',    '1'),      -- coins por minuto en voz
  ('eco.discord_voz_max_dia',   '240'),    -- techo diario por voz (4h pagadas)
  ('eco.discord_msg',           '2'),      -- coins por mensaje valido
  ('eco.discord_msg_max_dia',   '40'),     -- techo diario por mensajes
  ('eco.discord_msg_cooldown',  '60'),     -- segundos entre mensajes que pagan
  ('eco.mercado_deriva',        '0.0012'), -- sesgo alcista por vela (0.12%)
  ('eco.mercado_ruido',         '0.010'),  -- amplitud del vaiven aleatorio
  ('eco.mercado_impacto',       '0.000004'),-- cuanto empuja cada coin ganada
  ('eco.mercado_barron_prob',   '0.35'),   -- probabilidad de que Barron venda
  ('eco.mercado_barron_fuerza', '0.006'),  -- cuanto pesa esa venta
  ('eco.mercado_minutos_vela',  '5'),      -- duracion de cada vela
  ('eco.mercado_precio_base',   '0.000100')-- precio inicial en USD
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 1) TAREAS (misiones que pagan Elite Coin)
--
-- Sustituyen a `challenges`, que solo sabia mirar un stat del clan una vez y
-- para siempre. Estas tienen periodicidad (diaria, semanal, unica), publico
-- (miembros del clan o cualquiera) y una metrica que se comprueba contra datos
-- REALES: los stats que ya sincroniza el bot y la actividad de Discord.
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  -- 'kills','headshots','wins','booyahs','kd_ratio','partidas','max_kills'  -> stats del bot
  -- 'discord_voz_min','discord_msgs'                                        -> actividad Discord
  -- 'checkin','manual'                                                      -> acciones directas
  metrica text NOT NULL,
  objetivo numeric NOT NULL DEFAULT 1,
  coins integer NOT NULL,
  -- 'diaria' | 'semanal' | 'unica'
  periodo text NOT NULL DEFAULT 'unica' CHECK (periodo IN ('diaria','semanal','unica')),
  -- 'clan' = solo miembros verificados | 'todos' = tambien la comunidad
  publico text NOT NULL DEFAULT 'todos' CHECK (publico IN ('clan','todos')),
  -- 1..10. Marca el tamaño de la vela que deja en el grafico y el color del
  -- badge: una tarea nivel 9 tiene que VERSE distinta de un check-in.
  nivel integer NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 10),
  icono text,
  activa boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  coins integer NOT NULL,
  -- Fecha del periodo cobrado. Es la CLAVE del anti-spam: con un unique sobre
  -- (perfil, tarea, periodo) la base de datos garantiza que una tarea diaria no
  -- se cobra dos veces el mismo dia, aunque el cliente mande cien peticiones.
  periodo_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, task_id, periodo_key)
);
CREATE INDEX IF NOT EXISTS idx_task_completions_perfil
  ON task_completions(profile_id, created_at DESC);

-- Catalogo inicial: escalera de dificultad de nivel 1 a 10.
-- Las de abajo son el gancho (dopamina diaria, casi regaladas); las de arriba
-- son las que cuestan de verdad y las que hacen que un canje gordo se note.
INSERT INTO tasks (titulo, descripcion, metrica, objetivo, coins, periodo, publico, nivel, icono, orden)
SELECT * FROM (VALUES
  -- COMUNIDAD (no hace falta ser del clan) --------------------------------
  ('Fichar entrada',      'Entra a la web y marca tu check-in del día.',                  'checkin',         1,     10,  'diaria',  'todos', 1, '📅', 1),
  ('Dar señales de vida', 'Escribe 5 mensajes en el Discord del clan.',                   'discord_msgs',    5,     15,  'diaria',  'todos', 1, '💬', 2),
  ('Calentar la sala',    'Pasa 30 minutos en un canal de voz.',                          'discord_voz_min', 30,    25,  'diaria',  'todos', 2, '🎙️', 3),
  ('Residente',           'Acumula 3 horas de voz en la semana.',                         'discord_voz_min', 180,   120, 'semanal', 'todos', 4, '🏠', 4),
  ('El que no se calla',  'Escribe 200 mensajes en la semana.',                           'discord_msgs',    200,   150, 'semanal', 'todos', 4, '📢', 5),
  ('Vincular cuenta',     'Enlaza tu ID de Free Fire con tu perfil.',                     'manual',          1,     50,  'unica',   'todos', 2, '🔗', 6),

  -- CLAN (stats reales que ya lee el bot) ---------------------------------
  ('Primera sangre',      'Consigue 100 kills registradas.',                              'kills',           100,   60,  'unica',   'clan',  2, '🩸', 10),
  ('Cazador',             'Llega a 500 kills.',                                           'kills',           500,   200, 'unica',   'clan',  4, '🎯', 11),
  ('Depredador',          'Llega a 2.000 kills.',                                         'kills',           2000,  800, 'unica',   'clan',  6, '🐺', 12),
  ('Leyenda del clan',    'Llega a 10.000 kills.',                                        'kills',           10000, 4000,'unica',   'clan',  9, '👑', 13),
  ('Puntería',            'Acumula 250 headshots.',                                       'headshots',       250,   150, 'unica',   'clan',  3, '💥', 14),
  ('Francotirador',       'Acumula 1.000 headshots.',                                     'headshots',       1000,  600, 'unica',   'clan',  6, '🔭', 15),
  ('K/D respetable',      'Mantén un K/D de 2.0.',                                        'kd_ratio',        2.0,   120, 'unica',   'clan',  3, '⚖️', 16),
  ('K/D de miedo',        'Mantén un K/D de 4.0.',                                        'kd_ratio',        4.0,   700, 'unica',   'clan',  7, '😈', 17),
  ('Booyah',              'Consigue 25 Booyahs.',                                         'booyahs',         25,    180, 'unica',   'clan',  4, '🏆', 18),
  ('Rey del Booyah',      'Consigue 150 Booyahs.',                                        'booyahs',         150,   1200,'unica',   'clan',  8, '🥇', 19),
  ('Máquina',             'Juega 1.000 partidas.',                                        'partidas',        1000,  500, 'unica',   'clan',  5, '⚙️', 20),
  ('Partida perfecta',    'Registra una partida de 15+ kills.',                           'max_kills',       15,    400, 'unica',   'clan',  6, '🔥', 21),
  ('Imparable',           'Registra una partida de 25+ kills.',                           'max_kills',       25,    2500,'unica',   'clan', 10, '☄️', 22)
) AS v(titulo, descripcion, metrica, objetivo, coins, periodo, publico, nivel, icono, orden)
WHERE NOT EXISTS (SELECT 1 FROM tasks);

-- ============================================================
-- 2) TIENDA DE CANJES
--
-- El precio va en Elite Coin y se ajusta desde el panel. La referencia que
-- fijaste: 1.000.000 de coins = premio de 100 USD. De ahi cuelga el resto.
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  precio_coins bigint NOT NULL,
  -- Que hay que entregar cuando alguien canjea. `diamantes` deja el numero a
  -- mano para el aviso de Telegram; el resto se describe en texto.
  diamantes integer,
  valor_usd numeric(10,2),
  imagen_url text,
  -- 'basura' | 'normal' | 'epico' | 'legendario'. Solo decide como se pinta,
  -- pero es lo que hace que la tienda se lea de un vistazo.
  rareza text NOT NULL DEFAULT 'normal' CHECK (rareza IN ('basura','normal','epico','legendario')),
  -- -1 = ilimitado. Un stock corto es lo que convierte un premio en un evento.
  stock integer NOT NULL DEFAULT -1,
  -- Cuantas veces puede canjearlo UNA persona al dia. 0 = sin limite.
  limite_dia integer NOT NULL DEFAULT 0,
  -- Solo miembros del clan pueden canjearlo.
  solo_clan boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO shop_items (nombre, descripcion, precio_coins, diamantes, valor_usd, rareza, stock, limite_dia, solo_clan, orden)
SELECT * FROM (VALUES
  -- El gancho: barato, diario, y suficiente para que enganche el circuito de
  -- recompensa. Sin esto la tienda parece inalcanzable y nadie juega.
  ('110 Diamantes',   'El premio de cada día. Una tarea, un canje, diamantes.', 8000::bigint,     110,  1.00::numeric,  'basura',      -1, 1, false, 1),
  ('310 Diamantes',   'Sube un escalón. Se nota en la tienda del juego.',       22000::bigint,    310,  2.50::numeric,  'normal',      -1, 1, false, 2),
  ('Pase Elite',      'El pase de temporada completo, pagado por el clan.',     60000::bigint,    NULL, 6.00::numeric,  'normal',      -1, 0, false, 3),
  ('1.000 Diamantes', 'Recarga seria. Ya estás jugando en serio.',              70000::bigint,    1000, 8.00::numeric,  'epico',       -1, 0, false, 4),
  ('2.000 Diamantes', 'Para los que viven en la sala de voz.',                  135000::bigint,   2000, 16.00::numeric, 'epico',       -1, 0, true,  5),
  ('6.000 Diamantes', 'El premio gordo. Honra al clan y el clan te paga.',      380000::bigint,   6000, 48.00::numeric, 'legendario',  -1, 0, true,  6),
  ('Premio 100 USD',  'Cien dólares. El techo. Un millón de Elite Coin.',       1000000::bigint,  NULL, 100.00::numeric,'legendario',  -1, 0, true,  7)
) AS v(nombre, descripcion, precio_coins, diamantes, valor_usd, rareza, stock, limite_dia, solo_clan, orden)
WHERE NOT EXISTS (SELECT 1 FROM shop_items);

CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES shop_items(id),
  coins integer NOT NULL,
  -- Copia del nombre en el momento del canje: si mañana renombras el premio,
  -- el historial tiene que seguir diciendo lo que la persona canjeo de verdad.
  item_nombre text NOT NULL,
  free_fire_id text,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','entregado','rechazado')),
  nota text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_estado ON redemptions(estado, created_at DESC);

-- ============================================================
-- 3) ACTIVIDAD DE DISCORD
--
-- Una fila por persona y dia. El bot suma minutos de voz y mensajes; los topes
-- diarios viven en `settings` y los aplica el propio bot, para que quien deja
-- el micro abierto toda la noche no imprima coins mientras duerme.
-- ============================================================
CREATE TABLE IF NOT EXISTS discord_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  dia date NOT NULL DEFAULT CURRENT_DATE,
  voz_minutos integer NOT NULL DEFAULT 0,
  mensajes integer NOT NULL DEFAULT 0,
  coins_otorgadas integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discord_id, dia)
);
CREATE INDEX IF NOT EXISTS idx_discord_activity_perfil ON discord_activity(profile_id, dia DESC);

-- ============================================================
-- 4) MERCADO DE ELITE COIN
--
-- Es un espejo VISUAL de la economia, no un valor negociable: cada coin ganada
-- empuja el precio arriba, y "Barron Trump" (la cuenta de la casa) vende de
-- forma aleatoria para que la vela oscile en vez de dibujar una recta aburrida.
-- La tendencia es alcista por diseño; las correcciones fuertes las decides tu
-- desde el panel.
-- ============================================================
CREATE TABLE IF NOT EXISTS market_candles (
  -- El inicio del intervalo es la clave primaria: hace imposible duplicar una
  -- vela aunque diez navegadores pidan el tick a la vez.
  bucket timestamptz PRIMARY KEY,
  open numeric(18,8) NOT NULL,
  high numeric(18,8) NOT NULL,
  low numeric(18,8) NOT NULL,
  close numeric(18,8) NOT NULL,
  -- Coins ganadas por la comunidad dentro del intervalo.
  volumen bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_candles_bucket ON market_candles(bucket DESC);

-- Operaciones visibles en la cinta: cada coin ganada es una compra, cada venta
-- de Barron y cada canje son ventas.
CREATE TABLE IF NOT EXISTS market_trades (
  id bigserial PRIMARY KEY,
  lado text NOT NULL CHECK (lado IN ('compra','venta')),
  actor text NOT NULL,
  coins bigint NOT NULL,
  precio numeric(18,8) NOT NULL,
  -- 1..10: el tamaño de la vela que dibuja. Ganar 3 coins deja una vela de 3.
  tamano integer NOT NULL DEFAULT 1 CHECK (tamano BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_trades_fecha ON market_trades(created_at DESC);

-- ============================================================
-- 5) EL TOP 1: BARRON TRUMP
--
-- La cuenta de la casa. Encabeza el ranking, tiene el saldo que mueve el
-- mercado y es desde donde tu vendes o compras. No es de nadie: no tiene
-- `auth.users` detras, por eso vive en su propia tabla y no en `profiles`.
-- ============================================================
CREATE TABLE IF NOT EXISTS house_account (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre text NOT NULL DEFAULT 'Barron Trump',
  avatar_url text,
  coins bigint NOT NULL DEFAULT 24000000,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO house_account (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

/** Lee un ajuste numerico de `settings` con valor por defecto. */
CREATE OR REPLACE FUNCTION eco_num(p_key text, p_def numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF((SELECT value FROM settings WHERE key = p_key), '')::numeric, p_def);
$$;

/** Tamaño de vela 1..10 a partir de las coins de una operacion. */
CREATE OR REPLACE FUNCTION eco_tamano(p_coins bigint)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  -- Escala logaritmica: sin ella, una tarea de 4.000 coins aplastaria en el
  -- grafico a todas las de 10 y el mercado pareceria plano todo el rato.
  SELECT GREATEST(1, LEAST(10, (1 + floor(ln(GREATEST(p_coins, 1)::numeric) / ln(2.6)))::integer));
$$;

/** Precio actual: el cierre de la ultima vela, o el precio base. */
CREATE OR REPLACE FUNCTION market_precio()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT close FROM market_candles ORDER BY bucket DESC LIMIT 1),
    eco_num('eco.mercado_precio_base', 0.0001)
  );
$$;

-- ============================================================
-- 6) EL MOTOR: market_tick()
--
-- Cierra las velas que quedaron atras y abre la del intervalo actual.
-- Es idempotente y lo puede llamar cualquiera: si la vela del intervalo ya
-- existe, no hace nada. Asi el grafico sigue vivo aunque no haya un cron, y
-- diez visitantes a la vez no generan diez velas.
-- ============================================================
CREATE OR REPLACE FUNCTION market_tick()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min      integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 5)::integer);
  v_deriva   numeric := eco_num('eco.mercado_deriva', 0.0012);
  v_ruido    numeric := eco_num('eco.mercado_ruido', 0.010);
  v_impacto  numeric := eco_num('eco.mercado_impacto', 0.000004);
  v_bprob    numeric := eco_num('eco.mercado_barron_prob', 0.35);
  v_bfuerza  numeric := eco_num('eco.mercado_barron_fuerza', 0.006);
  v_base     numeric := eco_num('eco.mercado_precio_base', 0.0001);
  v_ahora    timestamptz := now();
  v_bucket   timestamptz;
  v_ultimo   timestamptz;
  v_precio   numeric;
  v_open     numeric;
  v_close    numeric;
  v_hi       numeric;
  v_lo       numeric;
  v_vol      bigint;
  v_paso     numeric;
  v_i        integer := 0;
BEGIN
  -- Intervalo actual, alineado al reloj.
  v_bucket := to_timestamp(floor(extract(epoch FROM v_ahora) / (v_min * 60)) * (v_min * 60));

  SELECT bucket, close INTO v_ultimo, v_precio
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  -- Arranque en frio: se siembra historial hacia atras para que el grafico no
  -- abra con una sola vela suelta, que parece roto.
  IF v_ultimo IS NULL THEN
    v_precio := v_base;
    v_ultimo := v_bucket - (v_min * 120 || ' minutes')::interval;
  END IF;

  IF v_ultimo >= v_bucket THEN
    RETURN v_precio;  -- La vela de este intervalo ya esta abierta.
  END IF;

  -- Se avanza intervalo a intervalo. El tope de 300 evita que una base parada
  -- un mes intente generar decenas de miles de velas en una sola llamada.
  WHILE v_ultimo < v_bucket AND v_i < 300 LOOP
    v_ultimo := v_ultimo + (v_min || ' minutes')::interval;
    v_i := v_i + 1;

    -- Coins ganadas por la comunidad en ese intervalo: es la presion compradora.
    SELECT COALESCE(SUM(amount), 0) INTO v_vol
      FROM point_events
      WHERE created_at >= v_ultimo - (v_min || ' minutes')::interval
        AND created_at <  v_ultimo
        AND amount > 0;

    v_open := v_precio;

    -- Tres fuerzas: la deriva (siempre a favor), el volumen real de la
    -- comunidad, y el ruido. El resultado se inclina al alza a proposito.
    v_paso := v_deriva
            + (v_vol::numeric * v_impacto)
            + ((random() - 0.45) * v_ruido);

    -- Barron vende de vez en cuando: sin esto la linea sube en escalera limpia
    -- y no parece un mercado. Con esto hay rojas de verdad entre las verdes.
    IF random() < v_bprob THEN
      v_paso := v_paso - (random() * v_bfuerza);
    END IF;

    v_close := GREATEST(v_base * 0.25, v_open * (1 + v_paso));

    -- Mechas: el recorrido dentro del intervalo, no solo el cierre.
    v_hi := GREATEST(v_open, v_close) * (1 + random() * v_ruido * 0.6);
    v_lo := LEAST(v_open, v_close)  * (1 - random() * v_ruido * 0.6);

    INSERT INTO market_candles (bucket, open, high, low, close, volumen)
      VALUES (v_ultimo, v_open, v_hi, v_lo, v_close, v_vol)
      ON CONFLICT (bucket) DO NOTHING;

    v_precio := v_close;
  END LOOP;

  -- Solo se guardan ~7 dias de velas: el grafico nunca muestra mas y la tabla
  -- crecería sin freno.
  DELETE FROM market_candles WHERE bucket < now() - interval '8 days';
  DELETE FROM market_trades  WHERE created_at < now() - interval '3 days';

  RETURN v_precio;
END;
$$;

/**
 * Registra una operacion en la cinta y empuja la vela ABIERTA.
 *
 * Se llama desde `claim_task` y desde los canjes. Sin esto, ganar coins solo
 * movería el grafico al cambiar de vela y el efecto de "yo hice esa vela" —
 * que es todo el gancho — se perdería.
 */
CREATE OR REPLACE FUNCTION market_push(p_lado text, p_actor text, p_coins bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min    integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 5)::integer);
  v_imp    numeric := eco_num('eco.mercado_impacto', 0.000004);
  v_bucket timestamptz;
  v_precio numeric;
  v_nuevo  numeric;
BEGIN
  PERFORM market_tick();
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));
  v_precio := market_precio();

  -- Una compra empuja arriba, una venta abajo, proporcional al tamaño.
  v_nuevo := GREATEST(
    eco_num('eco.mercado_precio_base', 0.0001) * 0.25,
    v_precio * (1 + (CASE WHEN p_lado = 'venta' THEN -1 ELSE 1 END) * p_coins::numeric * v_imp * 12)
  );

  INSERT INTO market_candles (bucket, open, high, low, close, volumen)
    VALUES (v_bucket, v_precio, GREATEST(v_precio, v_nuevo), LEAST(v_precio, v_nuevo), v_nuevo,
            CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END)
  ON CONFLICT (bucket) DO UPDATE SET
    close   = EXCLUDED.close,
    high    = GREATEST(market_candles.high, EXCLUDED.close),
    low     = LEAST(market_candles.low, EXCLUDED.close),
    volumen = market_candles.volumen + CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END,
    updated_at = now();

  INSERT INTO market_trades (lado, actor, coins, precio, tamano)
    VALUES (p_lado, p_actor, p_coins, v_nuevo, eco_tamano(p_coins));
END;
$$;

-- ============================================================
-- 7) COBRAR UNA TAREA
--
-- Toda la comprobacion ocurre AQUI, en el servidor. El cliente solo dice "quiero
-- cobrar la tarea X"; si pudiera decir cuantas coins vale, la economia entera
-- serían dos lineas en la consola del navegador.
-- ============================================================
CREATE OR REPLACE FUNCTION claim_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_perfil profiles%ROWTYPE;
  v_t      tasks%ROWTYPE;
  v_key    text;
  v_valor  numeric := 0;
  v_member jsonb;
  v_nick   text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inicia sesión para cobrar.');
  END IF;

  SELECT * INTO v_perfil FROM profiles WHERE id = v_uid;
  SELECT * INTO v_t FROM tasks WHERE id = p_task_id AND activa = true;
  IF v_t.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa tarea ya no existe.');
  END IF;

  IF v_t.publico = 'clan' AND NOT COALESCE(v_perfil.is_member, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo para miembros del clan. Vincula tu ID.');
  END IF;

  -- Clave del periodo: es lo que el UNIQUE usa para impedir el doble cobro.
  v_key := CASE v_t.periodo
             WHEN 'diaria'  THEN to_char(now(), 'YYYY-MM-DD')
             WHEN 'semanal' THEN to_char(now(), 'IYYY-"W"IW')
             ELSE 'unica'
           END;

  IF EXISTS (SELECT 1 FROM task_completions
             WHERE profile_id = v_uid AND task_id = p_task_id AND periodo_key = v_key) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya cobraste esta tarea.');
  END IF;

  -- --- Verificacion de la metrica contra datos reales ---
  IF v_t.metrica = 'checkin' THEN
    v_valor := 1;  -- Entrar y pulsar YA es la tarea.

  ELSIF v_t.metrica = 'manual' THEN
    -- Reservada a hitos que otra parte del sistema ya valido (vincular cuenta).
    v_valor := CASE WHEN COALESCE(v_perfil.is_member, false) THEN 1 ELSE 0 END;

  ELSIF v_t.metrica IN ('discord_voz_min', 'discord_msgs') THEN
    SELECT COALESCE(SUM(CASE WHEN v_t.metrica = 'discord_voz_min' THEN voz_minutos ELSE mensajes END), 0)
      INTO v_valor
      FROM discord_activity
      WHERE profile_id = v_uid
        AND dia >= CASE v_t.periodo
                     WHEN 'diaria'  THEN CURRENT_DATE
                     WHEN 'semanal' THEN date_trunc('week', now())::date
                     ELSE '1970-01-01'::date
                   END;

  ELSE
    -- Stats del juego: salen de `members`, que es lo que sincroniza el bot.
    IF v_perfil.member_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Vincula tu ID de Free Fire primero.');
    END IF;
    SELECT to_jsonb(m.*), m.nickname INTO v_member, v_nick FROM members m WHERE m.id = v_perfil.member_id;
    v_valor := COALESCE((v_member ->> v_t.metrica)::numeric, 0);
  END IF;

  IF v_valor < v_t.objetivo THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'Todavía no llegas.',
      'progreso', v_valor, 'objetivo', v_t.objetivo
    );
  END IF;

  -- --- Pago ---
  INSERT INTO task_completions (profile_id, task_id, coins, periodo_key)
    VALUES (v_uid, p_task_id, v_t.coins, v_key);
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_uid, 'task', v_t.coins);
  UPDATE profiles SET points = COALESCE(points, 0) + v_t.coins, updated_at = now()
    WHERE id = v_uid;

  -- La vela. Ganar coins TIENE que verse en el grafico al instante: ese es el
  -- unico motivo por el que la gente vuelve a mirarlo.
  PERFORM market_push('compra',
    COALESCE(v_nick, v_perfil.display_name, v_perfil.username, 'Jugador'),
    v_t.coins);

  RETURN jsonb_build_object(
    'ok', true, 'coins', v_t.coins,
    'total', (SELECT points FROM profiles WHERE id = v_uid),
    'vela', eco_tamano(v_t.coins)
  );
END;
$$;

-- ============================================================
-- 8) CANJEAR UN PREMIO
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_item(p_item_id uuid, p_ffid text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_perfil profiles%ROWTYPE;
  v_item   shop_items%ROWTYPE;
  v_hoy    integer;
  v_id     uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inicia sesión para canjear.');
  END IF;

  SELECT * INTO v_perfil FROM profiles WHERE id = v_uid;
  -- FOR UPDATE bloquea la fila: sin esto, dos pulsaciones simultaneas sobre el
  -- ultimo premio en stock lo entregarian dos veces.
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND activo = true FOR UPDATE;

  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese premio ya no está disponible.');
  END IF;
  IF v_item.solo_clan AND NOT COALESCE(v_perfil.is_member, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Premio exclusivo para miembros del clan.');
  END IF;
  IF v_item.stock = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Agotado.');
  END IF;
  IF COALESCE(v_perfil.points, 0) < v_item.precio_coins THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'Te faltan Elite Coin.',
      'faltan', v_item.precio_coins - COALESCE(v_perfil.points, 0)
    );
  END IF;
  IF v_item.limite_dia > 0 THEN
    SELECT COUNT(*) INTO v_hoy FROM redemptions
      WHERE profile_id = v_uid AND item_id = p_item_id
        AND created_at >= date_trunc('day', now());
    IF v_hoy >= v_item.limite_dia THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ya lo canjeaste hoy. Vuelve mañana.');
    END IF;
  END IF;

  UPDATE profiles SET points = points - v_item.precio_coins, updated_at = now() WHERE id = v_uid;
  INSERT INTO point_events (profile_id, type, amount)
    VALUES (v_uid, 'redeem', -v_item.precio_coins);
  IF v_item.stock > 0 THEN
    UPDATE shop_items SET stock = stock - 1 WHERE id = p_item_id;
  END IF;

  INSERT INTO redemptions (profile_id, item_id, coins, item_nombre, free_fire_id)
    VALUES (v_uid, p_item_id, v_item.precio_coins, v_item.nombre,
            COALESCE(p_ffid, v_perfil.free_fire_id))
    RETURNING id INTO v_id;

  -- Un canje retira coins de circulacion: en el grafico es una venta.
  PERFORM market_push('venta',
    COALESCE(v_perfil.display_name, v_perfil.username, 'Jugador'), v_item.precio_coins);

  RETURN jsonb_build_object(
    'ok', true, 'canje', v_id, 'item', v_item.nombre,
    'restante', (SELECT points FROM profiles WHERE id = v_uid)
  );
END;
$$;

-- ============================================================
-- 9) LA MANO DE BARRON (control manual desde el panel)
--
-- Es tu palanca de correccion: cuando el precio se te vaya de las manos,
-- vendes; cuando quieras un empujon, compras. Solo staff.
-- ============================================================
CREATE OR REPLACE FUNCTION house_trade(p_lado text, p_coins bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
BEGIN
  SELECT role INTO v_rol FROM profiles WHERE id = auth.uid();
  IF v_rol IS NULL OR v_rol NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo el owner mueve el mercado.');
  END IF;
  IF p_lado NOT IN ('compra', 'venta') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lado no válido.');
  END IF;

  UPDATE house_account
    SET coins = GREATEST(0, coins + CASE WHEN p_lado = 'compra' THEN p_coins ELSE -p_coins END)
    WHERE id = 1;

  PERFORM market_push(p_lado, (SELECT nombre FROM house_account WHERE id = 1), p_coins);
  RETURN jsonb_build_object('ok', true, 'precio', market_precio());
END;
$$;

-- ============================================================
-- 10) RLS
-- ============================================================
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_activity  ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_candles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trades     ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_account     ENABLE ROW LEVEL SECURITY;

-- Lectura publica de lo que es un escaparate. El grafico, el top y la tienda
-- tienen que verse SIN iniciar sesion: son el anzuelo para quien aun no juega.
DROP POLICY IF EXISTS "tasks read"    ON tasks;
CREATE POLICY "tasks read"    ON tasks    FOR SELECT USING (true);
DROP POLICY IF EXISTS "shop read"     ON shop_items;
CREATE POLICY "shop read"     ON shop_items FOR SELECT USING (activo = true);
DROP POLICY IF EXISTS "candles read"  ON market_candles;
CREATE POLICY "candles read"  ON market_candles FOR SELECT USING (true);
DROP POLICY IF EXISTS "trades read"   ON market_trades;
CREATE POLICY "trades read"   ON market_trades FOR SELECT USING (true);
DROP POLICY IF EXISTS "house read"    ON house_account;
CREATE POLICY "house read"    ON house_account FOR SELECT USING (true);

-- Lo personal, solo su dueño (y el staff).
DROP POLICY IF EXISTS "completions self" ON task_completions;
CREATE POLICY "completions self" ON task_completions FOR SELECT USING (
  auth.uid() = profile_id OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
);
DROP POLICY IF EXISTS "redemptions self" ON redemptions;
CREATE POLICY "redemptions self" ON redemptions FOR SELECT USING (
  auth.uid() = profile_id OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
);
DROP POLICY IF EXISTS "discord self" ON discord_activity;
CREATE POLICY "discord self" ON discord_activity FOR SELECT USING (
  auth.uid() = profile_id OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
);

-- Escritura: SOLO staff, y solo sobre configuracion. Los saldos y los canjes se
-- mueven exclusivamente por las funciones de arriba, que comprueban todo.
DROP POLICY IF EXISTS "tasks staff" ON tasks;
CREATE POLICY "tasks staff" ON tasks FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin')));
DROP POLICY IF EXISTS "shop staff" ON shop_items;
CREATE POLICY "shop staff" ON shop_items FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin')))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin')));
DROP POLICY IF EXISTS "redemptions staff" ON redemptions;
CREATE POLICY "redemptions staff" ON redemptions FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator')));
DROP POLICY IF EXISTS "house staff" ON house_account;
CREATE POLICY "house staff" ON house_account FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin')));

-- `point_events` acepta ahora tipos nuevos.
ALTER TABLE point_events DROP CONSTRAINT IF EXISTS point_events_type_check;
ALTER TABLE point_events ADD CONSTRAINT point_events_type_check
  CHECK (type IN ('checkin','link','challenge','task','discord','redeem','admin'));

GRANT EXECUTE ON FUNCTION market_tick()                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION market_precio()              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_task(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_item(uuid, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION house_trade(text, bigint)    TO authenticated;

-- Realtime: el top y el grafico se mueven solos, sin recargar.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE market_candles, market_trades, redemptions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Primera vela, para que el grafico no abra vacio.
SELECT market_tick();

-- ============================================================
-- 11) ACTIVIDAD DE DISCORD -> ELITE COIN
--
-- La llama el bot con la service role key. Los topes y el precio por minuto se
-- aplican AQUI y no en el bot, por dos razones: se pueden cambiar desde el panel
-- sin reiniciar nada, y si alguien se hiciera con el token del bot no podria
-- regalarse coins, porque el bot no dice cuanto vale nada — solo cuanto tiempo
-- estuvo y cuantos mensajes escribio.
-- ============================================================
CREATE OR REPLACE FUNCTION discord_award(
  p_discord_id text,
  p_voz_min integer DEFAULT 0,
  p_msgs integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil   uuid;
  v_nombre   text;
  v_fila     discord_activity%ROWTYPE;
  v_pv       numeric := eco_num('eco.discord_voz_minuto', 1);
  v_pm       numeric := eco_num('eco.discord_msg', 2);
  v_maxv     numeric := eco_num('eco.discord_voz_max_dia', 240);
  v_maxm     numeric := eco_num('eco.discord_msg_max_dia', 40);
  v_ya_voz   integer;
  v_ya_msg   integer;
  v_gana_voz integer;
  v_gana_msg integer;
  v_total    integer;
BEGIN
  IF p_discord_id IS NULL OR p_discord_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin-id');
  END IF;

  SELECT id, COALESCE(display_name, username) INTO v_perfil, v_nombre
    FROM profiles WHERE discord_id = p_discord_id LIMIT 1;

  INSERT INTO discord_activity (discord_id, profile_id, dia, voz_minutos, mensajes)
    VALUES (p_discord_id, v_perfil, CURRENT_DATE, GREATEST(p_voz_min, 0), GREATEST(p_msgs, 0))
  ON CONFLICT (discord_id, dia) DO UPDATE SET
    voz_minutos = discord_activity.voz_minutos + GREATEST(p_voz_min, 0),
    mensajes    = discord_activity.mensajes    + GREATEST(p_msgs, 0),
    profile_id  = COALESCE(discord_activity.profile_id, EXCLUDED.profile_id),
    updated_at  = now()
  RETURNING * INTO v_fila;

  -- Sin cuenta vinculada la actividad SE GUARDA igual, pero no paga. Asi, en
  -- cuanto la persona entra a la web con Discord, sus tareas semanales ya
  -- cuentan el tiempo que llevaba acumulado.
  IF v_perfil IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'coins', 0, 'motivo', 'sin-cuenta-web');
  END IF;

  -- Cuanto de cada tope se ha usado ya hoy. Se reparte el pago por concepto
  -- para que el que solo escribe no consuma el presupuesto del que esta en voz.
  v_ya_voz := LEAST(v_fila.voz_minutos - GREATEST(p_voz_min, 0), (v_maxv / GREATEST(v_pv, 0.0001))::integer);
  v_ya_msg := LEAST(v_fila.mensajes    - GREATEST(p_msgs, 0),    (v_maxm / GREATEST(v_pm, 0.0001))::integer);

  v_gana_voz := GREATEST(0, LEAST(GREATEST(p_voz_min, 0),
                  ((v_maxv / GREATEST(v_pv, 0.0001))::integer - v_ya_voz))) * v_pv;
  v_gana_msg := GREATEST(0, LEAST(GREATEST(p_msgs, 0),
                  ((v_maxm / GREATEST(v_pm, 0.0001))::integer - v_ya_msg))) * v_pm;
  v_total := v_gana_voz + v_gana_msg;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'coins', 0, 'motivo', 'tope-diario');
  END IF;

  UPDATE profiles SET points = COALESCE(points, 0) + v_total, updated_at = now()
    WHERE id = v_perfil;
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_perfil, 'discord', v_total);
  UPDATE discord_activity SET coins_otorgadas = coins_otorgadas + v_total
    WHERE id = v_fila.id;

  PERFORM market_push('compra', COALESCE(v_nombre, 'Discord'), v_total);

  RETURN jsonb_build_object('ok', true, 'coins', v_total,
                            'total', (SELECT points FROM profiles WHERE id = v_perfil));
END;
$$;

-- Solo el bot (service role) la llama. Nadie mas: seria imprimir coins.
REVOKE ALL ON FUNCTION discord_award(text, integer, integer) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 12) VINCULAR LA CUENTA DE DISCORD AL PERFIL
--
-- Sin esto, el bot no sabe a que perfil de la web pertenece cada persona del
-- servidor y la actividad no paga a nadie. Supabase guarda el ID de Discord en
-- los metadatos del usuario al entrar con OAuth; aqui se copia a `profiles`.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_discord_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_did text;
BEGIN
  v_did := COALESCE(
    NEW.raw_user_meta_data ->> 'provider_id',
    NEW.raw_user_meta_data ->> 'sub'
  );
  IF v_did IS NOT NULL THEN
    UPDATE profiles SET discord_id = v_did WHERE id = NEW.id AND discord_id IS DISTINCT FROM v_did;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_discord ON auth.users;
CREATE TRIGGER on_auth_user_discord
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_discord_id();

-- Rellena los que ya existen.
UPDATE profiles p
   SET discord_id = COALESCE(u.raw_user_meta_data ->> 'provider_id',
                             u.raw_user_meta_data ->> 'sub')
  FROM auth.users u
 WHERE u.id = p.id
   AND p.discord_id IS NULL
   AND COALESCE(u.raw_user_meta_data ->> 'provider_id',
                u.raw_user_meta_data ->> 'sub') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_discord ON profiles(discord_id);
