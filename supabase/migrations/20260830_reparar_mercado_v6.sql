-- ============================================================================
--  REPARAR MERCADO V6  ·  30-08-2026
--
--  QUE PASO (la version corta)
--  ---------------------------
--  Una venta manual de 2.000.000 de coins desde el panel disparo un fallo de
--  signo en market_tick() V5. En vez de bajar el precio poco a poco, lo SUBIA,
--  y ademas el impacto pendiente crecia un 15% en cada vela en lugar de
--  consumirse. Bucle exponencial: el precio llego a $2.964.226.700.
--
--  Y ahi murio todo. `market_candles.close` es numeric(18,8), o sea que no
--  admite valores de 10^10 o mas. En cuanto el precio se acerco a ese techo,
--  CADA insercion de vela reventaba con "numeric field overflow" (22003).
--  Como market_push() se llama DENTRO de discord_award() y de bet_resolve(),
--  la excepcion tumbaba la transaccion entera y el bot de Discord contestaba
--  "No pude hablar con el servidor". El bot nunca estuvo roto: era la base de
--  datos la que rechazaba cada operacion.
--
--  QUE ARREGLA ESTE FICHERO
--  ------------------------
--   1. El fallo de signo y la absorcion del impacto pendiente (la causa).
--   2. Techo duro de precio, para que ningun fallo futuro vuelva a desbordar.
--   3. Columnas mas anchas: cinturon ademas de tirantes.
--   4. house_trade() ya no deja vender coins que no se tienen (fue el gatillo).
--   5. Reinicia el mercado: borra las velas absurdas y regenera un historico
--      normal con el propio motor.
--   6. Deja a Bruce Wayne con 123.000 coins.
--
--  Se puede correr las veces que haga falta.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) CINTURON: que el desbordamiento no pueda repetirse a nivel de columna
--
--    numeric(18,8) deja 10 digitos enteros. Con (24,8) hay 16, que a un precio
--    con techo de $1 le sobran de largo; el margen esta para que un fallo
--    futuro se vea como un numero raro en el grafico y no como el bot caido.
-- ---------------------------------------------------------------------------
-- La columna del impacto pendiente la creo la V5. Se repite aqui por si este
-- fichero se corre sobre una base que nunca llego a tener la V5.
ALTER TABLE market_candles ADD COLUMN IF NOT EXISTS impacto_pendiente numeric DEFAULT 0;

ALTER TABLE market_candles
  ALTER COLUMN open  TYPE numeric(24,8),
  ALTER COLUMN high  TYPE numeric(24,8),
  ALTER COLUMN low   TYPE numeric(24,8),
  ALTER COLUMN close TYPE numeric(24,8);

ALTER TABLE market_trades
  ALTER COLUMN precio TYPE numeric(24,8);

-- ---------------------------------------------------------------------------
-- 2) TECHO DE PRECIO
--
--    El precio base es $0.0001. Un techo de $1 son diez mil veces el base:
--    espacio de sobra para años de subida sana, y aun asi a quince ordenes de
--    magnitud del desbordamiento.
-- ---------------------------------------------------------------------------
INSERT INTO settings (key, value) VALUES ('eco.mercado_precio_max', '1.0')
  ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) EL MOTOR, CON EL SIGNO ARREGLADO
