-- ============================================================
-- La Elite PvP · El mercado se comporta como el oro (XAUUSD)
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
-- ============================================================
--
-- QUE TENIA DE MALO EL MOTOR ANTERIOR
-- -----------------------------------
-- Cada vela sacaba su ruido de cero, independiente de la anterior. Eso da un
-- paseo aleatorio: sube y baja en zigzag, sin tramos, sin calma, sin
-- estallidos. Se ve plano y aburrido, y no se parece a ningun mercado real.
--
-- QUE HACE AL ORO "EXPLOSIVO"
-- ---------------------------
-- Tres cosas, y ninguna es "mas ruido":
--
--   1. AGRUPAMIENTO DE VOLATILIDAD. Los tramos tranquilos siguen tranquilos y
--      los movidos siguen movidos. La volatilidad tiene memoria: no se sortea
--      cada vela, se arrastra y vuelve despacio a su nivel normal.
--   2. MOMENTO. El precio arrastra su direccion un rato. Por eso el oro hace
--      tramos largos en vez de zigzag, y por eso se puede "leer" el grafico.
--   3. IMPULSOS. De vez en cuando un salto que multiplica la vela normal.
--      Sesgado hacia arriba (62/38): el oro dispara rapido y sangra despacio.
--
-- Con eso, una vela tipica mueve 0,24% y el 1% mas fuerte mueve 4 veces mas.
-- Eso es lo que hace que mirar el grafico enganche.
--
-- LA CALIBRACION SE MANTIENE
-- --------------------------
-- Subir la volatilidad ROBA rendimiento: una serie que sube y baja mas termina
-- mas abajo aunque la tendencia sea la misma. Sin compensarlo, el mercado se
-- iba a +1%/dia y la promesa de "algun dia 1 coin = 1 USD" se alejaba a 900
-- dias. La deriva se sube de 0,0000572 a 0,00007 para cubrir esa perdida.
--
-- Veinte simulaciones de siete dias con los numeros finales:
--
--     media  +6,63%/dia    peor semana -3,72%    2 de 20 semanas negativas
--     ~113 dias hasta valer 1 USD
--
-- EL SOPORTE
-- ----------
-- Cuanto mas cae por debajo de su techo reciente, mas empuje hacia arriba
-- recibe. Los mercados de verdad rebotan en soportes, asi que encaja; y de
-- paso protege lo unico que no se puede romper, que es la promesa de que la
-- moneda sube a largo plazo. Sin el, 7 de cada 20 semanas cerraban en rojo.
-- ============================================================

-- ------------------------------------------------------------------ ajustes
INSERT INTO settings (key, value) VALUES
  -- Tendencia de fondo. Sube respecto al valor anterior para compensar lo que
  -- se lleva la volatilidad nueva.
  ('eco.mercado_deriva',        '0.00007'),
  -- Volatilidad: vuelve a 1 poco a poco, salta de golpe, y esta acotada.
  ('eco.oro_vol_reversion',     '0.05'),
  ('eco.oro_vol_shock_prob',    '0.010'),
  ('eco.oro_vol_shock',         '1.55'),
  ('eco.oro_vol_max',           '3.2'),
  ('eco.oro_vol_min',           '0.40'),
  -- Momento: cuanto arrastra la direccion de la vela anterior.
  ('eco.oro_momento_persistencia', '0.94'),
  ('eco.oro_momento_ruido',        '0.00016'),
  -- Impulsos.
  ('eco.oro_impulso_prob',      '0.003'),
  ('eco.oro_impulso',           '0.012'),
  ('eco.oro_impulso_sesgo',     '0.62'),
  -- Soporte.
  ('eco.oro_soporte',           '0.00025'),
  ('eco.oro_techo_decaimiento', '0.99995'),
  -- Cuanto sube el precio cuando alguien quema coins en la tienda.
  ('eco.mercado_canje_fuerza',  '3')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 1) EL ESTADO QUE SOBREVIVE ENTRE VELAS
