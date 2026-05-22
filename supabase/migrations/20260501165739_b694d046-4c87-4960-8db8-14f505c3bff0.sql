
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS grade_target integer;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS grade_target integer;
