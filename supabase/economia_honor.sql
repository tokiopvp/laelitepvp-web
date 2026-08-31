-- ============================================================
-- La Elite PvP · Economia de HONOR, boosters y premios
-- Ejecutar UNA VEZ en Supabase > SQL Editor, despues de
-- mercado_calibracion.sql.
-- ============================================================
--
-- QUE CAMBIA
-- ----------
-- Hasta ahora las coins salian de tres sitios: entrar a la web, estar en
-- Discord y los hitos de estadisticas que se cobran una sola vez. El problema
-- es que los hitos se AGOTAN: el que lleva meses jugando los cobra todos la
-- primera semana y despues no tiene nada que hacer. Queda el goteo de Discord,
-- que paga por estar sentado, no por jugar.
--
-- El honor arregla eso. Es lo unico del juego que se renueva cada semana, que
-- el bot del clan ya lee, y que sube SOLO jugando. Convertirlo en la fuente
-- principal de coins alinea las dos cosas que interesan: quien mas juega para
-- el clan, mas gana.
--
-- DE DONDE SALEN LOS NUMEROS
-- --------------------------
-- De los datos reales del clan, no de una estimacion:
--
--     49 jugadores, 20 con CERO honor
--     29 activos · mediana 210/semana · media 1.844 · maximo 16.697
--     total del clan: 53.485 de honor por semana
--
-- Con eso se definieron cuatro perfiles y se calibro hasta que el premio gordo
-- -6.160 diamantes- cayera a los ~20 dias del que mas juega, que es lo pedido:
--
--     Ballena (2.385 honor/dia)   114.000 coins/dia   6.160 diamantes en 18 dias
--     Activo  (1.132 honor/dia)    51.500 coins/dia   en 39 dias
--     Medio   (  210 honor/dia)     8.600 coins/dia   en 232 dias
--     Casual  (   30 honor/dia)     1.400 coins/dia   fuera de su alcance
--
-- IGUALDAD
-- --------
-- El bonus por convertir es por RACHA -dias seguidos haciendo honor-, no por
-- volumen. Un bonus por volumen se lo queda siempre el mismo: el que ya iba
-- ganando. La racha la puede tener cualquiera, y premia lo unico que de verdad
-- se quiere fomentar, que es entrar todos los dias.
-- ============================================================

-- ------------------------------------------------------------------ ajustes
INSERT INTO settings (key, value) VALUES
  -- Coins por cada punto de honor.
  ('eco.honor_tasa', '25'),
  -- Techo diario de honor acreditable. El maximo real observado en un dia son
  -- ~6.000: nadie honesto lo toca. Esta para que una lectura mal hecha del OCR
  -- no imprima millones de coins de golpe.
  ('eco.honor_max_dia', '8000'),
  -- Minimo por conversion, para que no haya mil conversiones de 1.
  ('eco.honor_min_canje', '50'),
  -- Racha: +5% por dia seguido con honor, hasta +50% (10 dias).
  ('eco.honor_racha_paso', '0.05'),
  ('eco.honor_racha_max', '0.50'),
  -- Lo que cobra quien NO esta en el clan, sobre las tareas abiertas a todos.
  ('eco.factor_no_miembro', '0.45'),
  -- Multiplicador de quien mejora el servidor de Discord.
  ('eco.factor_booster', '2.0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- --------------------------------------------------------------- boosters
-- Se guarda la FECHA hasta la que vale, no un si/no: si alguien deja de
-- mejorar el servidor y el bot no llega a avisar, el privilegio caduca solo.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booster_hasta timestamptz;

-- Tareas exclusivas de boosters.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_publico_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_publico_check
  CHECK (publico IN ('clan', 'todos', 'booster'));

-- El historial de movimientos tiene una lista cerrada de conceptos. Sin anadir
-- 'honor' aqui, `canjear_honor` fallaria al escribir el movimiento y la
-- conversion entera se caeria con un error de restriccion.
ALTER TABLE point_events DROP CONSTRAINT IF EXISTS point_events_type_check;
ALTER TABLE point_events ADD CONSTRAINT point_events_type_check
  CHECK (type IN ('checkin','link','challenge','task','discord','redeem','admin',
                  'apuesta','premio','honor'));

-- ============================================================
-- 1) EL LIBRO DE HONOR
--
-- POR QUE UNA TABLA Y NO LEER `members` DIRECTAMENTE
-- --------------------------------------------------
-- `members` se reescribe entera en cada pasada del sync. Si la conversion
-- leyera de ahi, la misma persona podria convertir el mismo honor una y otra
-- vez, o perderlo si una lectura sale baja. Hace falta un saldo que solo suba
-- por diferencias verificadas.
--
-- Y hay una trampa concreta: `clan_honor_semana` se REINICIA cada semana. Si
-- se restara sin mas, el reinicio daria un salto negativo; y `clan_honor_hoy`,
-- que ya calcula el bot, se dispara justo el dia del reinicio -se ha visto un
-- caso real con honor_hoy=1768 y honor_semana=480-. Por eso el libro guarda el
-- maximo por SEMANA y acredita solo lo que sube dentro de esa semana.
-- ============================================================
CREATE TABLE IF NOT EXISTS honor_lecturas (
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  semana     text NOT NULL,              -- 'IYYY-Www'
  honor_max  bigint NOT NULL DEFAULT 0,  -- el mayor valor visto esa semana
  creado_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, semana)
);