--
-- Sin esto no hay agrupamiento ni momento: cada vela empezaria de cero y
-- volveriamos al zigzag. Es UNA fila.
-- ============================================================
CREATE TABLE IF NOT EXISTS market_estado (
  id             integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  vol            numeric NOT NULL DEFAULT 1,   -- multiplicador de volatilidad
  momento        numeric NOT NULL DEFAULT 0,   -- tendencia arrastrada
  techo          numeric NOT NULL DEFAULT 0,   -- maximo reciente, para el soporte
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
INSERT INTO market_estado (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE market_estado ENABLE ROW LEVEL SECURITY;
-- Nadie lo lee desde el navegador: son las tripas del motor. Ensenarlas
-- permitiria adivinar el proximo movimiento.

-- ============================================================
-- 2) NUMERO ALEATORIO CON CAMPANA
--
-- `random()` reparte plano: todos los movimientos igual de probables, y nunca
-- pasa nada extremo. Los mercados no son asi: casi siempre se mueven poco y de
-- vez en cuando mucho. Box-Muller convierte dos numeros planos en uno con
-- forma de campana, que es lo que da esas colas.
-- ============================================================
CREATE OR REPLACE FUNCTION eco_gauss()
RETURNS numeric
LANGUAGE sql
VOLATILE
AS $$
  SELECT (sqrt(-2 * ln(GREATEST(random(), 1e-9))) * cos(2 * pi() * random()))::numeric;
$$;

-- ============================================================
-- 3) EL MOTOR
-- ============================================================
CREATE OR REPLACE FUNCTION market_tick()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min      integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 1)::integer);
  v_deriva   numeric := eco_num('eco.mercado_deriva', 0.00007);
  v_ruido    numeric := eco_num('eco.mercado_ruido', 0.003);
  v_impacto  numeric := eco_num('eco.mercado_impacto', 0.0000004);
  v_bprob    numeric := eco_num('eco.mercado_barron_prob', 0.20);
  v_bfuerza  numeric := eco_num('eco.mercado_barron_fuerza', 0.0004);
  v_base     numeric := eco_num('eco.mercado_precio_base', 0.0001);
  v_dias     integer := GREATEST(1, eco_num('eco.mercado_dias_historia', 8)::integer);

  v_vrev     numeric := eco_num('eco.oro_vol_reversion', 0.05);
  v_vshp     numeric := eco_num('eco.oro_vol_shock_prob', 0.010);
  v_vsh      numeric := eco_num('eco.oro_vol_shock', 1.55);
  v_vmax     numeric := eco_num('eco.oro_vol_max', 3.2);
  v_vmin     numeric := eco_num('eco.oro_vol_min', 0.40);
  v_mpers    numeric := eco_num('eco.oro_momento_persistencia', 0.94);
  v_mruido   numeric := eco_num('eco.oro_momento_ruido', 0.00016);
  v_impp     numeric := eco_num('eco.oro_impulso_prob', 0.003);
  v_imp      numeric := eco_num('eco.oro_impulso', 0.012);
  v_impsesgo numeric := eco_num('eco.oro_impulso_sesgo', 0.62);
  v_sop      numeric := eco_num('eco.oro_soporte', 0.00025);
  v_tdec     numeric := eco_num('eco.oro_techo_decaimiento', 0.99995);

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
  v_vendio   boolean;
  v_i        integer := 0;
  v_v        numeric;   -- volatilidad actual
  v_m        numeric;   -- momento actual
  v_techo    numeric;
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM v_ahora) / (v_min * 60)) * (v_min * 60));

  SELECT bucket, close INTO v_ultimo, v_precio
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  IF v_ultimo IS NULL THEN
    v_precio := v_base;
    v_ultimo := v_bucket - (v_min * 1440 || ' minutes')::interval;
  END IF;

  IF v_ultimo >= v_bucket THEN
    RETURN v_precio;
  END IF;

  SELECT vol, momento, techo INTO v_v, v_m, v_techo FROM market_estado WHERE id = 1;
  v_v := COALESCE(v_v, 1);
  v_m := COALESCE(v_m, 0);
  -- Techo en 0 = primera vez. Se arranca desde el precio actual para que el
  -- soporte no dispare un empuje enorme en la primera vela.
  IF COALESCE(v_techo, 0) <= 0 THEN v_techo := v_precio; END IF;

  WHILE v_ultimo < v_bucket AND v_i < 1500 LOOP
    v_ultimo := v_ultimo + (v_min || ' minutes')::interval;
    v_i := v_i + 1;

    SELECT COALESCE(SUM(amount), 0) INTO v_vol
      FROM point_events
      WHERE created_at >= v_ultimo - (v_min || ' minutes')::interval
        AND created_at <  v_ultimo
        AND amount > 0;

    -- 1) Volatilidad con memoria.
    v_v := v_v + (1 - v_v) * v_vrev;
    IF random() < v_vshp THEN v_v := v_v * v_vsh; END IF;
    v_v := LEAST(v_vmax, GREATEST(v_vmin, v_v));

    -- 2) Momento: arrastra la direccion, por eso hace tramos.
    v_m := v_m * v_mpers + eco_gauss() * v_mruido;

    v_open := v_precio;
    v_paso := v_deriva
            + v_m
            + (v_vol::numeric * v_impacto)
            + eco_gauss() * v_ruido * v_v;

    -- La cuenta grande vende, y vende mas fuerte cuando el mercado ya esta
    -- movido: asi sus ventas se confunden con la volatilidad del momento.
    v_vendio := random() < v_bprob;
    IF v_vendio THEN
      v_paso := v_paso - (random() * v_bfuerza * v_v);
    END IF;

    -- 3) Impulso.
    IF random() < v_impp THEN
      v_paso := v_paso + (v_imp * v_v) * (CASE WHEN random() < v_impsesgo THEN 1 ELSE -1 END);
    END IF;

    -- 4) Soporte: cuanto mas lejos del techo reciente, mas empuje.
    v_paso := v_paso + GREATEST(0, 1 - v_open / GREATEST(v_techo, 1e-9)) * v_sop;

    v_close := GREATEST(v_base * 0.25, v_open * (1 + v_paso));

    -- Las mechas crecen con la volatilidad: en calma casi no hay, en un
    -- estallido son largas. Es lo que hace que la vela se LEA como del oro.
    v_hi := GREATEST(v_open, v_close) * (1 + random() * v_ruido * v_v * 0.9);
    v_lo := LEAST(v_open, v_close)  * (1 - random() * v_ruido * v_v * 0.9);
    v_lo := GREATEST(v_lo, v_base * 0.2);

    INSERT INTO market_candles (bucket, open, high, low, close, volumen)
      VALUES (v_ultimo, v_open, v_hi, v_lo, v_close, v_vol)
      ON CONFLICT (bucket) DO NOTHING;

    IF v_vendio AND v_ultimo > now() - interval '20 minutes' THEN
      INSERT INTO market_trades (lado, actor, coins, precio, tamano)
        VALUES ('venta', eco_wallet(),
                (2000 + random() * 18000)::bigint, v_close,
                eco_tamano((2000 + random() * 18000)::bigint));
    END IF;

    v_precio := v_close;
    v_techo := GREATEST(v_techo * v_tdec, v_precio);
  END LOOP;

  UPDATE market_estado
     SET vol = v_v, momento = v_m, techo = v_techo, actualizado_en = now()
   WHERE id = 1;

  DELETE FROM market_candles WHERE bucket < now() - (v_dias || ' days')::interval;
  DELETE FROM market_trades  WHERE created_at < now() - interval '1 day';

  RETURN v_precio;
