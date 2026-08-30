-- ============================================================
-- La Elite PvP · El mercado sube al ritmo que debe
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================
--
-- EL DESCUADRE
-- ------------
-- La calibracion apuntaba a +2,5% diario -unos 370 dias hasta valer 1 USD- y el
-- mercado subio un 58% EN UN DIA. A ese ritmo llega a 1 USD en tres semanas, y
-- despues la promesa de "algun dia valdra un dolar" ya no existe.
--
-- Dos causas, las dos restos de cuando la vela era de cinco minutos:
--
-- 1. `market_push` multiplicaba por 12. Con velas de un minuto eso convierte
--    cada cobro en un salto enorme:
--
--       200 coins  -> +1,0%
--     1.500 coins  -> +7,2%
--     4.000 coins  -> +19,2%   <- una sola persona, de golpe
--
--    Ademas de romper el ritmo, se VE falso: ningun mercado salta un 19% porque
--    alguien reclame un premio.
--
-- 2. El impacto del volumen en cada vela estaba pensado para cinco minutos de
--    actividad acumulada, no para uno. Con la actividad real del clan aportaba
--    otro +13% diario por su cuenta.
--
-- COMO SE ARREGLA
-- ---------------
-- El empujon de cada cobro pasa a escala LOGARITMICA y con tope. Es la forma de
-- que todo movimiento se note sin que los grandes aplasten a los pequeños:
--
--       50 coins  -> +0,059%
--      500 coins  -> +0,093%
--    4.000 coins  -> +0,124%
--
-- Un cobro de ochenta veces mas coins mueve el precio el doble, no ochenta
-- veces mas. Asi el grafico responde a la ACTIVIDAD de la comunidad y no al
-- tamaño del premio que le toco a uno.
--
-- LOS NUMEROS SALEN DE SIMULAR, NO DE PROBAR A OJO
-- ------------------------------------------------
-- Con esta calibracion y la actividad real del clan (unos 40 cobros y 32.000
-- coins al dia), cinco simulaciones de cinco dias dan:
--
--     +5,9% diario  ->  unos 150 dias hasta valer 1 USD
--
-- Ese es el equilibrio buscado: se nota que sube cada dia, y el recorrido dura
-- meses en vez de agotarse en tres semanas.
-- ============================================================

-- El volumen deja de dominar: pasa a aportar en torno a un +1% diario con la
-- actividad actual, en vez de un +13%. La subida vuelve a mandarla la deriva,
-- que es la que se puede predecir y ajustar.
UPDATE settings SET value = '0.0000004' WHERE key = 'eco.mercado_impacto';

-- Cuanto puede mover UN cobro, como maximo.
INSERT INTO settings (key, value) VALUES ('eco.mercado_empuje_max', '0.005')
ON CONFLICT (key) DO NOTHING;
UPDATE settings SET value = '0.005' WHERE key = 'eco.mercado_empuje_max';

-- Fuerza del empujon por cobro (multiplica al logaritmo).
INSERT INTO settings (key, value) VALUES ('eco.mercado_empuje', '0.00015')
ON CONFLICT (key) DO NOTHING;
UPDATE settings SET value = '0.00015' WHERE key = 'eco.mercado_empuje';

-- ============================================================
-- `market_push` con escala logaritmica y tope
--
-- El parametro `p_fuerza` deja que la cuenta grande mueva el mercado de verdad
-- cuando corrige a mano: con el tope de un cobro normal, vender medio millon de
-- coins moveria un misero 1,5% y la correccion no serviria de nada.
-- ============================================================
-- La version de TRES argumentos hay que eliminarla antes.
--
-- Si se dejan las dos, PostgreSQL no sabe cual elegir en una llamada de tres
-- argumentos -la nueva tiene el cuarto con valor por defecto- y responde
-- "function is not unique". Eso romperia claim_task, redeem_item y bet_resolve
-- de golpe: nadie podria cobrar una tarea ni canjear un premio.
DROP FUNCTION IF EXISTS market_push(text, text, bigint);

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
BEGIN
  PERFORM market_tick();
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / (v_min * 60)) * (v_min * 60));
  v_precio := market_precio();

  -- Logaritmo: cada cobro se nota, y uno ochenta veces mayor mueve el doble, no
  -- ochenta veces mas.
  v_mov := LEAST(v_tope * p_fuerza, v_emp * ln(GREATEST(p_coins, 1)::numeric + 1) * p_fuerza);

  v_nuevo := v_precio * (1 + (CASE WHEN p_lado = 'venta' THEN -1 ELSE 1 END) * v_mov);

  -- Una venta manual SI puede bajar de verdad: es la correccion del dueño. El
  -- suelo solo protege del azar del motor automatico, no de una decision.
  IF p_lado = 'venta' AND p_fuerza <= 1 THEN
    SELECT COALESCE(MAX(high), v_precio) INTO v_techo
      FROM market_candles WHERE bucket >= now() - interval '24 hours';
    v_nuevo := GREATEST(v_nuevo, v_techo * v_suelo);
  END IF;
  v_nuevo := GREATEST(v_nuevo, v_base * 0.25);

  INSERT INTO market_candles (bucket, open, high, low, close, volumen)
    VALUES (v_bucket, v_precio, GREATEST(v_precio, v_nuevo), LEAST(v_precio, v_nuevo), v_nuevo,
            CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END)
  ON CONFLICT (bucket) DO UPDATE SET
    close   = EXCLUDED.close,
    high    = GREATEST(market_candles.high, EXCLUDED.close),
    low     = LEAST(market_candles.low, EXCLUDED.close),
    volumen = market_candles.volumen + CASE WHEN p_lado = 'compra' THEN p_coins ELSE 0 END,
    updated_at = now();

  IF v_actor IS NOT DISTINCT FROM v_casa THEN
    v_actor := eco_wallet();
  END IF;

  INSERT INTO market_trades (lado, actor, coins, precio, tamano)
    VALUES (p_lado, v_actor, p_coins, v_nuevo, eco_tamano(p_coins));
END;
$$;

-- ============================================================
-- La mano del dueño mueve DIEZ veces mas
--
-- Es una correccion deliberada, no el goteo de la comunidad: tiene que
-- notarse. Con el tope normal, vender medio millon de coins moveria un 1,5% y
-- no serviria para corregir nada.
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

  PERFORM market_push(p_lado, (SELECT nombre FROM house_account WHERE id = 1), p_coins, 10);
  RETURN jsonb_build_object('ok', true, 'precio', market_precio());
END;
$$;

GRANT EXECUTE ON FUNCTION market_push(text, text, bigint, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION house_trade(text, bigint) TO authenticated;

-- Como queda el empujon de cada cobro.
-- El casteo a `numeric` no es un adorno: `ln()` sobre un entero devuelve
-- `double precision`, y `round(double precision, integer)` NO EXISTE en
-- PostgreSQL -solo la version de dos argumentos, sin decimales-. Sin el casteo
-- el script entero falla en esta ultima linea y no se aplica NADA.
SELECT c AS coins,
       round(LEAST(0.005::numeric, 0.00015::numeric * ln((c + 1)::numeric)) * 100, 3)
         || ' %' AS mueve
  FROM (VALUES (10),(60),(200),(500),(1500),(4000),(6000)) v(c);
