-- Lock down previously open/public policies for production deployment.
-- This migration requires users to be authenticated to read or mutate data.

-- students table
DROP POLICY IF EXISTS "Allow public read students" ON students;
DROP POLICY IF EXISTS "Allow public insert students" ON students;
DROP POLICY IF EXISTS "Allow public update students" ON students;
DROP POLICY IF EXISTS "Allow public delete students" ON students;

DROP POLICY IF EXISTS "Allow authenticated users to read students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to insert students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to update students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to delete students" ON students;

CREATE POLICY "Allow authenticated read students"
ON students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert students"
ON students
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update students"
ON students
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete students"
ON students
FOR DELETE
TO authenticated
USING (true);

-- bus_stops table
DROP POLICY IF EXISTS "Allow public read bus_stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow public insert bus_stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow public update bus_stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow public delete bus_stops" ON bus_stops;

DROP POLICY IF EXISTS "Allow authenticated users to view bus stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to insert bus stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to delete bus stops" ON bus_stops;

CREATE POLICY "Allow authenticated read bus_stops"
ON bus_stops
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert bus_stops"
ON bus_stops
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update bus_stops"
ON bus_stops
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete bus_stops"
ON bus_stops
FOR DELETE
TO authenticated
USING (true);

-- vcard_settings table
DROP POLICY IF EXISTS "Allow public read vcard_settings" ON vcard_settings;
DROP POLICY IF EXISTS "Allow public insert vcard_settings" ON vcard_settings;
DROP POLICY IF EXISTS "Allow public update vcard_settings" ON vcard_settings;
DROP POLICY IF EXISTS "Allow public delete vcard_settings" ON vcard_settings;

CREATE POLICY "Allow authenticated read vcard_settings"
ON vcard_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert vcard_settings"
ON vcard_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update vcard_settings"
ON vcard_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete vcard_settings"
ON vcard_settings
FOR DELETE
TO authenticated
USING (true);

-- storage: student-images bucket
DROP POLICY IF EXISTS "Allow public upload student images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload student images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to student images" ON storage.objects;

CREATE POLICY "Allow authenticated read student images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-images');

CREATE POLICY "Allow authenticated upload student images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-images');

CREATE POLICY "Allow authenticated update student images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'student-images')
WITH CHECK (bucket_id = 'student-images');

CREATE POLICY "Allow authenticated delete student images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'student-images');

-- storage: vcard-assets bucket
DROP POLICY IF EXISTS "Allow public read vcard assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert vcard assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update vcard assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete vcard assets" ON storage.objects;

CREATE POLICY "Allow authenticated read vcard assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'vcard-assets');

CREATE POLICY "Allow authenticated insert vcard assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vcard-assets');

CREATE POLICY "Allow authenticated update vcard assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vcard-assets')
WITH CHECK (bucket_id = 'vcard-assets');

CREATE POLICY "Allow authenticated delete vcard assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'vcard-assets');