CREATE TABLE IF NOT EXISTS honor_banco (
  profile_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  disponible     bigint NOT NULL DEFAULT 0,
  ganado_total   bigint NOT NULL DEFAULT 0,
  canjeado_total bigint NOT NULL DEFAULT 0,
  racha          integer NOT NULL DEFAULT 0,
  racha_dia      date,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Cuanto honor se ha acreditado hoy: es lo que aplica el techo diario.
CREATE TABLE IF NOT EXISTS honor_creditos (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dia        date NOT NULL,
  honor      bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, dia)
);

ALTER TABLE honor_lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE honor_banco    ENABLE ROW LEVEL SECURITY;
ALTER TABLE honor_creditos ENABLE ROW LEVEL SECURITY;

-- Cada uno ve SOLO su saldo. El de los demas no es asunto suyo.
DROP POLICY IF EXISTS honor_banco_propio ON honor_banco;
CREATE POLICY honor_banco_propio ON honor_banco FOR SELECT
  USING (profile_id = auth.uid());

-- Nadie escribe estas tablas desde el navegador: solo las funciones.
GRANT SELECT ON honor_banco TO authenticated;

-- ============================================================
-- 2) ACREDITAR HONOR  (la llama el sync, con la clave de servicio)
-- ============================================================
CREATE OR REPLACE FUNCTION honor_acreditar(
  p_member_id uuid,
  p_semana    text,
  p_honor     bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil   uuid;
  v_previo   bigint;
  v_hay      boolean;
  v_nuevo    bigint;
  v_ya_hoy   bigint;
  v_tope     bigint := eco_num('eco.honor_max_dia', 8000)::bigint;
  v_racha    integer;
  v_racha_d  date;
BEGIN
  IF p_member_id IS NULL OR p_honor IS NULL OR p_honor < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'datos');
  END IF;

  SELECT id INTO v_perfil FROM profiles WHERE member_id = p_member_id LIMIT 1;

  -- La lectura se guarda SIEMPRE, tenga o no cuenta web. El dia que esa
  -- persona entre con Discord, su semana ya esta medida: ni arranca de cero ni
  -- cobra de golpe todo lo que llevaba acumulado.
  SELECT honor_max INTO v_previo
    FROM honor_lecturas WHERE member_id = p_member_id AND semana = p_semana;
  v_hay := FOUND;

  INSERT INTO honor_lecturas (member_id, semana, honor_max)
    VALUES (p_member_id, p_semana, p_honor)
  ON CONFLICT (member_id, semana) DO UPDATE
    SET honor_max = GREATEST(honor_lecturas.honor_max, EXCLUDED.honor_max);

  IF v_perfil IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'honor', 0, 'motivo', 'sin-cuenta-web');
  END IF;

  -- Primera lectura de la semana: es el PUNTO DE PARTIDA, no se paga. Si se
  -- pagara, el lunes de estreno todo el mundo cobraria de golpe el honor que
  -- ya llevaba, sin haber hecho nada nuevo.
  IF NOT v_hay THEN
    RETURN jsonb_build_object('ok', true, 'honor', 0, 'motivo', 'linea-base');
  END IF;

  v_nuevo := GREATEST(0, p_honor - v_previo);
  IF v_nuevo = 0 THEN
    RETURN jsonb_build_object('ok', true, 'honor', 0);
  END IF;

  -- Techo del dia.
  SELECT COALESCE(honor, 0) INTO v_ya_hoy
    FROM honor_creditos WHERE profile_id = v_perfil AND dia = CURRENT_DATE;
  v_nuevo := LEAST(v_nuevo, GREATEST(0, v_tope - COALESCE(v_ya_hoy, 0)));
  IF v_nuevo = 0 THEN
    RETURN jsonb_build_object('ok', true, 'honor', 0, 'motivo', 'tope-diario');
  END IF;

  INSERT INTO honor_creditos (profile_id, dia, honor)
    VALUES (v_perfil, CURRENT_DATE, v_nuevo)
  ON CONFLICT (profile_id, dia) DO UPDATE
    SET honor = honor_creditos.honor + EXCLUDED.honor;

  -- Racha: sube un dia solo la primera vez que se acredita honor en la fecha.
  SELECT racha, racha_dia INTO v_racha, v_racha_d
    FROM honor_banco WHERE profile_id = v_perfil;
  IF v_racha_d IS NULL OR v_racha_d < CURRENT_DATE - 1 THEN
    v_racha := 1;                       -- se rompio
  ELSIF v_racha_d = CURRENT_DATE - 1 THEN
    v_racha := COALESCE(v_racha, 0) + 1;
  ELSE
    v_racha := COALESCE(v_racha, 1);    -- ya contaba hoy
  END IF;

  INSERT INTO honor_banco (profile_id, disponible, ganado_total, racha, racha_dia)
    VALUES (v_perfil, v_nuevo, v_nuevo, v_racha, CURRENT_DATE)
  ON CONFLICT (profile_id) DO UPDATE SET
    disponible     = honor_banco.disponible   + EXCLUDED.disponible,
    ganado_total   = honor_banco.ganado_total + EXCLUDED.ganado_total,
    racha          = EXCLUDED.racha,
    racha_dia      = CURRENT_DATE,
    actualizado_en = now();

  RETURN jsonb_build_object('ok', true, 'honor', v_nuevo, 'racha', v_racha);
