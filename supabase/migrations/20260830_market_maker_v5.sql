-- ############################################################
-- ##  NO CORRER ESTE FICHERO. SUSTITUIDO POR:
-- ##      20260830_reparar_mercado_v6.sql
-- ##
-- ##  Esta version tiene un fallo de signo en el PASO 1 de
-- ##  market_tick(): con impacto pendiente NEGATIVO (una venta),
-- ##  empujaba el precio HACIA ARRIBA y hacia crecer el pendiente
-- ##  un 15% por vela en vez de gastarlo. Una venta de 2.000.000
-- ##  de coins llevo el precio a 2.964 millones de dolares,
-- ##  desbordo numeric(18,8) y tumbo el bot de Discord.
-- ##
-- ##  Se deja aqui solo como historia de lo que paso.
-- ############################################################

-- ============================================================
-- MARKET MAKER V5 - COMPORTAMIENTO REALISTA
-- ============================================================
-- Problema anterior: un trade de 2M coins creaba UNA vela gigante.
-- Solucion: el impacto grande se ABSORBE gradualmente en varias velas,
-- como un market maker real. El precio oscila, tiene momentum,
-- tendencias y rechazos.
-- ============================================================

-- Columna nueva: impacto pendiente por absorber
ALTER TABLE market_candles ADD COLUMN IF NOT EXISTS impacto_pendiente numeric DEFAULT 0;

