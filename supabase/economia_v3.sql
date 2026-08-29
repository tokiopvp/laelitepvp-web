-- ============================================================
-- La Elite PvP · Economía v3
-- Ejecutar DESPUES de economia.sql y economia_v2.sql, una sola vez.
-- Idempotente.
-- ============================================================

-- ============================================================
-- 1) LA CUENTA GRANDE DEJA DE PARECER "LA CASA"
--
-- Se llamaba "Barron Trump" y salia etiquetada como "Cuenta de la casa": eso
-- delataba que el top 1 y quien mueve el mercado son la misma mano. Ahora es
-- un usuario mas de la comunidad. Quien mira el ranking ve a alguien que va
-- muy por delante, no al dueño.
-- ============================================================
UPDATE house_account
   SET nombre = 'Bruce Wayne',
       coins  = 1200000
 WHERE id = 1;

-- ============================================================
-- 2) VELAS DE UN MINUTO
--
-- Para que existan marcos de 5, 15 y 30 minutos hace falta que la vela base
-- sea de un minuto: con velas de cinco, "5 MIN" seria UNA sola vela. Los
-- marcos largos se agregan sobre la marcha en `market_series`, mas abajo.
-- ============================================================
UPDATE settings SET value = '1' WHERE key = 'eco.mercado_minutos_vela';

-- Con velas doce veces mas frecuentes, cada una debe mover doce veces menos:
-- si no, la deriva diaria se multiplicaria por doce y el precio se dispararia.
UPDATE settings SET value = '0.0001' WHERE key = 'eco.mercado_deriva'  AND value = '0.0012';
UPDATE settings SET value = '0.004'  WHERE key = 'eco.mercado_ruido'   AND value = '0.010';

-- Retencion: un minuto por vela son 1.440 al dia. Ocho dias caben de sobra y
-- es justo lo que necesita el marco "SEMANA".
INSERT INTO settings (key, value) VALUES ('eco.mercado_dias_historia', '8')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3) LAS OPERACIONES DE LA CASA NO SE FIRMAN
--
-- En la cinta de "ultimas operaciones" aparecia "Bruce Wayne" cada vez que la
-- casa vendia. Con eso, cualquiera ata cabos en dos minutos: el top 1 es quien
-- mueve el precio. Ahora esas operaciones salen a nombre de una billetera
-- anonima distinta cada vez, como en cualquier mercado real donde las ordenes
-- grandes vienen de direcciones sin nombre.
-- ============================================================

/** Billetera falsa con pinta de direccion: 0x9f4c…21ab */
CREATE OR REPLACE FUNCTION eco_wallet()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT '0x' || substr(md5(random()::text), 1, 4) || '…' || substr(md5(random()::text), 1, 4);
$$;

-- `market_push` con enmascarado de la casa.
CREATE OR REPLACE FUNCTION market_push(p_lado text, p_actor text, p_coins bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min    integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 1)::integer);
  v_imp    numeric := eco_num('eco.mercado_impacto', 0.000004);
  v_bucket timestamptz;
  v_precio numeric;
  v_nuevo  numeric;
  v_actor  text := p_actor;
  v_casa   text := (SELECT nombre FROM house_account WHERE id = 1);
BEGIN
  PERFORM market_tick();
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));
  v_precio := market_precio();

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

  -- Aqui esta el enmascarado: la casa nunca firma con su nombre.
  IF v_actor IS NOT DISTINCT FROM v_casa THEN
    v_actor := eco_wallet();
  END IF;

  INSERT INTO market_trades (lado, actor, coins, precio, tamano)
    VALUES (p_lado, v_actor, p_coins, v_nuevo, eco_tamano(p_coins));
END;
$$;

-- Las operaciones que ya estaban firmadas con el nombre viejo se reescriben.
UPDATE market_trades
   SET actor = eco_wallet()
 WHERE actor IN ('Barron Trump', 'Bruce Wayne');