END;
$$;

REVOKE ALL ON FUNCTION honor_acreditar(uuid, text, bigint) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3) MI SALDO DE HONOR
-- ============================================================
CREATE OR REPLACE FUNCTION mi_honor()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_b     honor_banco%ROWTYPE;
  v_tasa  numeric := eco_num('eco.honor_tasa', 25);
  v_paso  numeric := eco_num('eco.honor_racha_paso', 0.05);
  v_max   numeric := eco_num('eco.honor_racha_max', 0.50);
  v_racha integer;
  v_bonus numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('disponible', 0, 'tasa', v_tasa);
  END IF;
  SELECT * INTO v_b FROM honor_banco WHERE profile_id = v_uid;

  -- La racha solo cuenta si sigue viva: si el ultimo dia con honor fue
  -- anteayer, ya se rompio aunque la columna siga diciendo 9.
  v_racha := CASE
    WHEN v_b.racha_dia IS NULL OR v_b.racha_dia < CURRENT_DATE - 1 THEN 0
    ELSE COALESCE(v_b.racha, 0)
  END;
  v_bonus := LEAST(v_max, v_racha * v_paso);

  RETURN jsonb_build_object(
    'disponible',     COALESCE(v_b.disponible, 0),
    'ganado_total',   COALESCE(v_b.ganado_total, 0),
    'canjeado_total', COALESCE(v_b.canjeado_total, 0),
    'racha',          v_racha,
    'bonus',          v_bonus,
    'tasa',           v_tasa,
    'tasa_efectiva',  round(v_tasa * (1 + v_bonus), 2),
    'min_canje',      eco_num('eco.honor_min_canje', 50)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION mi_honor() TO authenticated;

-- ============================================================
-- 4) CAMBIAR HONOR POR ELITE COIN
-- ============================================================
CREATE OR REPLACE FUNCTION canjear_honor(p_honor bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_b      honor_banco%ROWTYPE;
  v_tasa   numeric := eco_num('eco.honor_tasa', 25);
  v_paso   numeric := eco_num('eco.honor_racha_paso', 0.05);
  v_max    numeric := eco_num('eco.honor_racha_max', 0.50);
  v_min    bigint  := eco_num('eco.honor_min_canje', 50)::bigint;
  v_racha  integer;
  v_bonus  numeric;
  v_coins  bigint;
  v_nombre text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inicia sesión.');
  END IF;
  IF p_honor IS NULL OR p_honor < v_min THEN
    RETURN jsonb_build_object('ok', false,
      'error', format('El mínimo son %s de honor.', v_min));
  END IF;

  -- FOR UPDATE: dos pestañas pulsando a la vez no pueden gastar el mismo honor.
  SELECT * INTO v_b FROM honor_banco WHERE profile_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_b.disponible < p_honor THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No tienes tanto honor.',
      'disponible', COALESCE(v_b.disponible, 0));
  END IF;

  v_racha := CASE
    WHEN v_b.racha_dia IS NULL OR v_b.racha_dia < CURRENT_DATE - 1 THEN 0
    ELSE COALESCE(v_b.racha, 0)
  END;
  v_bonus := LEAST(v_max, v_racha * v_paso);
  v_coins := floor(p_honor * v_tasa * (1 + v_bonus))::bigint;

  UPDATE honor_banco SET
    disponible     = disponible - p_honor,
    canjeado_total = canjeado_total + p_honor,
    actualizado_en = now()
  WHERE profile_id = v_uid;

  UPDATE profiles SET points = COALESCE(points, 0) + v_coins, updated_at = now()
    WHERE id = v_uid
    RETURNING COALESCE(display_name, username) INTO v_nombre;
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_uid, 'honor', v_coins);

  PERFORM market_push('compra', COALESCE(v_nombre, 'Jugador'), v_coins);

  RETURN jsonb_build_object('ok', true, 'honor', p_honor, 'coins', v_coins,
    'bonus', v_bonus, 'racha', v_racha,
    'total', (SELECT points FROM profiles WHERE id = v_uid),
    'restante', (SELECT disponible FROM honor_banco WHERE profile_id = v_uid));
