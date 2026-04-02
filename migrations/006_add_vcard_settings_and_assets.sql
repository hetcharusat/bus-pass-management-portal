-- Persist V-card designer settings and background assets

CREATE TABLE IF NOT EXISTS vcard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE vcard_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read vcard_settings" ON vcard_settings;
DROP POLICY IF EXISTS "Allow public insert vcard_settings" ON vcard_settings;
DROP POLICY IF EXISTS "Allow public update vcard_settings" ON vcard_settings;
DROP POLICY IF EXISTS "Allow public delete vcard_settings" ON vcard_settings;

CREATE POLICY "Allow public read vcard_settings"
ON vcard_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert vcard_settings"
ON vcard_settings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update vcard_settings"
ON vcard_settings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete vcard_settings"
ON vcard_settings
FOR DELETE
TO anon, authenticated
USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('vcard-assets', 'vcard-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read vcard assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert vcard assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update vcard assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete vcard assets" ON storage.objects;

CREATE POLICY "Allow public read vcard assets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'vcard-assets');

CREATE POLICY "Allow public insert vcard assets"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'vcard-assets');

CREATE POLICY "Allow public update vcard assets"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'vcard-assets')
WITH CHECK (bucket_id = 'vcard-assets');

CREATE POLICY "Allow public delete vcard assets"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'vcard-assets');
