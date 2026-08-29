-- ============================================================
-- La Elite PvP · Precios por país + mercado que sube de verdad
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) PRECIOS FIJOS POR PAIS
--
-- Hasta ahora el precio local salía siempre de multiplicar el dólar por la
-- tasa. Eso sirve de partida, pero deja el precio a merced del tipo de cambio y
-- no permite ajustar un mercado concreto: en Perú los paquetes grandes salían
-- caros (S/ 145 los 6.000 diamantes) frente a lo que aguanta la competencia.
--
-- Un factor único por país tampoco vale, porque el margen que se quiere no es
-- proporcional: en el paquete pequeño se gana más y en el grande se afina para
-- que compense comprarlo. Por eso el precio se fija PRODUCTO A PRODUCTO.
--
-- Formato: {"PE": 30, "CO": 40000}  -> importe en la moneda de ese país.
-- Lo que no esté aquí sigue calculándose con la tasa, como siempre.
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS precios_locales jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.precios_locales IS
  'Precio cerrado por pais, en su moneda: {"PE": 30}. Tiene prioridad sobre la '
  'conversion por tasa. Vacio = se calcula con el tipo de cambio.';

-- Perú, según los precios que sostiene el mercado local.
UPDATE products SET precios_locales = precios_locales || '{"PE": 30}'::jsonb
 WHERE diamonds_amount BETWEEN 1000 AND 1400;
UPDATE products SET precios_locales = precios_locales || '{"PE": 55}'::jsonb
 WHERE diamonds_amount BETWEEN 2000 AND 2600;
UPDATE products SET precios_locales = precios_locales || '{"PE": 130}'::jsonb
 WHERE diamonds_amount BETWEEN 5500 AND 6500;

-- Los paquetes que no mencionó se dejan proporcionales a los fijados, para que
-- la escalera no tenga escalones raros (un paquete pequeño costando más por
-- diamante que el grande hace desconfiar).
UPDATE products SET precios_locales = precios_locales || '{"PE": 9}'::jsonb
 WHERE diamonds_amount BETWEEN 300 AND 400;
UPDATE products SET precios_locales = precios_locales || '{"PE": 15}'::jsonb
 WHERE diamonds_amount BETWEEN 500 AND 700;
UPDATE products SET precios_locales = precios_locales || '{"PE": 250}'::jsonb
 WHERE diamonds_amount BETWEEN 11000 AND 13000;
UPDATE products SET precios_locales = precios_locales || '{"PE": 390}'::jsonb
 WHERE diamonds_amount BETWEEN 18000 AND 22000;

-- ============================================================
-- 2) EL MERCADO DEJA DE CAER
--
-- QUE PASO
-- --------
-- Al bajar la vela de 5 minutos a 1, se dividieron entre doce la deriva y el
-- ruido, pero NO la fuerza de las ventas automáticas. Resultado: la venta pasó
-- a ser doce veces más frecuente con el mismo peso, y la media por vela quedó
-- NEGATIVA. El precio se hundió un 72% en día y medio.
--
--   deriva  +0.00010
--   ruido   +0.00020   (el ruido estaba sesgado: random()-0.45, no -0.5)
--   Barron  -0.00105   (0.35 de probabilidad x 0.003 de media)
--           --------
--           -0.00075 por vela  ->  -4,4% cada hora
--
-- LA CALIBRACION NUEVA
-- --------------------
-- Se parte del objetivo -que la moneda llegue algún día a valer un dólar- y se
-- despeja hacia atrás, en vez de tocar números a ojo:
--
--   · Subida NETA buscada: +2,5% al día. Desde 0.0001 son unos 370 días hasta
--     1 USD. Suficientemente rápido para que se note cada día, suficientemente
--     lento para que el recorrido dure.
--   · +2,5%/día con 1.440 velas = +0,00172% por vela = 0.0000172
--   · Las ventas automáticas restan 0.20 x 0.0002 = 0.00004 de media
--   · Luego la deriva bruta debe ser 0.0000172 + 0.00004 = 0.0000572
--
-- El ruido pasa a estar CENTRADO (random()-0.5): antes iba sesgado y falseaba
-- la cuenta. Su trabajo es que haya velas rojas y verdes, no empujar el precio.
-- ============================================================
UPDATE settings SET value = '0.0000572' WHERE key = 'eco.mercado_deriva';
UPDATE settings SET value = '0.003'     WHERE key = 'eco.mercado_ruido';
UPDATE settings SET value = '0.20'      WHERE key = 'eco.mercado_barron_prob';
UPDATE settings SET value = '0.0004'    WHERE key = 'eco.mercado_barron_fuerza';

