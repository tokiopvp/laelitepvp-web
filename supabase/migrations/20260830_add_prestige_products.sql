-- Agregar 3 productos de alta gama a PagoStore
INSERT INTO products (name, category, diamonds_amount, price_usd, discount_percent, is_featured, is_active, description)
VALUES
  ('50k Diamantes', 'diamonds', 50000, 325.00, 0, false, true, 'Paquete premium de 50,000 diamantes'),
  ('100k Diamantes', 'diamonds', 100000, 650.00, 5, true, true, 'Paquete elite de 100,000 diamantes con 5% descuento'),
  ('1M Diamantes', 'diamonds', 1000000, 6000.00, 10, true, true, 'Paquete legendario de 1,000,000 de diamantes con 10% descuento');
