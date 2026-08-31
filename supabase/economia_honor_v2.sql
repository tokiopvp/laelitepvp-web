-- ============================================================
-- La Elite PvP · El honor vale 1 a 1
-- Ejecutar UNA VEZ en Supabase > SQL Editor, despues de
-- economia_honor.sql.
-- ============================================================
--
-- QUE CAMBIA
-- ----------
--   1 de honor  =  1 Elite Coin        (antes 25)
--   Booster     =  +50% al cambiar     (100 de honor -> 150 coins)
--
-- POR QUE TAMBIEN BAJAN LAS TAREAS DE HONOR
-- -----------------------------------------
-- Cambiar solo la conversion no habria arreglado nada. Los hitos de honor
-- pagaban entre 5 y 9 coins POR CADA PUNTO de honor:
--
--     "Primer honor del dia"  100 de honor  ->    800 coins   (8,0 por honor)
--     "Dia historico"       5.000 de honor  -> 25.000 coins   (5,0 por honor)
--     "Fuera de categoria" 20.000 de honor  -> 180.000 coins  (9,0 por honor)
--
-- O sea que la inflacion que molestaba seguia entera, solo que por otra
-- puerta: al que mas juega le entraban ~35.000 coins al dia por hitos de honor
-- y solo 2.385 por convertirlo. La conversion -que es la pieza que se queria
-- ajustar- habria quedado en el 6% de sus ingresos, decorativa.
--
-- Ahora los hitos son un BONUS sobre la conversion, no una segunda fuente que
-- la aplasta: rondan entre 0,5 y 1 vez el objetivo, nunca cinco veces.
--
-- COMO SE APILAN LOS BONUS: SUMANDO, NO MULTIPLICANDO
-- ---------------------------------------------------
-- Un booster con la racha maxima se llevaria 100 -> 225 si se multiplicaran
-- (1 x 1,5 x 1,5), y eso ya no es "100 de honor son 150". Sumando queda:
--
--     normal                     100 -> 100
--     booster                    100 -> 150
--     racha de 10 dias           100 -> 150
--     booster + racha de 10      100 -> 200
--
-- El techo queda en el doble, que se entiende de un vistazo.
--
-- EL x2 DE LAS TAREAS NO SE TOCA
-- ------------------------------
-- El booster sigue cobrando el doble en tareas, voz y mensajes: eso es lo que
-- convierte "un minuto de voz da 1 coin" en 2, que fue lo pedido. El +50% de
-- aqui es solo para CAMBIAR honor, que es otra cosa.
-- ============================================================

UPDATE settings SET value = '1' WHERE key = 'eco.honor_tasa';

-- Lo que suma ser booster al cambiar honor. Es un sumando, no un factor.
INSERT INTO settings (key, value) VALUES ('eco.honor_booster', '0.5')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 1) MI SALDO DE HONOR  (ahora cuenta el boost)
-- ============================================================
CREATE OR REPLACE FUNCTION mi_honor()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_b      honor_banco%ROWTYPE;
  v_perfil profiles%ROWTYPE;
  v_tasa   numeric := eco_num('eco.honor_tasa', 1);
  v_paso   numeric := eco_num('eco.honor_racha_paso', 0.05);
  v_max    numeric := eco_num('eco.honor_racha_max', 0.50);
  v_bst    numeric := eco_num('eco.honor_booster', 0.5);
  v_racha  integer;
  v_bonusr numeric;
  v_bonusb numeric := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('disponible', 0, 'tasa', v_tasa);
  END IF;
  SELECT * INTO v_b FROM honor_banco WHERE profile_id = v_uid;
  SELECT * INTO v_perfil FROM profiles WHERE id = v_uid;

  -- La racha solo cuenta si sigue viva: si el ultimo dia con honor fue
  -- anteayer, ya se rompio aunque la columna siga diciendo 9.
  v_racha := CASE
    WHEN v_b.racha_dia IS NULL OR v_b.racha_dia < CURRENT_DATE - 1 THEN 0
    ELSE COALESCE(v_b.racha, 0)
  END;
  v_bonusr := LEAST(v_max, v_racha * v_paso);

  IF v_perfil.booster_hasta IS NOT NULL AND v_perfil.booster_hasta > now() THEN
    v_bonusb := v_bst;
  END IF;

  RETURN jsonb_build_object(
    'disponible',     COALESCE(v_b.disponible, 0),
    'ganado_total',   COALESCE(v_b.ganado_total, 0),
    'canjeado_total', COALESCE(v_b.canjeado_total, 0),
    'racha',          v_racha,
    'bonus',          v_bonusr,
    'bonus_booster',  v_bonusb,
    'es_booster',     v_bonusb > 0,
    'tasa',           v_tasa,
    'tasa_efectiva',  round(v_tasa * (1 + v_bonusr + v_bonusb), 2),
    'min_canje',      eco_num('eco.honor_min_canje', 50)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION mi_honor() TO authenticated;

-- ============================================================
-- 2) CAMBIAR HONOR  (mismo apilado, sumando)
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
  v_perfil profiles%ROWTYPE;
  v_tasa   numeric := eco_num('eco.honor_tasa', 1);
  v_paso   numeric := eco_num('eco.honor_racha_paso', 0.05);
  v_max    numeric := eco_num('eco.honor_racha_max', 0.50);
  v_bst    numeric := eco_num('eco.honor_booster', 0.5);
  v_min    bigint  := eco_num('eco.honor_min_canje', 50)::bigint;
  v_racha  integer;
  v_bonusr numeric;
  v_bonusb numeric := 0;
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

  SELECT * INTO v_perfil FROM profiles WHERE id = v_uid;

  v_racha := CASE
    WHEN v_b.racha_dia IS NULL OR v_b.racha_dia < CURRENT_DATE - 1 THEN 0
    ELSE COALESCE(v_b.racha, 0)
  END;
  v_bonusr := LEAST(v_max, v_racha * v_paso);
  IF v_perfil.booster_hasta IS NOT NULL AND v_perfil.booster_hasta > now() THEN
    v_bonusb := v_bst;
  END IF;

  v_coins := floor(p_honor * v_tasa * (1 + v_bonusr + v_bonusb))::bigint;

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
    'bonus', v_bonusr, 'bonus_booster', v_bonusb, 'racha', v_racha,
    'total', (SELECT points FROM profiles WHERE id = v_uid),
    'restante', (SELECT disponible FROM honor_banco WHERE profile_id = v_uid));
