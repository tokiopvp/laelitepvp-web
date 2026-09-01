-- ============================================================
-- La Elite PvP · Enseñar u ocultar la cuenta grande en el top
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
-- ============================================================
--
-- POR QUE UN INTERRUPTOR Y NO BORRARLA DEL TOP A MANO
-- ---------------------------------------------------
-- La cuenta grande tiene dos trabajos que se estorban:
--
--   · Mover el mercado. Para eso hace falta que exista y tenga saldo, y eso no
--     depende de que se vea en ningun sitio.
--   · Marcar el techo del ranking. Ahi si se ve, y es lo que hace que los
--     millones parezcan alcanzables por alguien.
--
-- Hay dias en que lo segundo estorba: un top donde el numero uno tiene veinte
-- veces mas que el segundo desanima en vez de motivar, sobre todo justo
-- despues de recalibrar la economia. Con el interruptor se puede quitar del
-- ranking sin tocar el saldo ni parar el mercado, y devolverla cuando
-- convenga.
--
-- Vale la pena que sea una columna y no un ajuste de `settings`: es un dato de
-- la cuenta, y asi se lee en la misma consulta que ya trae el nombre y el
-- saldo, sin una peticion mas.
-- ============================================================

ALTER TABLE house_account
  ADD COLUMN IF NOT EXISTS visible_top boolean NOT NULL DEFAULT true;

-- La lectura de `house_account` ya era publica -el top la necesita-, asi que
-- no hay politica nueva que escribir. Escribir sigue siendo solo de
-- owner/admin por la politica "house staff" que ya existe.
--
-- Ojo con una cosa: ocultarla del top NO la esconde del grafico. Las
-- operaciones de la casa ya salian ahi con billetera anonima -esa es la
-- gracia, que no se note quien mueve el mercado-, asi que el grafico sigue
-- igual se ponga como se ponga este interruptor.

SELECT id, nombre, coins, visible_top FROM house_account;