END;
$$;

GRANT EXECUTE ON FUNCTION canjear_honor(bigint) TO authenticated;

-- ============================================================
-- 5) MARCAR BOOSTER  (la llama el bot de Discord)
-- ============================================================
CREATE OR REPLACE FUNCTION set_booster(p_discord_id text, p_activo boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  -- Se da margen de 2 dias: el bot solo mira cuando arranca y cuando cambia
  -- algo. Sin margen, tener el bot apagado una tarde le quitaria el privilegio
  -- a quien si esta pagando por el servidor.
  UPDATE profiles
     SET booster_hasta = CASE WHEN p_activo THEN now() + interval '2 days' ELSE NULL END,
         updated_at = now()
   WHERE discord_id = p_discord_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n > 0);
END;
$$;

REVOKE ALL ON FUNCTION set_booster(text, boolean) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6) EL FACTOR DE PAGO
--
-- Un solo sitio decide cuanto cobra cada quien. Si esto estuviera repetido en
-- `claim_task` y en `my_task_progress`, la barra de progreso y el pago real
-- acabarian diciendo cosas distintas, que es la peor forma de fallar: la
-- pagina promete una cifra y el boton paga otra.
-- ============================================================
CREATE OR REPLACE FUNCTION eco_factor(p_es_miembro boolean, p_booster_hasta timestamptz, p_publico text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_f numeric := 1;
BEGIN
  -- Fuera del clan se cobra menos: entrar al clan tiene que valer para algo.
  IF p_publico <> 'clan' AND NOT COALESCE(p_es_miembro, false) THEN
    v_f := eco_num('eco.factor_no_miembro', 0.45);
  END IF;
  -- Y quien mejora el servidor cobra el doble, dentro o fuera del clan.
  IF p_booster_hasta IS NOT NULL AND p_booster_hasta > now() THEN
    v_f := v_f * eco_num('eco.factor_booster', 2.0);
  END IF;
  RETURN v_f;
END;
$$;

GRANT EXECUTE ON FUNCTION eco_factor(boolean, timestamptz, text) TO authenticated;

-- ============================================================
-- 7) EL VALOR DE UNA METRICA, EN UN SOLO SITIO
--
-- `claim_task` y `my_task_progress` calculaban lo mismo por separado. Al
-- meter tres metricas nuevas eso son seis sitios que tocar y dos que se pueden
-- desincronizar. Ahora es una funcion y las dos la llaman.
-- ============================================================
CREATE OR REPLACE FUNCTION eco_metrica(p_uid uuid, p_metrica text, p_periodo text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil profiles%ROWTYPE;
  v_member jsonb;
  v_desde  date;
  v_valor  numeric := 0;
BEGIN
  SELECT * INTO v_perfil FROM profiles WHERE id = p_uid;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_desde := CASE p_periodo
               WHEN 'diaria'  THEN CURRENT_DATE
               WHEN 'semanal' THEN date_trunc('week', now())::date
               ELSE '1970-01-01'::date
             END;

  IF p_metrica = 'checkin' THEN
    RETURN 1;                                   -- entrar y pulsar YA es la tarea

  ELSIF p_metrica = 'manual' THEN
    RETURN CASE WHEN COALESCE(v_perfil.is_member, false) THEN 1 ELSE 0 END;

  ELSIF p_metrica = 'booster' THEN
    -- Tareas que se desbloquean por mejorar el servidor.
    RETURN CASE WHEN v_perfil.booster_hasta IS NOT NULL
                 AND v_perfil.booster_hasta > now() THEN 1 ELSE 0 END;

  ELSIF p_metrica IN ('discord_voz_min', 'discord_msgs') THEN
    SELECT COALESCE(SUM(CASE WHEN p_metrica = 'discord_voz_min'
                             THEN voz_minutos ELSE mensajes END), 0)
      INTO v_valor
      FROM discord_activity
      WHERE profile_id = p_uid AND dia >= v_desde;
    RETURN v_valor;

  -- ---- HONOR ----
  -- Sale del libro de honor, no de `members`: es la unica fuente que no se
  -- puede reescribir por una lectura mala del OCR.
  ELSIF p_metrica = 'honor_dia' THEN
    SELECT COALESCE(honor, 0) INTO v_valor
      FROM honor_creditos WHERE profile_id = p_uid AND dia = CURRENT_DATE;
    RETURN COALESCE(v_valor, 0);

  ELSIF p_metrica = 'honor_semana' THEN
    SELECT COALESCE(SUM(honor), 0) INTO v_valor
      FROM honor_creditos
      WHERE profile_id = p_uid AND dia >= date_trunc('week', now())::date;
    RETURN COALESCE(v_valor, 0);

  ELSIF p_metrica = 'honor_total' THEN
    SELECT COALESCE(ganado_total, 0) INTO v_valor
      FROM honor_banco WHERE profile_id = p_uid;
    RETURN COALESCE(v_valor, 0);

  ELSIF p_metrica = 'honor_racha' THEN
    SELECT CASE WHEN racha_dia IS NULL OR racha_dia < CURRENT_DATE - 1
                THEN 0 ELSE COALESCE(racha, 0) END
      INTO v_valor FROM honor_banco WHERE profile_id = p_uid;
    RETURN COALESCE(v_valor, 0);

  ELSE
    -- Stats del juego: salen de `members`, que es lo que sincroniza el bot.
    IF v_perfil.member_id IS NULL THEN RETURN 0; END IF;
    SELECT to_jsonb(m.*) INTO v_member FROM members m WHERE m.id = v_perfil.member_id;
    RETURN COALESCE((v_member ->> p_metrica)::numeric, 0);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION eco_metrica(uuid, text, text) TO authenticated;

-- ============================================================
-- 8) COBRAR UNA TAREA  (reemplaza la version anterior)
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
  v_factor numeric := 1;
  v_coins  bigint;
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

  IF v_t.publico = 'booster'
     AND (v_perfil.booster_hasta IS NULL OR v_perfil.booster_hasta <= now()) THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Solo para quien mejora el servidor de Discord.');
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

  -- Las de estadisticas necesitan cuenta vinculada; se avisa con claridad en
  -- vez de dejar la barra a cero sin explicacion.
  IF v_t.metrica NOT IN ('checkin', 'manual', 'booster', 'discord_voz_min',
                         'discord_msgs', 'honor_dia', 'honor_semana',
                         'honor_total', 'honor_racha')
     AND v_perfil.member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Vincula tu ID de Free Fire primero.');
  END IF;

  v_valor := eco_metrica(v_uid, v_t.metrica, v_t.periodo);

  IF v_valor < v_t.objetivo THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'Todavía no llegas.',
      'progreso', v_valor, 'objetivo', v_t.objetivo
    );
  END IF;

  v_factor := eco_factor(v_perfil.is_member, v_perfil.booster_hasta, v_t.publico);
  v_coins  := GREATEST(1, floor(v_t.coins * v_factor))::bigint;

  INSERT INTO task_completions (profile_id, task_id, coins, periodo_key)
    VALUES (v_uid, p_task_id, v_coins, v_key);
  INSERT INTO point_events (profile_id, type, amount) VALUES (v_uid, 'task', v_coins);
  UPDATE profiles SET points = COALESCE(points, 0) + v_coins, updated_at = now()
    WHERE id = v_uid;

  SELECT m.nickname INTO v_nick FROM members m WHERE m.id = v_perfil.member_id;

  -- La vela. Ganar coins TIENE que verse en el grafico al instante: ese es el
  -- unico motivo por el que la gente vuelve a mirarlo.
  PERFORM market_push('compra',
    COALESCE(v_nick, v_perfil.display_name, v_perfil.username, 'Jugador'),
    v_coins);

  RETURN jsonb_build_object(
    'ok', true, 'coins', v_coins, 'factor', v_factor,
    'total', (SELECT points FROM profiles WHERE id = v_uid),
    'vela', eco_tamano(v_coins)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_task(uuid) TO authenticated;

-- ============================================================
-- 9) PROGRESO DE TAREAS  (reemplaza la version anterior)
-- ============================================================
CREATE OR REPLACE FUNCTION my_task_progress()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_perfil profiles%ROWTYPE;
  v_out    jsonb := '[]'::jsonb;
  v_valor  numeric;
  v_key    text;
  r        tasks%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN v_out;
  END IF;

  SELECT * INTO v_perfil FROM profiles WHERE id = v_uid;

  FOR r IN SELECT * FROM tasks WHERE activa = true ORDER BY orden LOOP
    v_key := CASE r.periodo
               WHEN 'diaria'  THEN to_char(now(), 'YYYY-MM-DD')
               WHEN 'semanal' THEN to_char(now(), 'IYYY-"W"IW')
               ELSE 'unica'
             END;

    v_valor := eco_metrica(v_uid, r.metrica, r.periodo);

    v_out := v_out || jsonb_build_object(
      'task_id',  r.id,
      'progreso', v_valor,
      'objetivo', r.objetivo,
      -- Lo que ESTA PERSONA va a cobrar, no lo que dice la tabla. Un no
      -- miembro que ve "90" y cobra "40" se siente estafado; si ve "40"
      -- desde el principio, ve un motivo para entrar al clan.
      'coins',    GREATEST(1, floor(r.coins * eco_factor(v_perfil.is_member,
                                                         v_perfil.booster_hasta,
                                                         r.publico))),
      'cobrada',  EXISTS (
        SELECT 1 FROM task_completions
        WHERE profile_id = v_uid AND task_id = r.id AND periodo_key = v_key
      )
    );
  END LOOP;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION my_task_progress() TO authenticated;