END;
$$;

GRANT EXECUTE ON FUNCTION canjear_honor(bigint) TO authenticated;

-- ============================================================
-- 3) LOS HITOS, A ESCALA
--
-- Cada uno vale entre media vez y una vez su objetivo. Sigue mereciendo la
-- pena llegar al siguiente escalon -por eso el de 5.000 paga proporcionalmente
-- mas que el de 100- pero ninguno multiplica el honor por cinco.
-- ============================================================
UPDATE tasks SET coins =    50 WHERE titulo = 'Primer honor del día';
UPDATE tasks SET coins =   250 WHERE titulo = 'Buen día de clan';
UPDATE tasks SET coins =   600 WHERE titulo = 'Máquina de honor';
UPDATE tasks SET coins =  1800 WHERE titulo = 'Bestia del clan';
UPDATE tasks SET coins =  4500 WHERE titulo = 'Día histórico';

UPDATE tasks SET coins =   700 WHERE titulo = 'Semana en marcha';
UPDATE tasks SET coins =  4000 WHERE titulo = 'Aporte serio';
UPDATE tasks SET coins = 10000 WHERE titulo = 'Pilar del clan';
UPDATE tasks SET coins = 25000 WHERE titulo = 'Fuera de categoría';

-- Las de racha no se miden contra honor sino contra dias, asi que se calibran
-- por lo que valen: unos pocos dias de juego del que las consigue.
UPDATE tasks SET coins =   400 WHERE titulo = 'Tres días seguidos';
UPDATE tasks SET coins =  1500 WHERE titulo = 'Una semana entera';
UPDATE tasks SET coins =  4000 WHERE titulo = 'Racha máxima';

UPDATE tasks SET coins =  2500 WHERE titulo = 'Honor de bronce';
UPDATE tasks SET coins = 12000 WHERE titulo = 'Honor de plata';
UPDATE tasks SET coins = 50000 WHERE titulo = 'Honor de oro';

-- Las de booster bajan en la misma proporcion: si no, el boost pasaria a ser
-- la unica fuente que importa y el honor volveria a sobrar.
UPDATE tasks SET coins =  5000 WHERE titulo = 'Gracias por el boost';
UPDATE tasks SET coins =   150 WHERE titulo = 'Boost del día';
UPDATE tasks SET coins =  1200 WHERE titulo = 'Boost de la semana';

-- ============================================================
-- COMPROBACION
-- ============================================================
SELECT titulo, objetivo, coins,
       round(coins::numeric / GREATEST(objetivo, 1), 2) AS coins_por_honor
  FROM tasks
 WHERE metrica IN ('honor_dia', 'honor_semana', 'honor_total')
 ORDER BY orden;
