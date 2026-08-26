-- ============================================
-- La Elite PvP - Storage Buckets
-- Run AFTER schema.sql
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('outfits', 'outfits', true),
  ('evidence', 'evidence', true),
  ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on buckets
CREATE POLICY "avatar_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "outfit_public" ON storage.objects FOR SELECT USING (bucket_id = 'outfits');
CREATE POLICY "evidence_public" ON storage.objects FOR SELECT USING (bucket_id = 'evidence');
CREATE POLICY "product_public" ON storage.objects FOR SELECT USING (bucket_id = 'products');

-- Authenticated write
CREATE POLICY "avatar_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid() IS NOT NULL
);
CREATE POLICY "outfit_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'outfits' AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator'))
);
CREATE POLICY "evidence_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'evidence' AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator'))
);
CREATE POLICY "product_write" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'products' AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','editor'))
);
