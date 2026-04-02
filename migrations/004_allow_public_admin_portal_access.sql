-- This project currently uses an open admin portal (no auth login).
-- Allow both anon and authenticated roles for students and bus_stops.

-- students policies
DROP POLICY IF EXISTS "Allow authenticated users to read students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to insert students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to update students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to delete students" ON students;
DROP POLICY IF EXISTS "Allow full access for authenticated users on students" ON students;

CREATE POLICY "Allow public read students"
ON students
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert students"
ON students
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update students"
ON students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete students"
ON students
FOR DELETE
TO anon, authenticated
USING (true);

-- bus_stops policies
DROP POLICY IF EXISTS "Allow full access for authenticated users on bus_stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to view bus stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to insert bus stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to delete bus stops" ON bus_stops;

CREATE POLICY "Allow public read bus_stops"
ON bus_stops
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert bus_stops"
ON bus_stops
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update bus_stops"
ON bus_stops
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete bus_stops"
ON bus_stops
FOR DELETE
TO anon, authenticated
USING (true);

-- storage policy for optional image upload without auth login
DROP POLICY IF EXISTS "Allow authenticated users to upload student images" ON storage.objects;

CREATE POLICY "Allow public upload student images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'student-images');