-- Suelo móvil: cuánto puede caer como máximo desde su techo del último día.
-- 0.82 = una corrección del 18% es posible; un desplome, no.
INSERT INTO settings (key, value) VALUES ('eco.mercado_suelo', '0.82')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3) EL MOTOR, CON SUELO
--
-- El suelo móvil es lo que convierte "tiende a subir" en "sube". Con solo una
-- media positiva, una mala racha de azar puede hundir el precio durante horas y
-- la gente lo ve caer justo el día que entra. Con un suelo atado al máximo de
-- las últimas 24 h, hay correcciones -que es lo que hace creíble el gráfico-
-- pero el fondo siempre acompaña al techo.
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
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));

  SELECT bucket, close INTO v_ultimo, v_precio
    FROM market_candles ORDER BY bucket DESC LIMIT 1;

  IF v_ultimo IS NULL THEN
    v_precio := v_base;
    v_ultimo := v_bucket - (v_min * 1440 || ' minutes')::interval;
  END IF;

  IF v_ultimo >= v_bucket THEN
    RETURN v_precio;
  END IF;

  -- Techo del último día. Se calcula UNA vez y se va actualizando dentro del
  -- bucle: consultarlo en cada vuelta sería una consulta por minuto simulado.
  SELECT COALESCE(MAX(high), v_precio) INTO v_techo
    FROM market_candles WHERE bucket >= now() - interval '24 hours';
  v_techo := GREATEST(v_techo, v_precio);

  WHILE v_ultimo < v_bucket AND v_i < 1500 LOOP
    v_ultimo := v_ultimo + (v_min || ' minutes')::interval;
    v_i := v_i + 1;

    SELECT COALESCE(SUM(amount), 0) INTO v_vol
      FROM point_events
      WHERE created_at >= v_ultimo - (v_min || ' minutes')::interval
        AND created_at <  v_ultimo
        AND amount > 0;

    v_open := v_precio;

    -- Ruido CENTRADO: su trabajo es dar forma a la vela, no empujar el precio.
    -- Antes iba sesgado (random()-0.45) y falseaba la cuenta de la deriva.
    v_paso := v_deriva
            + (v_vol::numeric * v_impacto)
            + ((random() - 0.5) * v_ruido);

    v_vendio := random() < v_bprob;
    IF v_vendio THEN
      v_paso := v_paso - (random() * v_bfuerza);
    END IF;

    v_close := v_open * (1 + v_paso);

    -- El suelo. Nunca por debajo de un porcentaje del techo del día.
    v_piso := GREATEST(v_techo * v_suelo, v_base * 0.5);
    IF v_close < v_piso THEN
      -- No se clava en el suelo: rebota con un poco de aire, para que no se vea
      -- una línea recta artificial en la parte de abajo.
      v_close := v_piso * (1 + random() * 0.004);
    END IF;

    v_hi := GREATEST(v_open, v_close) * (1 + random() * v_ruido * 0.5);
    v_lo := LEAST(v_open, v_close)  * (1 - random() * v_ruido * 0.5);
    IF v_lo < v_piso * 0.98 THEN v_lo := v_piso * 0.98; END IF;

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
    -- El techo sube con el precio: así el suelo acompaña siempre a la subida.
    v_techo := GREATEST(v_techo, v_hi);
  END LOOP;

  DELETE FROM market_candles WHERE bucket < now() - (v_dias || ' days')::interval;
  DELETE FROM market_trades  WHERE created_at < now() - interval '1 day';

  RETURN v_precio;
END;
$$;

-- ============================================================
-- 4) REGENERAR EL HISTORIAL
--
-- El historial actual es la caída del 72%: no sirve de nada conservarlo, y
-- abrir el gráfico con un desplome es justo lo contrario de lo que se busca.
-- Se borra y se reconstruye un día entero con la calibración nueva.
-- ============================================================
DELETE FROM market_candles;
DELETE FROM market_trades;
SELECT market_tick();

-- Como quedó.
SELECT
  to_char(MIN(bucket), 'DD/MM HH24:MI')            AS desde,
  to_char(MAX(bucket), 'DD/MM HH24:MI')            AS hasta,
  count(*)                                          AS velas,
  round(MIN(low), 8)                                AS minimo,
  round(MAX(high), 8)                               AS maximo,
  round((SELECT close FROM market_candles ORDER BY bucket DESC LIMIT 1), 8) AS precio_ahora
FROM market_candles;
