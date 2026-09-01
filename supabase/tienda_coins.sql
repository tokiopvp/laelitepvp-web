-- ============================================================
-- La Elite PvP · Venta de Elite Coins
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
-- ============================================================
--
-- QUE SE ESTA MONTANDO
-- --------------------
-- La Elite Coin se gana jugando, pero quien quiere saltarse la grindea la
-- compra. El pedido entra por la misma tabla `orders` que los diamantes y se
-- atiende en el mismo panel; la diferencia es la entrega: en vez de mandar
-- recarga por el juego, el boton "Entregar" acredita las coins en la cuenta
-- del comprador y cierra el pedido en UNA sola operacion.
--
-- DECISIONES
-- ----------
-- · El destinatario viaja en `orders.created_by` (la columna ya existia y
--   referencia profiles). Sin login no hay compra de coins: sin cuenta, no
--   habria donde abonar.
-- · El pack es un producto mas con `coins_entrega` en vez de
--   `diamonds_amount`: se edita el precio desde el panel sin tocar codigo.
-- · La entrega es una funcion con FOR UPDATE: dos clics seguidos no pueden
--   acreditar dos veces el mismo pedido.
-- ============================================================

-- Cuantas coins entrega el producto. NULL o 0 = no es un pack de coins.
ALTER TABLE products ADD COLUMN IF NOT EXISTS coins_entrega integer;

COMMENT ON COLUMN products.coins_entrega IS
  'Coins que acredita al aceptar el pedido. Solo packs de Elite Coin.';


-- ------------------------------------------------------------
-- Los cuatro packs. El DELETE previo hace la migracion idempotente:
-- correrla dos veces no duplica el catalogo.
--
-- gestion_web = true: sin la marca, el sync del bot los borraria en su
-- proxima pasada (solo reconcilia lo que el bot maneja).
-- ------------------------------------------------------------
DELETE FROM products WHERE coins_entrega IS NOT NULL;

INSERT INTO products (name, category, price_usd, coins_entrega, stock, discount_percent, is_active, is_featured, description, gestion_web)
VALUES
  ('20,000 Elite Coins',    'bundle',   5,   20000, -1, 0, true, false, 'Recarga de Elite Coin. Se acreditan en tu cuenta al confirmar el pago.', true),
  ('50,000 Elite Coins',    'bundle',  10,   50000, -1, 0, true, false, 'Recarga de Elite Coin. Se acreditan en tu cuenta al confirmar el pago.', true),
  ('300,000 Elite Coins',   'bundle',  50,  300000, -1, 0, true, false, 'Recarga de Elite Coin. Se acreditan en tu cuenta al confirmar el pago.', true),
  ('1,000,000 Elite Coins', 'bundle', 100, 1000000, -1, 0, true, true,  'Recarga de Elite Coin. Se acreditan en tu cuenta al confirmar el pago.', true);


-- ------------------------------------------------------------
-- Entregar: acredita las coins y cierra el pedido, todo o nada.
--
-- Un UPDATE manual + UPDATE aparte podria fallar a la mitad (coins sin
-- pedido cerrado o al reves). Aqui dentro una falla deshace los dos.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_entregar_coins_pedido(p_pedido uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol    text;
  v_quien  text;
  v_ped    orders%ROWTYPE;
  v_coins  bigint;
  v_nombre text;
  v_saldo  bigint;
BEGIN
  -- Mismo candado que admin_ajustar_saldo.
  SELECT role, COALESCE(display_name, username) INTO v_rol, v_quien
    FROM profiles WHERE id = auth.uid();
  IF v_rol IS NULL OR v_rol NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo el owner o un admin pueden entregar compras.');
  END IF;

  -- FOR UPDATE: dos entregas simultaneas del mismo pedido se ordenan, y la
  -- segunda encuentra el pedido ya cerrado.
  SELECT * INTO v_ped FROM orders WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese pedido no existe.');
  END IF;
  IF v_ped.status = 'delivered' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este pedido ya fue entregado.');
  END IF;
  IF v_ped.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este pedido esta cancelado.');
  END IF;
  IF v_ped.created_by IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El pedido no tiene cuenta ligada. Acredita a mano desde Economia.');
  END IF;

  SELECT coins_entrega INTO v_coins FROM products WHERE id = v_ped.product_id;
  IF v_coins IS NULL OR v_coins <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este pedido no es de Elite Coins.');
  END IF;

  v_coins := v_coins * GREATEST(COALESCE(v_ped.quantity, 1), 1);

  SELECT COALESCE(display_name, username) INTO v_nombre
    FROM profiles WHERE id = v_ped.created_by;
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La cuenta del comprador ya no existe.');
  END IF;

  UPDATE profiles
    SET points = points + v_coins, updated_at = now()
    WHERE id = v_ped.created_by
    RETURNING points INTO v_saldo;

  INSERT INTO point_events (profile_id, type, amount, motivo)
    VALUES (v_ped.created_by, 'admin', v_coins,
            format('Compra %s — entregada por %s', v_ped.order_number, COALESCE(v_quien, 'staff')));

  -- La recarga entra al mercado como cualquier otra entrada de coins.
  PERFORM market_push('compra', v_nombre, v_coins);

  UPDATE orders SET status = 'delivered', updated_at = now() WHERE id = p_pedido;

  RETURN jsonb_build_object(
    'ok', true,
    'coins', v_coins,
    'nombre', v_nombre,
    'saldo', v_saldo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_entregar_coins_pedido(uuid) TO authenticated;

-- Verificacion: deben salir los 4 packs.
SELECT name, price_usd, coins_entrega FROM products WHERE coins_entrega IS NOT NULL ORDER BY price_usd;
