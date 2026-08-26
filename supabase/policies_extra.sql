-- ============================================
-- La Elite PvP - Politicas extra (Store + Actividad)
-- Pegar y ejecutar en Supabase Dashboard > SQL Editor > Run.
-- Permite a los CLIENTES (anon) crear pedidos y registrar actividad,
-- y a los ADMINS (owner/admin/moderator/editor) verlos.
-- El service_role NO se usa en el navegador.
-- ============================================

-- Pedidos: cualquiera puede crear (cliente)
DROP POLICY IF EXISTS "orders_public_insert" ON orders;
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (true);

-- Pedidos: admins pueden actualizar estado
DROP POLICY IF EXISTS "orders_update_roles" ON orders;
CREATE POLICY "orders_update_roles" ON orders
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor')));

-- Actividad: cualquiera puede insertar (registro de entradas/compras)
DROP POLICY IF EXISTS "activity_public_insert" ON activity_logs;
CREATE POLICY "activity_public_insert" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- Actividad: admins pueden leer
DROP POLICY IF EXISTS "activity_select_roles" ON activity_logs;
CREATE POLICY "activity_select_roles" ON activity_logs
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor')));
