-- Drop the existing restrictive RLS policies for the 'students' table.
DROP POLICY IF EXISTS "Allow authenticated users to manage their own data" ON students;

-- Create a new, permissive policy that allows any authenticated user (i.e., the admin)
-- to perform any action (SELECT, INSERT, UPDATE, DELETE) on the 'students' table.
CREATE POLICY "Allow full access for authenticated users on students"
ON students
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Drop the existing RLS policies for the 'bus_stops' table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow authenticated users to view bus stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to insert bus stops" ON bus_stops;
DROP POLICY IF EXISTS "Allow authenticated users to delete bus stops" ON bus_stops;

-- Create a new, permissive policy that allows any authenticated user (the admin)
-- to perform any action on the 'bus_stops' table.
CREATE POLICY "Allow full access for authenticated users on bus_stops"
ON bus_stops
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
