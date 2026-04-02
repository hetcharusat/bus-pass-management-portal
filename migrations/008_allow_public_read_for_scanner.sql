-- Keep portal write operations secure while allowing scanner app to open without login.
-- This grants anon/public READ ONLY access for scanner-required resources.

-- students: allow anon read
DROP POLICY IF EXISTS "Allow public read students" ON students;
CREATE POLICY "Allow public read students"
ON students
FOR SELECT
TO anon, authenticated
USING (true);

-- student-images storage: allow anon read (for student photo display)
DROP POLICY IF EXISTS "Allow public read access to student images" ON storage.objects;
CREATE POLICY "Allow public read access to student images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'student-images');