-- ============================================================
-- 4) VENTAS AUTOMATICAS TAMBIEN EN LA CINTA
--
-- `market_tick` movia el precio sin dejar rastro visible: el grafico bajaba y
-- en la cinta no habia nada que lo explicara. Ahora las ventas automaticas de
-- la casa aparecen como billeteras anonimas, que es lo que hace que el mercado
-- parezca vivo y no una animacion.
-- ============================================================
CREATE OR REPLACE FUNCTION market_tick()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min      integer := GREATEST(1, eco_num('eco.mercado_minutos_vela', 1)::integer);
  v_deriva   numeric := eco_num('eco.mercado_deriva', 0.0001);
  v_ruido    numeric := eco_num('eco.mercado_ruido', 0.004);
  v_impacto  numeric := eco_num('eco.mercado_impacto', 0.000004);
  v_bprob    numeric := eco_num('eco.mercado_barron_prob', 0.35);
  v_bfuerza  numeric := eco_num('eco.mercado_barron_fuerza', 0.006);
  v_base     numeric := eco_num('eco.mercado_precio_base', 0.0001);
  v_dias     integer := GREATEST(1, eco_num('eco.mercado_dias_historia', 8)::integer);
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
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM v_ahora) / (v_min * 60)) * (v_min * 60));

  SELECT bucket, close INTO v_ultimo, v_precio
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  IF v_ultimo IS NULL THEN
    v_precio := v_base;
    -- Se siembra un dia hacia atras para que el grafico abra con historia.
    v_ultimo := v_bucket - (v_min * 1440 || ' minutes')::interval;
  END IF;

  IF v_ultimo >= v_bucket THEN
    RETURN v_precio;
  END IF;

  -- Tope alto: con velas de un minuto, 1.500 pasos cubren 25 horas de parada.
  WHILE v_ultimo < v_bucket AND v_i < 1500 LOOP
    v_ultimo := v_ultimo + (v_min || ' minutes')::interval;
    v_i := v_i + 1;

    SELECT COALESCE(SUM(amount), 0) INTO v_vol
      FROM point_events
      WHERE created_at >= v_ultimo - (v_min || ' minutes')::interval
        AND created_at <  v_ultimo
        AND amount > 0;

    v_open := v_precio;
    v_paso := v_deriva
            + (v_vol::numeric * v_impacto)
            + ((random() - 0.45) * v_ruido);

    v_vendio := random() < v_bprob;
    IF v_vendio THEN
      v_paso := v_paso - (random() * v_bfuerza);
    END IF;

    v_close := GREATEST(v_base * 0.25, v_open * (1 + v_paso));
    v_hi := GREATEST(v_open, v_close) * (1 + random() * v_ruido * 0.6);
    v_lo := LEAST(v_open, v_close)  * (1 - random() * v_ruido * 0.6);

    INSERT INTO market_candles (bucket, open, high, low, close, volumen)
      VALUES (v_ultimo, v_open, v_hi, v_lo, v_close, v_vol)
      ON CONFLICT (bucket) DO NOTHING;

    -- Solo se deja rastro de las ventas RECIENTES: rellenar la cinta con horas
    -- de historia la volveria ilegible y no aporta nada.
    IF v_vendio AND v_ultimo > now() - interval '20 minutes' THEN
      INSERT INTO market_trades (lado, actor, coins, precio, tamano)
        VALUES ('venta', eco_wallet(),
                (2000 + random() * 18000)::bigint, v_close,
                eco_tamano((2000 + random() * 18000)::bigint));
    END IF;

    v_precio := v_close;
  END LOOP;

  DELETE FROM market_candles WHERE bucket < now() - (v_dias || ' days')::interval;
  DELETE FROM market_trades  WHERE created_at < now() - interval '1 day';

  RETURN v_precio;
END;
$$;

-- ============================================================
-- 5) SERIE DEL GRAFICO, AGREGADA EN EL SERVIDOR
--
-- El marco "SEMANA" son 10.080 velas de un minuto. Mandarlas al navegador de
-- alguien con datos moviles para pintar 120 columnas es tirar megabytes. Aqui
-- se agrupan a ~120 puntos ANTES de salir: cada marco pesa lo mismo, y el
-- telefono solo dibuja.
-- ============================================================
CREATE OR REPLACE FUNCTION market_series(p_minutos integer, p_puntos integer DEFAULT 120)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desde timestamptz;
  v_seg   numeric;
  v_out   jsonb;
BEGIN
  -- p_minutos <= 0 significa MAX: todo lo que haya.
  IF p_minutos IS NULL OR p_minutos <= 0 THEN
    SELECT MIN(bucket) INTO v_desde FROM market_candles;
    v_desde := COALESCE(v_desde, now() - interval '1 day');
  ELSE
    v_desde := now() - (p_minutos || ' minutes')::interval;
  END IF;

  p_puntos := LEAST(GREATEST(COALESCE(p_puntos, 120), 10), 400);
  v_seg := GREATEST(60, EXTRACT(epoch FROM (now() - v_desde)) / p_puntos);

  -- Se reconstruye la vela del grupo: apertura de la primera, cierre de la
  -- ultima, maximo y minimo del conjunto. Tomar solo el cierre borraria las
  -- mechas y el grafico perderia todo el relieve.
  WITH agrupado AS (
    SELECT to_timestamp(floor(extract(epoch FROM bucket) / v_seg) * v_seg) AS g,
           bucket, open, high, low, close, volumen
      FROM market_candles
     WHERE bucket >= v_desde
  )
  SELECT COALESCE(jsonb_agg(f ORDER BY f.bucket), '[]'::jsonb) INTO v_out
    FROM (
      SELECT g AS bucket,
             (array_agg(open  ORDER BY bucket ASC ))[1] AS open,
             MAX(high) AS high,
             MIN(low)  AS low,
             (array_agg(close ORDER BY bucket DESC))[1] AS close,
             SUM(volumen) AS volumen
        FROM agrupado
       GROUP BY g
    ) f;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION market_series(integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION eco_wallet() TO anon, authenticated;

-- Se regenera el historial con la nueva cadencia de un minuto.
DELETE FROM market_candles;
SELECT market_tick();

SELECT nombre, coins FROM house_account;
SELECT count(*) AS velas_generadas FROM market_candles;
