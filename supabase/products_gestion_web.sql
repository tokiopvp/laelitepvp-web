-- ============================================================
-- La Elite PvP · Lo que se crea en la web no lo toca el sync
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
-- ============================================================
--
-- EL PROBLEMA
-- -----------
-- El sync del bot sube el inventario de diamantes cada minuto y borra lo que
-- no este en el: esa es su manera de retirar un pack que se quita del bot.
-- Pero la web tiene productos que NO vienen del bot (los packs de Elite
-- Coin, los packs grandes de diamantes) y el sync se los llevaba por delante:
-- la tienda de coins aparecia y desaparecia.
--
-- LA MARCA
-- --------
-- `gestion_web = true` dice "esto lo administra el panel, no el bot". El sync
-- solo reconcilia (borra) filas con la marca apagada, asi que nada de lo que
-- se cree en admin/productos vuelve a desaparecer.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS gestion_web boolean NOT NULL DEFAULT false;

-- Los packs de Elite Coin ya existentes pasan a ser de la web.
UPDATE products SET gestion_web = true WHERE coins_entrega IS NOT NULL;

-- Verificacion: los coins y los packs grandes deben salir marcados.
SELECT name, coins_entrega, gestion_web FROM products ORDER BY price_usd;