-- ============================================================
-- market_tick() V5 - MOTOR CON MOMENTUM Y TENDENCIA
-- ============================================================
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
  -- Market maker: momentum y tendencia
  v_momentum numeric := 0;   -- Persiste entre velas: inertia del precio
  v_trend    numeric := 0;   -- Tendencia acumulada del flujo de coins
  v_fair     numeric;        -- Precio justo (media móvil)
  v_pending  numeric := 0;   -- Impacto pendiente de absorber
  v_absorber numeric;        -- Cuánto se absorbe en esta vela
  v_spike    boolean;        -- Si hubo movimiento extremo
  v_rechazo  numeric;        -- Magnitud del rechazo
  v_last_close numeric;      -- Close de la vela anterior para momentum
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));

  SELECT bucket, close INTO v_ultimo, v_precio
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  -- Leer momentum y pending de la última vela
  SELECT close, COALESCE(impacto_pendiente, 0) INTO v_last_close, v_pending
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  IF v_ultimo IS NULL THEN
    v_precio := v_base;
    v_ultimo := v_bucket - (v_min * 1440 || ' minutes')::interval;
    v_last_close := v_base;
  END IF;

  IF v_ultimo >= v_bucket THEN
    RETURN v_precio;
  END IF;

  -- Techo del último día
  SELECT COALESCE(MAX(high), v_precio) INTO v_techo
    FROM market_candles WHERE bucket >= now() - interval '24 hours';
  v_techo := GREATEST(v_techo, v_precio);

  -- Precio justo: media móvil de 60 velas (1 hora)
  SELECT COALESCE(AVG(close), v_precio) INTO v_fair
    FROM (
      SELECT close FROM market_candles ORDER BY bucket DESC LIMIT 60
    ) sub;

  -- Inicializar momentum desde la última vela conocida
  IF v_last_close > 0 AND v_precio > 0 THEN
    v_momentum := (v_last_close - v_precio) / v_precio;
    v_momentum := GREATEST(-0.002, LEAST(0.002, v_momentum)); -- Cap
  END IF;

  WHILE v_ultimo < v_bucket AND v_i < 1500 LOOP
    v_ultimo := v_ultimo + (v_min || ' minutes')::interval;
    v_i := v_i + 1;

    -- Volume del intervalo (coins ganados por la comunidad)
    SELECT COALESCE(SUM(amount), 0) INTO v_vol
      FROM point_events
      WHERE created_at >= v_ultimo - (v_min || ' minutes')::interval
        AND created_at <  v_ultimo
        AND amount > 0;

    v_open := v_precio;

    -- =============================================
    -- PASO 1: Absorber impacto pendiente primero
    -- =============================================
    -- Si hay impacto pendiente de trades grandes, se absorbe gradualmente.
    -- Máximo 15% del pending por vela para que dure varios ticks.
    v_absorber := LEAST(v_pending * 0.15, ABS(v_pending) * 0.15);
    IF v_pending > 0 THEN
      -- Impacto alcista pendiente
      v_paso := v_absorber;
      v_pending := v_pending - v_absorber;
    ELSIF v_pending < 0 THEN
      -- Impacto bajista pendiente
      v_paso := -v_absorber;
      v_pending := v_pending + v_absorber;
    ELSE
      v_paso := 0;
    END IF;

    -- =============================================
    -- PASO 2: Momentum (inercia del precio)
    -- =============================================
    -- El precio tiene memoria: si subía, tiende a seguir subiendo un poco.
    -- Se actualiza suavemente con cada vela.
    v_momentum := v_momentum * 0.85 + (v_paso * 0.15);
    v_momentum := GREATEST(-0.0015, LEAST(0.0015, v_momentum));
    v_paso := v_paso + v_momentum;

    -- =============================================
    -- PASO 3: Deriva + ruido normal
    -- =============================================
    v_paso := v_paso + v_deriva + ((random() - 0.5) * v_ruido);

    -- =============================================
    -- PASO 4: Flujo de coins crea tendencia suave
    -- =============================================
    -- El volume de la comunidad empuja el precio en dirección suave.
    -- No es un golpe, es una presión constante.
    IF v_vol > 0 THEN
      v_trend := v_trend * 0.9 + (v_vol::numeric * v_impacto * 0.3);
      v_trend := GREATEST(-0.001, LEAST(0.001, v_trend));
    ELSE
      v_trend := v_trend * 0.95; -- La tendencia se disipa
    END IF;
    v_paso := v_paso + v_trend;

    -- =============================================
    -- PASO 5: Barron (house) vende aleatoriamente
    -- =============================================
    v_vendio := random() < v_bprob;
    IF v_vendio THEN
      v_paso := v_paso - (random() * v_bfuerza);
      -- Barron también crea tendencia bajista temporal
      v_trend := v_trend - (random() * 0.0002);
    END IF;

    -- =============================================
    -- PASO 6: Mean reversion - el precio no se aleja mucho del fair
    -- =============================================
    IF v_fair > 0 THEN
      v_paso := v_paso + ((v_fair - v_precio) / v_precio * 0.003);
    END IF;

    -- =============================================
    -- PASO 7: Calcular close
    -- =============================================
    v_close := v_open * (1 + v_paso);

    -- =============================================
    -- PASO 8: Suelo - no caer más de un % del techo
    -- =============================================
    v_piso := GREATEST(v_techo * v_suelo, v_base * 0.5);
    IF v_close < v_piso THEN
      v_close := v_piso * (1 + random() * 0.004);
      v_momentum := ABS(v_momentum) * 0.5; -- Rebote: momentum se invierte
      v_trend := ABS(v_trend) * 0.3;
    END IF;

    -- =============================================
    -- PASO 9: Wicks realistas (mechas de rechazo)
    -- =============================================
    -- El ruido de las mechas es proporcional a la volatilidad
    v_spike := ABS(v_paso) > v_ruido * 1.5;
    v_rechazo := CASE WHEN v_spike THEN random() * v_ruido * 1.2 ELSE random() * v_ruido * 0.4 END;

    v_hi := GREATEST(v_open, v_close) * (1 + v_rechazo);
    v_lo := LEAST(v_open, v_close)  * (1 - v_rechazo * 0.7); -- Mecha baja más corta (realismo)

    -- Rechazo en extremos: si el precio está muy lejos del fair, la mecha es más larga
    IF v_fair > 0 AND ABS(v_close - v_fair) / v_fair > 0.005 THEN
      v_hi := v_hi * (1 + random() * 0.002);
      v_lo := v_lo * (1 - random() * 0.001);
    END IF;

    IF v_lo < v_piso * 0.98 THEN v_lo := v_piso * 0.98; END IF;

    -- =============================================
    -- PASO 10: Insertar vela
    -- =============================================
    INSERT INTO market_candles (bucket, open, high, low, close, volumen, impacto_pendiente)
      VALUES (v_ultimo, v_open, v_hi, v_lo, v_close, v_vol, v_pending)
      ON CONFLICT (bucket) DO NOTHING;

    -- Trade de Barron (house sell)
    IF v_vendio AND v_ultimo > now() - interval '20 minutes' THEN
      INSERT INTO market_trades (lado, actor, coins, precio, tamano)
        VALUES ('venta', eco_wallet(),
                (2000 + random() * 18000)::bigint, v_close,
                eco_tamano((2000 + random() * 18000)::bigint));
    END IF;

    v_precio := v_close;
    v_techo := GREATEST(v_techo, v_hi);
    -- Actualizar fair price
    v_fair := v_fair * 0.98 + v_close * 0.02;
  END LOOP;

  -- Guardar momentum y pending para la próxima llamada
  UPDATE market_candles SET impacto_pendiente = v_pending
    WHERE bucket = v_ultimo;

  DELETE FROM market_candles WHERE bucket < now() - (v_dias || ' days')::interval;
  DELETE FROM market_trades  WHERE created_at < now() - interval '1 day';

  RETURN v_precio;