-- ============================================================
-- 10) LAS TAREAS NUEVAS
--
-- Los hitos de honor son el motor diario. Estan escalonados para que TODOS
-- tengan uno a la vista: con la mediana del clan (30 de honor al dia) el de
-- 100 ya es un objetivo real, y el de 5.000 solo lo ve el que tiene un dia
-- historico. Ese escalonado es lo que hace que enganche: siempre falta poco
-- para el siguiente.
-- ============================================================
INSERT INTO tasks (titulo, descripcion, metrica, objetivo, coins, periodo, publico, nivel, icono, orden)
SELECT * FROM (VALUES
  -- --- honor diario ---
  ('Primer honor del día', 'Haz 100 de honor de clan hoy.',        'honor_dia',    100,      800, 'diaria', 'clan', 2, 'flame',  20),
  ('Buen día de clan',     'Haz 500 de honor de clan hoy.',        'honor_dia',    500,     2500, 'diaria', 'clan', 4, 'flame',  21),
  ('Máquina de honor',     'Haz 1.000 de honor de clan hoy.',      'honor_dia',   1000,     5000, 'diaria', 'clan', 6, 'flame',  22),
  ('Bestia del clan',      'Haz 2.500 de honor de clan hoy.',      'honor_dia',   2500,    12000, 'diaria', 'clan', 8, 'flame',  23),
  ('Día histórico',        'Haz 5.000 de honor de clan hoy.',      'honor_dia',   5000,    25000, 'diaria', 'clan',10, 'flame',  24),
  -- --- honor semanal ---
  ('Semana en marcha',     'Haz 1.000 de honor esta semana.',      'honor_semana', 1000,    6000, 'semanal','clan', 3, 'trophy', 30),
  ('Aporte serio',         'Haz 5.000 de honor esta semana.',      'honor_semana', 5000,   30000, 'semanal','clan', 6, 'trophy', 31),
  ('Pilar del clan',       'Haz 10.000 de honor esta semana.',     'honor_semana',10000,   70000, 'semanal','clan', 9, 'trophy', 32),
  ('Fuera de categoría',   'Haz 20.000 de honor esta semana.',     'honor_semana',20000,  180000, 'semanal','clan',10, 'trophy', 33),
  -- --- constancia ---
  ('Tres días seguidos',   'Haz honor 3 días seguidos.',           'honor_racha',    3,     3000, 'semanal','clan', 3, 'zap',    40),
  ('Una semana entera',    'Haz honor 7 días seguidos.',           'honor_racha',    7,    15000, 'semanal','clan', 6, 'zap',    41),
  ('Racha máxima',         'Haz honor 10 días seguidos.',          'honor_racha',   10,    40000, 'semanal','clan', 8, 'zap',    42),
  -- --- hitos historicos de honor (una sola vez) ---
  ('Honor de bronce',      'Acumula 10.000 de honor en total.',    'honor_total',  10000,  20000, 'unica',  'clan', 4, 'medal',  50),
  ('Honor de plata',       'Acumula 50.000 de honor en total.',    'honor_total',  50000, 120000, 'unica',  'clan', 7, 'medal',  51),
  ('Honor de oro',         'Acumula 200.000 de honor en total.',   'honor_total', 200000, 600000, 'unica',  'clan',10, 'medal',  52),
  -- --- boosters ---
  ('Gracias por el boost', 'Mejora el servidor de Discord.',       'booster',        1,    50000, 'unica',  'booster', 5, 'sparkles', 60),
  ('Boost del día',        'Sigue mejorando el servidor.',         'booster',        1,     1500, 'diaria', 'booster', 3, 'sparkles', 61),
  ('Boost de la semana',   'Una semana entera mejorando el server.','booster',       1,    12000, 'semanal','booster', 6, 'sparkles', 62)
) AS v(titulo, descripcion, metrica, objetivo, coins, periodo, publico, nivel, icono, orden)
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.titulo = v.titulo);

