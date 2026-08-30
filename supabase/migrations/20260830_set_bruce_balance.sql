-- Actualizar saldo de Bruce Wayne (unlimitedreal) a 8 millones
UPDATE profiles 
SET points = 8000000, 
    display_name = 'bruce wayne',
    updated_at = now()
WHERE discord_id = '669e4a7b-30dc-42b7-92c9-728fd67c3690';

-- Si no existe, crearlo
INSERT INTO profiles (id, username, discord_id, points, display_name)
SELECT '669e4a7b-30dc-42b7-92c9-728fd67c3690'::uuid, 
       'unlimitedreal', 
       '669e4a7b-30dc-42b7-92c9-728fd67c3690', 
       8000000, 
       'bruce wayne'
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE discord_id = '669e4a7b-30dc-42b7-92c9-728fd67c3690'
);
