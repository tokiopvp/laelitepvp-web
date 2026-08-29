-- ============================================================
-- La Elite PvP · Administración de saldos
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- POR QUE UNA FUNCION Y NO EDITAR LA COLUMNA A MANO
--
-- Tentador: dar permiso de UPDATE sobre `profiles.points` y que el panel
-- escriba el numero nuevo. Pero entonces:
--
--   · No queda rastro de quien lo cambio ni por que. Cuando alguien reclame
--     "me quitaron coins", no habria nada que mirar.
--   · Dos ajustes a la vez se pisan: el segundo escribe sobre el primero y uno
--     de los dos movimientos desaparece sin avisar.
--   · Se ajusta a un TOTAL, no por una diferencia. Si el saldo cambio entre
--     que se abrio el panel y se pulso guardar -una tarea cobrada, una apuesta-
--     ese movimiento se borra.
--
-- Esta funcion trabaja siempre por DIFERENCIA (+500, -200), bloquea la fila y
-- deja constancia. Es la misma disciplina que el resto de la economia.
-- ------------------------------------------------------------

-- El motivo del movimiento. Sin esto, el historial dice "admin: -500" y nadie
-- recuerda a que correspondia dos semanas despues.
ALTER TABLE point_events ADD COLUMN IF NOT EXISTS motivo text;

COMMENT ON COLUMN point_events.motivo IS
  'Por que se hizo el movimiento. Obligatorio en los ajustes manuales: es lo '
  'unico que permite resolver una reclamacion pasado un tiempo.';

CREATE OR REPLACE FUNCTION admin_ajustar_saldo(
  p_profile uuid,
  p_delta bigint,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol    text;
  v_quien  text;
  v_nombre text;
  v_antes  bigint;
  v_despues bigint;
BEGIN
  SELECT role, COALESCE(display_name, username) INTO v_rol, v_quien
    FROM profiles WHERE id = auth.uid();
  IF v_rol IS NULL OR v_rol NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo el owner o un admin pueden mover saldos.');
  END IF;

  IF p_delta = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La cantidad no puede ser cero.');
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN
    -- El motivo es obligatorio a proposito: un ajuste sin explicacion es
    -- exactamente lo que no se puede defender cuando alguien reclama.
    RETURN jsonb_build_object('ok', false, 'error', 'Escribe un motivo (mínimo 3 letras).');
  END IF;

  -- Bloqueo de la fila: dos ajustes simultaneos se ordenan en vez de pisarse.
  SELECT points INTO v_antes FROM profiles WHERE id = p_profile FOR UPDATE;
  IF v_antes IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese jugador no existe.');
  END IF;

  -- El saldo nunca queda negativo: si se quita mas de lo que hay, se deja en
  -- cero. Un saldo negativo bloquearia a esa persona para siempre sin que
  -- entienda por que.
  v_despues := GREATEST(0, v_antes + p_delta);

  UPDATE profiles SET points = v_despues, updated_at = now() WHERE id = p_profile;

  INSERT INTO point_events (profile_id, type, amount, motivo)
    VALUES (p_profile, 'admin', v_despues - v_antes,
            format('%s — por %s', trim(p_motivo), COALESCE(v_quien, 'staff')));

  SELECT COALESCE(display_name, username) INTO v_nombre FROM profiles WHERE id = p_profile;

  -- Un ajuste manual mueve el mercado como cualquier otro movimiento de coins:
  -- si no, el grafico y el ranking contarian historias distintas.
  IF v_despues > v_antes THEN
    PERFORM market_push('compra', COALESCE(v_nombre, 'Ajuste'), v_despues - v_antes);
  ELSIF v_despues < v_antes THEN
    PERFORM market_push('venta', COALESCE(v_nombre, 'Ajuste'), v_antes - v_despues);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'nombre', v_nombre,
    'antes', v_antes, 'despues', v_despues, 'movido', v_despues - v_antes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_ajustar_saldo(uuid, bigint, text) TO authenticated;

-- ------------------------------------------------------------
-- DEVOLVER UN CANJE
--
-- Cuando un premio no se puede entregar -se agoto, el ID estaba mal, hubo un
-- error- hay que devolver las coins Y marcar el canje. Hacerlo en dos pasos
-- desde el panel se presta a que uno de los dos falle y quede a medias: coins
-- devueltas con el canje aun pendiente, o al reves.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_devolver_canje(p_canje uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol  text;
  v_c    redemptions%ROWTYPE;
  v_r    jsonb;
BEGIN
  SELECT role INTO v_rol FROM profiles WHERE id = auth.uid();
  IF v_rol IS NULL OR v_rol NOT IN ('owner', 'admin', 'moderator') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos.');
  END IF;

  SELECT * INTO v_c FROM redemptions WHERE id = p_canje FOR UPDATE;
  IF v_c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese canje no existe.');
  END IF;
  IF v_c.estado = 'rechazado' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese canje ya se devolvió.');
  END IF;

  -- Se devuelve el importe exacto que se cobro, no el precio de hoy: el premio
  -- pudo cambiar de precio desde entonces y devolver otra cifra seria injusto
  -- en una direccion o en la otra.
  UPDATE profiles SET points = points + v_c.coins, updated_at = now()
    WHERE id = v_c.profile_id;
  INSERT INTO point_events (profile_id, type, amount, motivo)
    VALUES (v_c.profile_id, 'admin', v_c.coins,
            format('Devolución de %s — %s', v_c.item_nombre,
                   COALESCE(NULLIF(trim(p_motivo), ''), 'sin motivo indicado')));

  -- El stock vuelve, si el premio lo llevaba.
  UPDATE shop_items SET stock = stock + 1
    WHERE id = v_c.item_id AND stock >= 0;

  UPDATE redemptions
     SET estado = 'rechazado',
         nota = COALESCE(NULLIF(trim(p_motivo), ''), nota),
         updated_at = now()
   WHERE id = p_canje;

  RETURN jsonb_build_object('ok', true, 'devuelto', v_c.coins, 'item', v_c.item_nombre);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_devolver_canje(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- El historial completo de un jugador, para resolver reclamaciones.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_historial(p_profile uuid, p_limite integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
BEGIN
  SELECT role INTO v_rol FROM profiles WHERE id = auth.uid();
  IF v_rol IS NULL OR v_rol NOT IN ('owner', 'admin', 'moderator') THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(f ORDER BY f.created_at DESC)
      FROM (
        SELECT id, type, amount, motivo, created_at
          FROM point_events
         WHERE profile_id = p_profile
         ORDER BY created_at DESC
         LIMIT LEAST(GREATEST(p_limite, 1), 200)
      ) f
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_historial(uuid, integer) TO authenticated;

SELECT 'administracion de saldos lista' AS estado;
