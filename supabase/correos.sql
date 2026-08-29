-- ============================================================
-- La Elite PvP · Sacar los correos del campo publico
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================
--
-- QUE PASABA
-- ----------
-- `profiles.username` es de lectura publica: la web lo usa como nombre de
-- respaldo cuando alguien no tiene `display_name`. Pero el disparador que crea
-- el perfil al registrarse hacia esto:
--
--   username = COALESCE(raw_user_meta_data->>'username', NEW.email)
--
-- Y Discord no siempre manda `username` en los metadatos, asi que el respaldo
-- se aplicaba casi siempre: los 22 perfiles tenian el CORREO ELECTRONICO ahi.
-- Una sola peticion sin sesion bastaba para descargarlos todos.
--
-- Es la fuga mas seria de las encontradas: un correo vale para intentar entrar
-- en otras cuentas, para phishing dirigido -"soy del clan, confirma tu
-- contraseña"- y se vende en listas. Los Discord ID que ya se cerraron eran
-- menos graves que esto.
--
-- LA SOLUCION
-- -----------
-- Un nombre de usuario es publico por diseño; un correo no. Asi que se
-- sustituye el correo por algo que si se pueda enseñar, en vez de esconder la
-- columna: la web necesita ese respaldo para no acabar pintando "Jugador" en
-- media tabla del ranking.
-- ============================================================

-- ------------------------------------------------------------
-- 1) LIMPIAR LO QUE YA ESTA GUARDADO
--
-- Se prefiere el nombre visible de Discord. Si tampoco lo hay, se usa la parte
-- del correo ANTERIOR a la arroba: identifica a la persona lo justo para el
-- ranking y ya no es una direccion valida a la que escribir.
-- ------------------------------------------------------------
UPDATE profiles p
   SET username = COALESCE(
         NULLIF(p.display_name, ''),
         NULLIF(split_part(p.username, '@', 1), ''),
         'jugador-' || substr(p.id::text, 1, 8)
       )
 WHERE p.username LIKE '%@%';

-- Si al recortar quedaron nombres repetidos, la columna es UNIQUE y hay que
-- desempatar. Se añade un sufijo corto del id, que es estable.
UPDATE profiles p
   SET username = p.username || '-' || substr(p.id::text, 1, 4)
 WHERE EXISTS (
   SELECT 1 FROM profiles q
    WHERE q.username = p.username AND q.id <> p.id
 );

-- ------------------------------------------------------------
-- 2) QUE NO VUELVA A PASAR
--
-- El disparador deja de usar el correo como respaldo. El orden de preferencia
-- es: nombre de usuario de Discord, nombre visible, y como ultimo recurso un
-- identificador anonimo. El correo NO entra en la lista.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre text;
  v_visible text;
BEGIN
  v_visible := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'user_name', '')
  );

  v_nombre := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'user_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'preferred_username', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    v_visible,
    -- Ultimo recurso: nunca el correo.
    'jugador-' || substr(NEW.id::text, 1, 8)
  );

  -- `username` es UNIQUE. Si el nombre de Discord ya lo tiene otra persona, se
  -- desempata con el id en vez de dejar que falle el registro entero: quedarse
  -- sin poder entrar porque alguien se llama igual seria absurdo.
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_nombre) THEN
    v_nombre := v_nombre || '-' || substr(NEW.id::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, v_nombre, COALESCE(v_visible, v_nombre));
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 3) COMPROBACION
-- ------------------------------------------------------------
SELECT
  count(*) FILTER (WHERE username LIKE '%@%') AS con_correo_visible,
  count(*)                                    AS perfiles_totales
FROM profiles;
