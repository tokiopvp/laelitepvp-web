-- ============================================================
-- La Elite PvP · Progreso de tareas
-- Ejecutar DESPUES de economia.sql, una vez, en Supabase > SQL Editor.
-- ============================================================

/**
 * Cuanto lleva el usuario en CADA tarea activa.
 *
 * POR QUE UNA SOLA FUNCION Y NO UNA CONSULTA POR TAREA
 * ----------------------------------------------------
 * Son veinte tareas. Calcularlas desde el navegador serian veinte peticiones
 * en cada carga de la pagina, sobre telefonos con datos moviles. Aqui es una
 * sola llamada que devuelve todo resuelto.
 *
 * Y sobre todo: el progreso se calcula con la MISMA logica que `claim_task`.
 * Si la barra dijera "250/250" y al pulsar saltara "todavia no llegas", la
 * pagina estaria mintiendo, que es peor que no mostrar nada.
 */
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
  v_member jsonb;
  v_out    jsonb := '[]'::jsonb;
  v_valor  numeric;
  v_key    text;
  r        tasks%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN v_out;
  END IF;

  SELECT * INTO v_perfil FROM profiles WHERE id = v_uid;
  IF v_perfil.member_id IS NOT NULL THEN
    SELECT to_jsonb(m.*) INTO v_member FROM members m WHERE m.id = v_perfil.member_id;
  END IF;

  FOR r IN SELECT * FROM tasks WHERE activa = true ORDER BY orden LOOP
    v_key := CASE r.periodo
               WHEN 'diaria'  THEN to_char(now(), 'YYYY-MM-DD')
               WHEN 'semanal' THEN to_char(now(), 'IYYY-"W"IW')
               ELSE 'unica'
             END;

    IF r.metrica = 'checkin' THEN
      v_valor := 1;
    ELSIF r.metrica = 'manual' THEN
      v_valor := CASE WHEN COALESCE(v_perfil.is_member, false) THEN 1 ELSE 0 END;
    ELSIF r.metrica IN ('discord_voz_min', 'discord_msgs') THEN
      SELECT COALESCE(SUM(CASE WHEN r.metrica = 'discord_voz_min'
                               THEN voz_minutos ELSE mensajes END), 0)
        INTO v_valor
        FROM discord_activity
        WHERE profile_id = v_uid
          AND dia >= CASE r.periodo
                       WHEN 'diaria'  THEN CURRENT_DATE
                       WHEN 'semanal' THEN date_trunc('week', now())::date
                       ELSE '1970-01-01'::date
                     END;
    ELSE
      v_valor := COALESCE((v_member ->> r.metrica)::numeric, 0);
    END IF;

    v_out := v_out || jsonb_build_object(
      'task_id',  r.id,
      'progreso', v_valor,
      'objetivo', r.objetivo,
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
-- RECALIBRADO DEL ESCALON DE ENTRADA
--
-- POR QUE
-- -------
-- Con los precios de arranque, el premio mas barato (110 diamantes, ~1 USD)
-- costaba 8.000 coins. Un jugador MUY activo topa en unas 330 coins al dia
-- (240 de voz + 40 de mensajes + 50 de tareas diarias), asi que el primer
-- premio quedaba a 24 dias. A esa distancia nadie relaciona la tarea con la
-- recompensa: abandonan en la primera semana y la tienda se vuelve decorado.
--
-- Se baja SOLO la parte de abajo de la escalera. El techo no se toca: los
-- premios grandes deben seguir exigiendo las tareas de kills y Booyahs, que es
-- lo que hace que se juegue de verdad y no solo que se este presente.
--
--   110 diamantes   8.000 -> 2.500    (~1 semana)
--   310 diamantes  22.000 -> 7.000    (~3 semanas)
--   Pase Elite     60.000 -> 25.000   (~2,5 meses)
--   1.000 diam.    70.000 -> 40.000   (~4 meses)
--   2.000 / 6.000 / 100 USD: sin cambios
--
-- Se filtra por precio ademas de por nombre para que este script no pise
-- ajustes que ya se hayan hecho a mano desde el panel: si un premio ya no
-- esta en su precio original, se respeta lo que haya decidido el owner.
-- ============================================================
UPDATE shop_items SET precio_coins =  2500 WHERE nombre = '110 Diamantes'   AND precio_coins =  8000;
UPDATE shop_items SET precio_coins =  7000 WHERE nombre = '310 Diamantes'   AND precio_coins = 22000;
UPDATE shop_items SET precio_coins = 25000 WHERE nombre = 'Pase Elite'      AND precio_coins = 60000;
UPDATE shop_items SET precio_coins = 40000 WHERE nombre = '1.000 Diamantes' AND precio_coins = 70000;

-- Como queda la tienda despues de correr esto.
SELECT nombre, precio_coins, valor_usd, rareza, solo_clan
  FROM shop_items WHERE activo = true ORDER BY orden;
