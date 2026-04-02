-- Add bus number as an integer field on students.
ALTER TABLE students
ADD COLUMN IF NOT EXISTS bus_no INTEGER;
