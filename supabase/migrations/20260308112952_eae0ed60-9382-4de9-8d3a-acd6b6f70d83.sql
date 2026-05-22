-- Add student_id column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE;

-- Create a sequence for student numbers
CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1;

-- Function to generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_student_id TEXT;
BEGIN
  -- Get next sequence value
  SELECT nextval('student_id_seq') INTO next_num;
  
  -- Format as HSP/0001, HSP/0002, etc.
  new_student_id := 'HSP/' || LPAD(next_num::TEXT, 4, '0');
  
  -- Set the student_id
  NEW.student_id := new_student_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate student_id on insert
DROP TRIGGER IF EXISTS generate_student_id_trigger ON public.profiles;
CREATE TRIGGER generate_student_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.student_id IS NULL)
  EXECUTE FUNCTION public.generate_student_id();

-- Update existing profiles with student IDs
DO $$
DECLARE
  profile_record RECORD;
  next_num INTEGER;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles WHERE student_id IS NULL ORDER BY created_at
  LOOP
    SELECT nextval('student_id_seq') INTO next_num;
    UPDATE public.profiles 
    SET student_id = 'HSP/' || LPAD(next_num::TEXT, 4, '0')
    WHERE id = profile_record.id;
  END LOOP;
END;
$$;