-- Renombrar co-leader a interim_leader en la base de datos
UPDATE members SET role_in_clan = 'interim_leader' WHERE role_in_clan = 'co-leader';

-- Actualizar la constraint CHECK
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_in_clan_check;
ALTER TABLE members ADD CONSTRAINT members_role_in_clan_check 
  CHECK (role_in_clan IN ('leader','interim_leader','elder','member'));