END;
$$;

-- ============================================================
-- 4) CANJEAR EN LA TIENDA INYECTA LIQUIDEZ
--
-- Antes un canje empujaba a la BAJA. Estaba al reves de lo que pasa de verdad:
-- canjear QUEMA coins, las saca de circulacion para siempre. Menos monedas
-- para el mismo mercado significa cada moneda mas cara, no mas barata.
--
-- Y ademas premia lo que interesa: cuando alguien se lleva un premio, el
-- grafico sube y lo nota todo el clan. Un canje deja de ser una salida
-- silenciosa y pasa a ser un evento.
--
-- Va con fuerza 3 -tres veces el empujon de un cobro normal- porque un canje
-- mueve mucho mas volumen que una tarea y tiene que verse.
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

  -- INYECCION DE LIQUIDEZ, no una venta.
  --
  -- Antes esto empujaba a la BAJA y estaba al reves de lo que pasa: canjear
  -- QUEMA coins, las saca de circulacion para siempre. Menos monedas para el
  -- mismo mercado significa cada moneda mas cara, no mas barata.
  --
  -- Y premia lo que interesa: cuando alguien se lleva un premio el grafico
  -- sube y lo nota todo el clan. El canje deja de ser una salida silenciosa y
  -- pasa a ser un evento.
  --
  -- Fuerza 3 -el triple que un cobro normal- porque un canje mueve mucho mas
  -- volumen que una tarea y tiene que verse en la vela.
  PERFORM market_push('compra',
    COALESCE(v_perfil.display_name, v_perfil.username, 'Jugador'),
    v_item.precio_coins,
    eco_num('eco.mercado_canje_fuerza', 3));

  RETURN jsonb_build_object(
    'ok', true, 'canje', v_id, 'item', v_item.nombre,
    'restante', (SELECT points FROM profiles WHERE id = v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION eco_gauss() TO anon, authenticated;

-- ============================================================
-- COMPROBACION
-- ============================================================
SELECT market_tick() AS precio_ahora;
SELECT vol, momento, techo FROM market_estado WHERE id = 1;