--
--    El fallo estaba en estas dos lineas de la V5:
--
--        v_absorber := LEAST(v_pending * 0.15, ABS(v_pending) * 0.15);
--        ...
--        ELSIF v_pending < 0 THEN
--          v_paso    := -v_absorber;             -- <-- subia en las ventas
--          v_pending := v_pending + v_absorber;  -- <-- crecia, no se gastaba
--
--    Con v_pending negativo, LEAST elige el negativo, asi que v_absorber salia
--    negativo. Entonces `-v_absorber` era POSITIVO: una venta empujaba el
--    precio HACIA ARRIBA. Y `v_pending + v_absorber` lo hacia un 15% MAS
--    negativo en cada vela, o sea que el empujon crecia solo, para siempre.
--
--    Ahora se absorbe siempre una fraccion del valor absoluto y se resta esa
--    fraccion, que es lo que "absorber" significa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION market_tick()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min      integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 1)::integer);
  v_deriva   numeric := eco_num('eco.mercado_deriva', 0.0000572);
  v_ruido    numeric := eco_num('eco.mercado_ruido', 0.003);
  v_impacto  numeric := eco_num('eco.mercado_impacto', 0.000004);
  v_bprob    numeric := eco_num('eco.mercado_barron_prob', 0.20);
  v_bfuerza  numeric := eco_num('eco.mercado_barron_fuerza', 0.0004);
  v_base     numeric := eco_num('eco.mercado_precio_base', 0.0001);
  v_suelo    numeric := eco_num('eco.mercado_suelo', 0.82);
  v_max      numeric := eco_num('eco.mercado_precio_max', 1.0);
  v_dias     integer := GREATEST(1, eco_num('eco.mercado_dias_historia', 8)::integer);
  v_bucket   timestamptz;
  v_ultimo   timestamptz;
  v_precio   numeric;
  v_open     numeric;
  v_close    numeric;
  v_hi       numeric;
  v_lo       numeric;
  v_techo    numeric;
  v_piso     numeric;
  v_vol      bigint;
  v_paso     numeric;
  v_vendio   boolean;
  v_i        integer := 0;
  v_momentum numeric := 0;
  v_trend    numeric := 0;
  v_fair     numeric;
  v_pending  numeric := 0;
  v_absorber numeric;
  v_spike    boolean;
  v_rechazo  numeric;
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));

  -- Una sola lectura de la ultima vela. La V5 hacia dos SELECT identicos para
  -- calcular un momentum de (close - close) / close, que siempre valia cero.
  SELECT close, COALESCE(impacto_pendiente, 0), bucket
    INTO v_precio, v_pending, v_ultimo
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  IF v_ultimo IS NULL THEN
    v_precio  := v_base;
    v_pending := 0;
    v_ultimo  := v_bucket - (v_min * 1440 || ' minutes')::interval;
  END IF;

  IF v_ultimo >= v_bucket THEN
    RETURN v_precio;
  END IF;

  -- Cinturon: un pendiente heredado de la epoca del fallo podria seguir
  -- empujando. Se limita a lo que como mucho puede mover un dia de mercado.
  v_pending := GREATEST(-0.05, LEAST(0.05, COALESCE(v_pending, 0)));

  SELECT COALESCE(MAX(high), v_precio) INTO v_techo
    FROM market_candles WHERE bucket >= now() - interval '24 hours';
  v_techo := GREATEST(v_techo, v_precio);

  SELECT COALESCE(AVG(close), v_precio) INTO v_fair
    FROM (SELECT close FROM market_candles ORDER BY bucket DESC LIMIT 60) sub;

  WHILE v_ultimo < v_bucket AND v_i < 1500 LOOP
    v_ultimo := v_ultimo + (v_min || ' minutes')::interval;
    v_i := v_i + 1;

    SELECT COALESCE(SUM(amount), 0) INTO v_vol
      FROM point_events
      WHERE created_at >= v_ultimo - (v_min || ' minutes')::interval
        AND created_at <  v_ultimo
        AND amount > 0;

    v_open := v_precio;

    -- PASO 1: absorber impacto pendiente (ARREGLADO)
    --
    -- Se absorbe el 15% del TAMAÑO del pendiente, conservando su signo, y ese
    -- mismo 15% se descuenta del pendiente. Asi un trade grande se reparte en
    -- ~15 velas y se agota, que era la intencion original de la V5.
    v_absorber := ABS(v_pending) * 0.15;
    IF v_pending > 0 THEN
      v_paso    :=  v_absorber;
      v_pending := GREATEST(0, v_pending - v_absorber);
    ELSIF v_pending < 0 THEN
      v_paso    := -v_absorber;
      v_pending := LEAST(0, v_pending + v_absorber);
    ELSE
      v_paso := 0;
    END IF;

    -- PASO 2: momentum (inercia del precio)
    v_momentum := v_momentum * 0.85 + (v_paso * 0.15);
    v_momentum := GREATEST(-0.0015, LEAST(0.0015, v_momentum));
    v_paso := v_paso + v_momentum;

    -- PASO 3: deriva + ruido
    v_paso := v_paso + v_deriva + ((random() - 0.5) * v_ruido);

    -- PASO 4: el flujo de coins crea tendencia suave
    IF v_vol > 0 THEN
      v_trend := v_trend * 0.9 + (v_vol::numeric * v_impacto * 0.3);
      v_trend := GREATEST(-0.001, LEAST(0.001, v_trend));
    ELSE
      v_trend := v_trend * 0.95;
    END IF;
    v_paso := v_paso + v_trend;

    -- PASO 5: Barron (la casa) vende de vez en cuando
    v_vendio := random() < v_bprob;
    IF v_vendio THEN
      v_paso  := v_paso - (random() * v_bfuerza);
      v_trend := v_trend - (random() * 0.0002);
    END IF;

    -- PASO 6: vuelta a la media
    IF v_fair > 0 THEN
      v_paso := v_paso + ((v_fair - v_precio) / v_precio * 0.003);
    END IF;

    -- Freno de mano: ninguna vela mueve el precio mas de un 5%. Aunque una
    -- formula futura devuelva un disparate, el grafico se dobla pero no se
    -- rompe, y da tiempo a verlo antes de que tumbe el bot.
    v_paso := GREATEST(-0.05, LEAST(0.05, v_paso));

    -- PASO 7: cierre
    v_close := v_open * (1 + v_paso);

    -- PASO 8: suelo
    v_piso := GREATEST(v_techo * v_suelo, v_base * 0.5);
    IF v_close < v_piso THEN
      v_close    := v_piso * (1 + random() * 0.004);
      v_momentum := ABS(v_momentum) * 0.5;
      v_trend    := ABS(v_trend) * 0.3;
    END IF;

    -- Techo duro
    IF v_close > v_max THEN
      v_close    := v_max;
      v_pending  := 0;
      v_momentum := 0;
      v_trend    := 0;
    END IF;

    -- PASO 9: mechas de rechazo
    v_spike   := ABS(v_paso) > v_ruido * 1.5;
    v_rechazo := CASE WHEN v_spike THEN random() * v_ruido * 1.2 ELSE random() * v_ruido * 0.4 END;

    v_hi := GREATEST(v_open, v_close) * (1 + v_rechazo);
    v_lo := LEAST(v_open, v_close)  * (1 - v_rechazo * 0.7);

    IF v_fair > 0 AND ABS(v_close - v_fair) / v_fair > 0.005 THEN
      v_hi := v_hi * (1 + random() * 0.002);
      v_lo := v_lo * (1 - random() * 0.001);
    END IF;

    IF v_lo < v_piso * 0.98 THEN v_lo := v_piso * 0.98; END IF;
    IF v_hi > v_max THEN v_hi := v_max; END IF;

    -- PASO 10: guardar la vela
    INSERT INTO market_candles (bucket, open, high, low, close, volumen, impacto_pendiente)
      VALUES (v_ultimo, v_open, v_hi, v_lo, v_close, v_vol, v_pending)
      ON CONFLICT (bucket) DO NOTHING;

    IF v_vendio AND v_ultimo > now() - interval '20 minutes' THEN
      INSERT INTO market_trades (lado, actor, coins, precio, tamano)
        VALUES ('venta', eco_wallet(),
                (2000 + random() * 18000)::bigint, v_close,
                eco_tamano((2000 + random() * 18000)::bigint));
    END IF;

    v_precio := v_close;
    v_techo  := GREATEST(v_techo, v_hi);
    v_fair   := v_fair * 0.98 + v_close * 0.02;
  END LOOP;

  UPDATE market_candles SET impacto_pendiente = v_pending WHERE bucket = v_ultimo;

  DELETE FROM market_candles WHERE bucket < now() - (v_dias || ' days')::interval;
  DELETE FROM market_trades  WHERE created_at < now() - interval '1 day';

  RETURN v_precio;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) market_push() CON TECHO
