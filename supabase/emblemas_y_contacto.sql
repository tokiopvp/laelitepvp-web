-- ============================================================
-- EMBLEMAS REALES + CONTACTO DEL JUGADOR
--
-- 1) EMBLEMAS. El texto que Free Fire pone bajo el rango dice "EMBLEMA
--    HEROICO" en TODOS los jugadores: es una insignia fija, no el tier. Por eso
--    `members.rank` sale igual para los 44 y la web pintaba un Heroico generico
--    a todo el mundo. El bot ahora recorta la IMAGEN del emblema del propio
--    perfil (Battle Royale y Duelo de Escuadras) y la sube a Storage; estas
--    columnas la enlazan.
--
-- 2) CONTACTO. `profiles.whatsapp` cierra el triangulo que faltaba:
--    Discord (login) + Free Fire ID (juego) + WhatsApp (grupo del clan). Con
--    los tres atados por el mismo perfil, el bot puede etiquetar a la persona
--    correcta en el grupo y las Elite Coins quedan trazadas de punta a punta.
-- ============================================================

-- ---------- 1) emblemas reales en members ----------
ALTER TABLE members ADD COLUMN IF NOT EXISTS emblema_br_url text;
ALTER TABLE members ADD COLUMN IF NOT EXISTS emblema_cs_url text;

-- Los PUNTOS y la TEMPORADA no llevan columna propia: el bot ya los manda
-- dentro de members.stats_json (claves `puntos_br`, `puntos_cs`) junto con las
-- otras 240 metricas, y la web los lee de ahi. Una columna que nadie rellena
-- es peor que no tenerla.

COMMENT ON COLUMN members.emblema_br_url IS
  'Recorte del emblema REAL de Battle Royale, sacado del perfil del jugador. '
  'Preferir SIEMPRE esto sobre members.rank, que dice "Heroic" para todos.';
COMMENT ON COLUMN members.emblema_cs_url IS
  'Igual, para Duelo de Escuadras (Clash Squad).';

-- Bucket publico para los emblemas (mismo patron que avatars/outfits).
INSERT INTO storage.buckets (id, name, public)
VALUES ('emblemas', 'emblemas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "emblemas lectura publica" ON storage.objects;
CREATE POLICY "emblemas lectura publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'emblemas');

-- ---------- 2) contacto del jugador ----------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;

COMMENT ON COLUMN profiles.whatsapp IS
  'Solo digitos: codigo de pais + numero, sin + ni espacios. Lo escribe el '
  'propio jugador desde /mi. El bot del clan lo usa para etiquetarlo en el '
  'grupo de WhatsApp.';

-- Un mismo numero no puede estar en dos perfiles: si no, el bot etiquetaria a
-- la persona equivocada en los avisos y las dinamicas.
CREATE UNIQUE INDEX IF NOT EXISTS ux_profiles_whatsapp
  ON profiles (whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp <> '';

-- ---------- 3) guardar vinculacion (ID de juego + WhatsApp) ----------
-- Una sola llamada para las dos cosas. Devuelve un JSON con lo que paso, para
-- que la pagina pueda decir exactamente que fallo en vez de un "no se pudo".
CREATE OR REPLACE FUNCTION guardar_vinculacion(p_ffid text, p_whatsapp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_member_id  uuid;
  v_nick       text;
  v_ffid       text := nullif(btrim(coalesce(p_ffid, '')), '');
  v_wa         text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_ya_ligado  boolean := false;
  v_premiado   boolean := false;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- WhatsApp: se valida el largo aqui y no solo en el navegador. Un numero de
  -- 4 digitos no le sirve de nada al bot y ensucia la tabla.
  IF v_wa IS NOT NULL AND (length(v_wa) < 8 OR length(v_wa) > 15) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'whatsapp_invalido');
  END IF;

  IF v_wa IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE whatsapp = v_wa AND id <> v_profile_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'whatsapp_en_uso');
  END IF;

  -- Free Fire ID: tiene que existir en el clan. El censo del bot abre el perfil
  -- de cada miembro y lee su UID del propio juego, asi que esta comprobacion es
  -- contra la lista real, no contra lo que el usuario diga que es.
  IF v_ffid IS NOT NULL THEN
    SELECT id, nickname INTO v_member_id, v_nick
      FROM members
     WHERE lower(free_fire_id) = lower(v_ffid)
       AND is_active
     LIMIT 1;
    IF v_member_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'ffid_no_esta_en_el_clan');
    END IF;

    SELECT (member_id = v_member_id) INTO v_ya_ligado
      FROM profiles WHERE id = v_profile_id;

    UPDATE profiles
       SET member_id    = v_member_id,
           is_member    = true,
           free_fire_id = v_ffid,
           display_name = COALESCE(v_nick, display_name),
           updated_at   = now()
     WHERE id = v_profile_id;

    -- Los puntos de bienvenida se dan UNA vez: al vincular por primera vez.
    -- Sin esto, cambiar el ID de ida y vuelta seria una maquina de Elite Coins.
    IF NOT COALESCE(v_ya_ligado, false)
       AND NOT EXISTS (SELECT 1 FROM point_events
                        WHERE profile_id = v_profile_id AND type = 'link') THEN
      PERFORM award_points(v_profile_id, 'link');
      v_premiado := true;
    END IF;
  END IF;

  IF v_wa IS NOT NULL THEN
    UPDATE profiles SET whatsapp = v_wa, updated_at = now()
     WHERE id = v_profile_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'premiado', v_premiado,
    'nickname', v_nick,
    'member_id', v_member_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION guardar_vinculacion(text, text) TO authenticated;

-- ---------- 4) vista para el BOT ----------
-- El bot lee de aqui los WhatsApp que la gente puso en la web, para poder
-- etiquetarlos en el grupo. Solo sale lo imprescindible: nada de correos ni
-- nada que el bot no necesite.
CREATE OR REPLACE VIEW clan_contactos AS
SELECT
  p.free_fire_id,
  p.whatsapp,
  p.discord_id,
  m.nickname,
  p.updated_at
FROM profiles p
JOIN members m ON m.id = p.member_id
WHERE p.free_fire_id IS NOT NULL
  AND p.whatsapp IS NOT NULL
  AND p.whatsapp <> '';

COMMENT ON VIEW clan_contactos IS
  'Lo que el bot del clan necesita para etiquetar a alguien: su ID de juego, su '
  'WhatsApp y su Discord, ya cruzados. La lee sync_clan.py con el service_role.';
