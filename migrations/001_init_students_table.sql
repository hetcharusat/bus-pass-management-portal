-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  student_id TEXT NOT NULL UNIQUE,
  contact_no TEXT NOT NULL,
  bus_stop TEXT NOT NULL,
  fees_paid BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy 1: Allow authenticated users to read all students
CREATE POLICY "Allow authenticated users to read students"
  ON students FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to insert students
CREATE POLICY "Allow authenticated users to insert students"
  ON students FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users to update students
CREATE POLICY "Allow authenticated users to update students"
  ON students FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to delete students
CREATE POLICY "Allow authenticated users to delete students"
  ON students FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create storage bucket for student images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('student-images', 'student-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Create storage policy for uploads
CREATE POLICY "Allow authenticated users to upload student images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-images' 
    AND auth.role() = 'authenticated'
  );

-- Create storage policy for reads
CREATE POLICY "Allow public read access to student images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-images');

-- Create index for faster queries
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_created_at ON students(created_at);