-- ============================================================
-- 11) LA TIENDA, RECALIBRADA
--
-- LA REGLA QUE NO SE PUEDE ROMPER
-- -------------------------------
-- Comprar el paquete grande tiene que rendir SIEMPRE mas diamantes por coin
-- que juntar paquetes pequenos. Con los precios anteriores no se cumplia y
-- salia a cuenta comprar tres veces el de 2.180 en vez del de 6.160: el premio
-- gordo era decorativo. Ahora la escalera es estrictamente creciente:
--
--     110 diamantes  ->  1,57 por cada 1.000 coins
--     310            ->  1,94
--     572            ->  2,20
--   1.166            ->  2,48
--   2.398            ->  2,66
--   6.160            ->  3,08
--
-- LOS PREMIOS DE FANTASIA
-- -----------------------
-- Son alcanzables de verdad, pero a un ano vista del que mas juega. Estan ahi
-- para dar techo: sin algo enorme al final, el que ya cobro los 6.160 se queda
-- sin razon para seguir.
-- ============================================================
UPDATE shop_items SET precio_coins =    70000 WHERE nombre ILIKE '%110 Diamantes%';
UPDATE shop_items SET precio_coins =   160000 WHERE nombre ILIKE '%310 Diamantes%';
UPDATE shop_items SET precio_coins =   250000 WHERE nombre ILIKE '%Pase Elite%';
UPDATE shop_items SET precio_coins =   470000 WHERE nombre ILIKE '%1.166 Diamantes%';
UPDATE shop_items SET precio_coins =   900000 WHERE nombre ILIKE '%2.398 Diamantes%';
UPDATE shop_items SET precio_coins =  2000000 WHERE nombre ILIKE '%6.160 Diamantes%';

