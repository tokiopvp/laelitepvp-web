-- ============================================================
-- La Elite PvP · Refuerzo de seguridad y privacidad
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) LOS IDENTIFICADORES DE LA GENTE DEJAN DE SER PUBLICOS
--
-- `profiles` tiene que poder leerse sin sesion: de ahi sale el ranking, que es
-- lo primero que ve alguien que llega. Pero se estaba sirviendo la fila ENTERA,
-- y ahi van dos datos que no pinta nadie en pantalla:
--
--   · discord_id   -> con la lista completa se puede acosar o suplantar a
--                     cualquiera de tus jugadores por privado.
--   · free_fire_id -> es el identificador con el que se recarga una cuenta.
--
-- Bastaba una peticion para descargarlos todos.
--
-- RLS filtra FILAS, no columnas, asi que la herramienta correcta aqui son los
-- permisos por columna: se le quita a `anon` el acceso a esas dos y se le deja
-- el resto. El ranking sigue funcionando igual; quien inicia sesion sigue
-- viendo lo suyo porque para eso esta el rol `authenticated`.
-- ============================================================
REVOKE SELECT ON profiles FROM anon;
GRANT SELECT (
  id, username, display_name, avatar_url, role, bio,
  points, last_checkin, is_member, member_id, created_at, updated_at
) ON profiles TO anon;

-- Quien ha iniciado sesion sigue leyendo su propia fila completa; de eso se
-- encarga la politica de RLS, no los permisos de columna.
GRANT SELECT ON profiles TO authenticated;

-- ============================================================
-- 2) LA COCINA DEL MERCADO DEJA DE VERSE
--
-- `settings` era de lectura publica ENTERA. Entre las claves estaban
-- `eco.mercado_deriva`, `eco.mercado_barron_prob` y `eco.mercado_barron_fuerza`:
-- con eso cualquiera deduce en dos minutos que el mercado esta simulado, con
-- que sesgo, y que la cuenta que mas coins tiene es la que lo mueve. Se habia
-- puesto cuidado en que Bruce Wayne no se delatara en la cinta de operaciones
-- y luego el truco entero estaba a una peticion de distancia.
--
-- La web solo necesita leer sin sesion cuatro cosas: el numero de WhatsApp, las
-- tasas de cambio, los metodos de pago y las filtraciones. El resto pasa a ser
-- de staff.
-- ============================================================
DROP POLICY IF EXISTS "settings public read" ON settings;
CREATE POLICY "settings public read" ON settings
  FOR SELECT USING (
    key IN ('whatsapp_number', 'rates_json', 'pagos_json', 'leaks_json')
    -- El rol se mira en `profiles`, NO en el token.
    --
    -- Varias politicas del proyecto usan `auth.jwt() ->> 'role'`, y eso no
    -- funciona: ese campo del token de Supabase vale 'authenticated' o 'anon',
    -- nunca 'owner' ni 'admin'. Esas comprobaciones no han coincidido nunca.
    -- Aqui se consulta la tabla, que es donde vive el rol de verdad.
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('owner', 'admin', 'moderator', 'editor')
    )
  );

-- Mismo fallo en la escritura de ajustes y metodos de pago: con la
-- comprobacion rota, el panel no podia guardar. Se corrigen las dos.
DROP POLICY IF EXISTS "settings staff write" ON settings;
CREATE POLICY "settings staff write" ON settings
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
  ) WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
  );

DROP POLICY IF EXISTS "payment_methods staff write" ON payment_methods;
CREATE POLICY "payment_methods staff write" ON payment_methods
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
  ) WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
  );

-- Las funciones del mercado leen los ajustes por dentro con `eco_num`, que es
-- SECURITY DEFINER: sigue viendo todo aunque quien la llame no pueda.
-- Sin esto, cerrar `settings` habria roto el grafico.

-- ============================================================
-- 3) LAS APUESTAS NO ENSEÑAN QUIEN ES QUIEN
--
-- `bets` es de lectura publica para que la pagina muestre los duelos en vivo,
-- pero la fila lleva los identificadores de Discord de los dos jugadores. Para
-- pintar "Fulano vs Mengano" basta con los nombres.
-- ============================================================
REVOKE SELECT ON bets FROM anon;
GRANT SELECT (
  id, creador_nombre, rival_nombre, monto, estado,
  ganador_id, creador_id, rival_id, created_at, aceptada_en, resuelta_en
) ON bets TO anon;
GRANT SELECT ON bets TO authenticated;

-- ============================================================
-- 4) FRENO A LAS SOLICITUDES REPETIDAS
--
-- Cualquiera puede crear una solicitud -tiene que poder, es un formulario
-- publico- y cada una dispara un aviso al telefono. Sin freno, un script llena
-- la tabla y el chat.
--
-- El indice unico parcial es la forma barata de impedirlo: la base rechaza una
-- segunda solicitud del MISMO ID de Free Fire mientras la primera siga
-- pendiente. No hace falta contar nada ni guardar estado.
-- ============================================================
-- Antes hay que limpiar los duplicados que ya existen, o el indice no se puede
-- crear. Se conserva la solicitud MAS RECIENTE de cada ID, que es la que lleva
-- los datos mejores (las repetidas salieron de gente pulsando dos veces porque
-- no veia confirmacion clara).
DELETE FROM applications a
 USING applications b
 WHERE a.status = 'pending'
   AND b.status = 'pending'
   AND a.free_fire_id = b.free_fire_id
   AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_una_pendiente
  ON applications (free_fire_id)
  WHERE status = 'pending';

-- ============================================================
-- 5) COMPROBACION
-- ============================================================
SELECT 'profiles: columnas visibles para anon' AS control,
       string_agg(column_name, ', ' ORDER BY column_name) AS columnas
  FROM information_schema.column_privileges
 WHERE grantee = 'anon' AND table_name = 'profiles' AND privilege_type = 'SELECT';

SELECT 'settings: claves publicas' AS control,
       string_agg(key, ', ') AS claves
  FROM settings
 WHERE key IN ('whatsapp_number', 'rates_json', 'pagos_json', 'leaks_json');
