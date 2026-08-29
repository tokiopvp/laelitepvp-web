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