--
--    Misma logica de impacto gradual que la V5, pero el precio resultante se
--    recorta contra el techo antes de escribirse. Sin esto el techo de
--    market_tick() no serviria de nada: house_trade escribe por aqui.
--
--    Se elimina antes la version de TRES argumentos. Si vuelve a existir a la
--    vez que la de cuatro, PostgreSQL no sabe cual elegir en una llamada de
--    tres y devuelve "is not unique" — que es lo que rompio el mercado la vez
--    anterior (ver reparar_mercado_y_bruce.sql).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.market_push(text, text, bigint);

CREATE OR REPLACE FUNCTION market_push(
  p_lado text,
  p_actor text,
  p_coins bigint,
  p_fuerza numeric DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min    integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 1)::integer);
  v_emp    numeric := eco_num('eco.mercado_empuje', 0.00015);
  v_tope   numeric := eco_num('eco.mercado_empuje_max', 0.005);
  v_suelo  numeric := eco_num('eco.mercado_suelo', 0.82);
  v_base   numeric := eco_num('eco.mercado_precio_base', 0.0001);
  v_max    numeric := eco_num('eco.mercado_precio_max', 1.0);
  v_bucket timestamptz;
  v_precio numeric;
  v_nuevo  numeric;
  v_techo  numeric;
  v_actor  text := p_actor;
  v_casa   text := (SELECT nombre FROM house_account WHERE id = 1);
  v_impacto_total   numeric;
  v_impacto_instant numeric;
  v_pending numeric;
