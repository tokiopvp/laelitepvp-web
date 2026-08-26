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