-- El de 100 USD sube MUCHO, y no por capricho. Con la calibracion nueva el que
-- mas juega hace 114.000 coins al dia: a 5.000.000 se llevaria cien dolares en
-- mes y medio. La intencion era que los premios en dinero fueran de un ano
-- para arriba, asi que el precio se pone donde esa intencion se cumple.
UPDATE shop_items SET precio_coins = 40000000,
       descripcion = 'Cien dólares reales. El techo del clan. Casi un año de juego.'
 WHERE nombre ILIKE '%100 USD%';

INSERT INTO shop_items (nombre, descripcion, precio_coins, diamantes, valor_usd, rareza, stock, limite_dia, solo_clan, activo, orden)
SELECT * FROM (VALUES
  ('572 Diamantes',   'El escalón intermedio. Ya se nota en la tienda.',            260000::bigint,  572::integer,  4.0::numeric, 'normal',      -1, 0, false, true, 3),
  ('Premio 300 USD',  'Trescientos dólares. Nadie lo ha tocado todavía.',        120000000::bigint, NULL::integer,300.0::numeric, 'legendario',  -1, 0, false, true, 20),
  ('Cuenta Sakura',   'Una cuenta Sakura completa, a tu nombre.',                 20000000::bigint, NULL::integer,150.0::numeric, 'legendario',  -1, 0, false, true, 21),
  ('Cuenta Sakura + HipHop', 'Sakura y HipHop juntas. El premio imposible.',       50000000::bigint, NULL::integer,300.0::numeric, 'legendario', -1, 0, false, true, 22)
) AS v(nombre, descripcion, precio_coins, diamantes, valor_usd, rareza, stock, limite_dia, solo_clan, activo, orden)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.nombre = v.nombre);

-- ============================================================
-- COMPROBACION
-- ============================================================
SELECT nombre, precio_coins, diamantes,
       CASE WHEN diamantes IS NULL THEN NULL
            ELSE round(diamantes::numeric / precio_coins * 1000, 3)
       END AS diamantes_por_1000_coins
  FROM shop_items WHERE activo ORDER BY precio_coins;