BEGIN
  PERFORM market_tick();
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));
  v_precio := market_precio();

  v_impacto_total := LEAST(v_tope * p_fuerza,
                           v_emp * ln(GREATEST(p_coins, 1)::numeric + 1) * p_fuerza);

  IF p_coins <= 50000 THEN
    v_impacto_instant := v_impacto_total;
  ELSE
    v_impacto_instant := v_impacto_total * 0.30;
  END IF;

  v_nuevo := v_precio * (1 + (CASE WHEN p_lado = 'venta' THEN -1 ELSE 1 END) * v_impacto_instant);

  IF p_lado = 'venta' AND p_fuerza <= 1 THEN
    SELECT COALESCE(MAX(high), v_precio) INTO v_techo
      FROM market_candles WHERE bucket >= now() - interval '24 hours';
    v_nuevo := GREATEST(v_nuevo, v_techo * v_suelo);
  END IF;
  v_nuevo := GREATEST(v_nuevo, v_base * 0.25);
  v_nuevo := LEAST(v_nuevo, v_max);

  SELECT COALESCE(impacto_pendiente, 0) INTO v_pending
    FROM market_candles WHERE bucket = v_bucket;
  v_pending := COALESCE(v_pending, 0);

  IF p_lado = 'compra' THEN
    v_pending := v_pending + (v_impacto_total - v_impacto_instant);
  ELSE
    v_pending := v_pending - (v_impacto_total - v_impacto_instant);
  END IF;
  v_pending := GREATEST(-0.05, LEAST(0.05, v_pending));

  INSERT INTO market_candles (bucket, open, high, low, close, volumen, impacto_pendiente)
    VALUES (v_bucket, v_precio,
            LEAST(GREATEST(v_precio, v_nuevo), v_max),
            LEAST(v_precio, v_nuevo),
            v_nuevo,
            CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END,
            v_pending)
  ON CONFLICT (bucket) DO UPDATE SET
    close   = EXCLUDED.close,
    high    = LEAST(GREATEST(market_candles.high, EXCLUDED.close), v_max),
    low     = LEAST(market_candles.low, EXCLUDED.close),
    volumen = market_candles.volumen + CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END,
    impacto_pendiente = v_pending,
    updated_at = now();

  IF v_actor IS NOT DISTINCT FROM v_casa THEN
    v_actor := eco_wallet();
  END IF;

  INSERT INTO market_trades (lado, actor, coins, precio, tamano)
    VALUES (p_lado, v_actor, p_coins, v_nuevo, eco_tamano(p_coins));
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) house_trade() NO VENDE LO QUE NO HAY
--
--    Era el gatillo. `GREATEST(0, coins - p_coins)` dejaba pasar una venta de
--    2.000.000 con saldo 0: el saldo se quedaba en 0 (parecia inofensivo) pero
--    market_push recibia los 2.000.000 enteros y empujaba con esa fuerza.
--    Vender lo que no se tiene es imprimir presion de mercado de la nada.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION house_trade(p_lado text, p_coins bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol   text;
  v_saldo bigint;
BEGIN
  SELECT role INTO v_rol FROM profiles WHERE id = auth.uid();
  IF v_rol IS NULL OR v_rol NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo el owner mueve el mercado.');
  END IF;
  IF p_lado NOT IN ('compra', 'venta') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lado no válido.');
  END IF;
  IF p_coins IS NULL OR p_coins <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cantidad no válida.');
  END IF;

  SELECT coins INTO v_saldo FROM house_account WHERE id = 1 FOR UPDATE;

  IF p_lado = 'venta' AND p_coins > COALESCE(v_saldo, 0) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('No hay saldo: tienes %s coins y quieres vender %s.',
                      COALESCE(v_saldo, 0), p_coins));
  END IF;

  UPDATE house_account
     SET coins = coins + CASE WHEN p_lado = 'compra' THEN p_coins ELSE -p_coins END
   WHERE id = 1;

  PERFORM market_push(p_lado, (SELECT nombre FROM house_account WHERE id = 1), p_coins);
  RETURN jsonb_build_object('ok', true, 'precio', market_precio());