END;
$$;

-- ============================================================
-- market_push() V5 - IMPACTO GRADUAL
-- ============================================================
-- Trades grandes NO mueven el precio de golpe. Se acumulan como
-- impacto pendiente que se absorbe en las próximas velas.
-- ============================================================
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
  v_bucket timestamptz;
  v_precio numeric;
  v_nuevo  numeric;
  v_mov    numeric;
  v_techo  numeric;
  v_actor  text := p_actor;
  v_casa   text := (SELECT nombre FROM house_account WHERE id = 1);
  -- Market maker: impacto gradual
  v_impacto_total numeric;
  v_impacto_instant numeric;
  v_pending numeric;
BEGIN
  PERFORM market_tick();
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));
  v_precio := market_precio();

  -- =============================================
  -- IMPACTO GRADUAL: trades pequeños son instantáneos,
  -- trades grandes se absorben gradualmente.
  -- =============================================
  -- Umbral: por encima de 50K coins, el impacto se reparte.
  v_impacto_total := LEAST(v_tope * p_fuerza, v_emp * ln(GREATEST(p_coins, 1)::numeric + 1) * p_fuerza);

  IF p_coins <= 50000 THEN
    -- Trade pequeño: impacto instantáneo (100%)
    v_impacto_instant := v_impacto_total;
  ELSE
    -- Trade grande: 30% instant + 70% pendiente
    v_impacto_instant := v_impacto_total * 0.30;
  END IF;

  -- Precio con impacto instantáneo
  v_nuevo := v_precio * (1 + (CASE WHEN p_lado = 'venta' THEN -1 ELSE 1 END) * v_impacto_instant);

  -- Suelo para ventas automáticas
  IF p_lado = 'venta' AND p_fuerza <= 1 THEN
    SELECT COALESCE(MAX(high), v_precio) INTO v_techo
      FROM market_candles WHERE bucket >= now() - interval '24 hours';
    v_nuevo := GREATEST(v_nuevo, v_techo * v_suelo);
  END IF;
  v_nuevo := GREATEST(v_nuevo, v_base * 0.25);

  -- =============================================
  -- ACTUALIZAR VELA: agregar impacto pendiente
  -- =============================================
  SELECT COALESCE(impacto_pendiente, 0) INTO v_pending
    FROM market_candles WHERE bucket = v_bucket;

  IF p_lado = 'compra' THEN
    v_pending := v_pending + (v_impacto_total - v_impacto_instant);
  ELSE
    v_pending := v_pending - (v_impacto_total - v_impacto_instant);
  END IF;

  INSERT INTO market_candles (bucket, open, high, low, close, volumen, impacto_pendiente)
    VALUES (v_bucket, v_precio, GREATEST(v_precio, v_nuevo), LEAST(v_precio, v_nuevo), v_nuevo,
            CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END,
            v_pending)
  ON CONFLICT (bucket) DO UPDATE SET
    close   = EXCLUDED.close,
    high    = GREATEST(market_candles.high, EXCLUDED.close),
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
