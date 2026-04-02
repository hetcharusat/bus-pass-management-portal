
-- Add a new table for bus stops
CREATE TABLE bus_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for the bus_stops table
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view bus stops"
ON bus_stops
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert bus stops"
ON bus_stops
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete bus stops"
ON bus_stops
FOR DELETE
TO authenticated
USING (true);

-- Add a new column to the students table for the fee payment date
ALTER TABLE students
ADD COLUMN fees_paid_at DATE;