END;
$$;

GRANT EXECUTE ON FUNCTION house_trade(text, bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) REINICIAR EL GRAFICO
--
--    Las velas de $2.964.226.700 no se pueden "corregir": no representan
--    ninguna operacion real, son el resultado del bucle. Se borran y se
--    regenera el historico con el motor ya arreglado, partiendo del precio
--    base. Lo que se ve despues son velas normales, con sus mechas y sus
--    rechazos, porque las dibuja el mismo market_tick() de siempre.
--
--    Las operaciones de la cinta tambien se van: apuntaban a precios que ya no
--    existen.
-- ---------------------------------------------------------------------------
DELETE FROM market_trades;
DELETE FROM market_candles;

-- Sin ninguna vela, market_tick() arranca solo desde el precio base y rellena
-- hacia delante. No se le pone una vela ancla a mano porque el tamaño de vela
-- es configurable (`eco.mercado_minutos_vela`) y una vela desalineada con ese
-- tamaño se queda ahi para siempre, fuera de rejilla.
--
-- Dos pasadas: la primera rellena hasta las 1500 velas que admite de una vez,
-- la segunda cierra lo que falte hasta ahora mismo.
SELECT market_tick();
SELECT market_tick();

-- ---------------------------------------------------------------------------
-- 7) BRUCE WAYNE: 123.000 COINS
--
--    Bruce opera la casa (profiles.opera_casa), asi que su saldo REAL vive en
--    house_account.coins; `profiles.points` es solo el espejo que mantiene el
--    disparador casa_espejo(). Escribir en points a secas seria discutir con el
--    disparador: se escribe donde manda, y el espejo se pone al dia solo.
-- ---------------------------------------------------------------------------
UPDATE house_account SET coins = 123000 WHERE id = 1;

UPDATE profiles
   SET points = 123000, updated_at = now()
 WHERE id = '669e4a7b-30dc-42b7-92c9-728fd67c3690';

COMMIT;

-- ---------------------------------------------------------------------------
-- COMPROBACION
--
--  precio_ahora          tiene que ser un numero pequeño, del orden de 0.0001
--  vela_mas_alta         lo mismo: si sale un numero gigante, algo quedo mal
--  saldo_bruce           123000
--  versiones_market_push 1  (si sale 2, se re-corrio economia.sql: vuelve a
--                            correr este fichero)
-- ---------------------------------------------------------------------------
SELECT market_precio()                                   AS precio_ahora,
       (SELECT count(*) FROM market_candles)             AS velas,
       (SELECT max(close) FROM market_candles)           AS vela_mas_alta,
       (SELECT coins FROM house_account WHERE id = 1)    AS saldo_bruce,
       (SELECT count(*) FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'market_push') AS versiones_market_push;
