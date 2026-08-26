-- ============================================================
-- La Elite PvP - Enriquecimiento de miembros + pagos + ajustes
-- Ejecuta este script UNA vez en Supabase > SQL Editor.
-- ============================================================

-- 1) Nuevas columnas en members (extraccion a prueba de futuro)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS stats_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kills integer,
  ADD COLUMN IF NOT EXISTS winrate numeric(6,2),
  ADD COLUMN IF NOT EXISTS kpp numeric(6,2),
  ADD COLUMN IF NOT EXISTS partidas integer,
  ADD COLUMN IF NOT EXISTS dano_partida numeric(10,2),
  ADD COLUMN IF NOT EXISTS headshot_tasa numeric(6,2),
  ADD COLUMN IF NOT EXISTS top10_tasa numeric(6,2),
  ADD COLUMN IF NOT EXISTS max_kills integer,
  ADD COLUMN IF NOT EXISTS revividas integer;

-- 2) Metodos de pago (administrables desde el panel)
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  country text NOT NULL DEFAULT 'ALL',
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO payment_methods (name, icon, country, position)
SELECT * FROM (VALUES
  ('Transferencia / PagoMóvil', '🇻🇪', 'VE', 1),
  ('Binance', '₿', 'ALL', 2),
  ('PayPal', '💳', 'ALL', 3),
  ('Zelle', '🏦', 'ALL', 4),
  ('Nequi', '🇨🇴', 'CO', 5)
) AS v(name, icon, country, position)
WHERE NOT EXISTS (SELECT 1 FROM payment_methods);

-- 3) Ajustes generales (numero de WhatsApp, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES ('whatsapp_number', '')
ON CONFLICT (key) DO NOTHING;

-- 4) RLS: payment_methods (lectura publica de habilitados, escritura staff)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_methods public read" ON payment_methods;
CREATE POLICY "payment_methods public read" ON payment_methods
  FOR SELECT USING (enabled = true);
DROP POLICY IF EXISTS "payment_methods staff write" ON payment_methods;
CREATE POLICY "payment_methods staff write" ON payment_methods
  FOR ALL USING ((auth.jwt() ->> 'role') IN ('owner','admin','moderator','editor'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('owner','admin','moderator','editor'));

-- 5) RLS: settings (lectura publica, escritura staff)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings public read" ON settings;
CREATE POLICY "settings public read" ON settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings staff write" ON settings;
CREATE POLICY "settings staff write" ON settings
  FOR ALL USING ((auth.jwt() ->> 'role') IN ('owner','admin','moderator','editor'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('owner','admin','moderator','editor'));

-- ============================================================
-- 6) Perfil de miembro: puntos y vinculacion
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_fire_id text,
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin timestamptz,
  ADD COLUMN IF NOT EXISTS is_member boolean NOT NULL DEFAULT false;

-- 7) Eventos de puntos (auditoria; insercion solo via RPC SECURITY DEFINER)
CREATE TABLE IF NOT EXISTS point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('checkin','link')),
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_events_profile ON point_events(profile_id, created_at);

CREATE POLICY IF NOT EXISTS "point_events self read" ON point_events
  FOR SELECT USING (
    auth.uid() = profile_id OR
    (auth.jwt() ->> 'role') IN ('owner','admin','moderator','editor')
  );

-- 8) El usuario solo inserta su propio perfil; las mutaciones de puntos van por RPC
DROP POLICY IF EXISTS "profiles self insert" ON profiles;
CREATE POLICY "profiles self insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 9) Funciones RPC seguras (no se pueden falsear puntos desde el cliente)
CREATE OR REPLACE FUNCTION award_points(p_profile_id uuid, p_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount integer := 0;
  v_today timestamptz := date_trunc('day', now());
  v_points integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_type = 'checkin' THEN
    IF EXISTS (SELECT 1 FROM point_events WHERE profile_id = p_profile_id AND type = 'checkin' AND created_at >= v_today) THEN
      SELECT points INTO v_points FROM profiles WHERE id = p_profile_id;
      RETURN v_points;
    END IF;
    v_amount := 10;
  ELSIF p_type = 'link' THEN
    IF EXISTS (SELECT 1 FROM point_events WHERE profile_id = p_profile_id AND type = 'link') THEN
      SELECT points INTO v_points FROM profiles WHERE id = p_profile_id;
      RETURN v_points;
    END IF;
    v_amount := 20;
  ELSE
    RAISE EXCEPTION 'Tipo no valido';
  END IF;
  INSERT INTO point_events (profile_id, type, amount) VALUES (p_profile_id, p_type, v_amount);
  UPDATE profiles SET points = COALESCE(points,0) + v_amount, updated_at = now() WHERE id = p_profile_id RETURNING points INTO v_points;
  IF p_type = 'checkin' THEN
    UPDATE profiles SET last_checkin = now() WHERE id = p_profile_id;
  END IF;
  RETURN v_points;
END;
$$;

CREATE OR REPLACE FUNCTION link_member(p_ffid text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_member_id uuid;
  v_nick text;
  v_linked boolean := false;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT id, nickname INTO v_member_id, v_nick
    FROM members WHERE lower(free_fire_id) = lower(trim(p_ffid)) LIMIT 1;
  IF v_member_id IS NOT NULL THEN
    UPDATE profiles
      SET member_id = v_member_id,
          is_member = true,
          free_fire_id = trim(p_ffid),
          display_name = COALESCE(v_nick, display_name),
          updated_at = now()
      WHERE id = v_profile_id;
    PERFORM award_points(v_profile_id, 'link');
    v_linked := true;
  END IF;
  RETURN v_linked;
END;
$$;

GRANT EXECUTE ON FUNCTION award_points(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION link_member(text) TO authenticated, anon;
