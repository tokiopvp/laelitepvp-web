-- Limites de apuesta: minimo 10, sin techo.
--
-- El maximo se quita poniendolo tan alto que ninguna partida real lo alcanza.
-- No se elimina la comprobacion: un limite numerico enorme sigue atrapando un
-- error de tecleo (alguien que escribe 100000000 queriendo 100.000), mientras
-- que quitarla del todo dejaria pasar cualquier cosa.
UPDATE settings SET value = '10'             WHERE key = 'apuestas.min';
UPDATE settings SET value = '999999999999'   WHERE key = 'apuestas.max';

SELECT key, value FROM settings WHERE key LIKE 'apuestas.%' ORDER BY key;

-- Sala de voz del duelo: se guarda su id para poder cerrarla al terminar.
ALTER TABLE bets ADD COLUMN IF NOT EXISTS voz_id text;
