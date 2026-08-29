-- ============================================================
-- La Elite PvP · WhatsApp en las postulaciones
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================

-- Lo que decide si alguien entra al clan es que le contesten PRONTO: una
-- solicitud respondida al dia siguiente ya se fue a otro clan. Discord era
-- opcional y muchos lo dejaban vacio o escribian un usuario mal, asi que no
-- habia por donde localizarlos.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS whatsapp text;

COMMENT ON COLUMN applications.whatsapp IS
  'Telefono en formato internacional. Es la via real de contacto: el aviso de '
  'Telegram trae un boton wa.me con este numero.';
