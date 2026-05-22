-- Create instructor_invitations table for email invitations
CREATE TABLE public.instructor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days')
);

-- Create instructor_courses junction table
CREATE TABLE public.instructor_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL,
  UNIQUE(instructor_id, course_id)
);

-- Add approval_status column to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'declined', 'revision'));

-- Add submitted_by to track which instructor submitted
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- Add decline_reason for feedback when declined
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS decline_reason text;

-- Enable RLS on new tables
ALTER TABLE public.instructor_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_courses ENABLE ROW LEVEL SECURITY;

-- RLS for instructor_invitations
CREATE POLICY "Super admins can manage invitations"
ON public.instructor_invitations FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can read invitation by token"
ON public.instructor_invitations FOR SELECT
USING (true);

-- RLS for instructor_courses
CREATE POLICY "Admins can view instructor courses"
ON public.instructor_courses FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage instructor courses"
ON public.instructor_courses FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Instructors can view own assignments"
ON public.instructor_courses FOR SELECT
USING (auth.uid() = instructor_id);

-- Update questions RLS to allow instructors
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

CREATE POLICY "Admins can manage all questions"
ON public.questions FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Instructors can manage own questions"
ON public.questions FOR ALL
USING (
  has_role(auth.uid(), 'instructor') AND 
  (submitted_by = auth.uid() OR submitted_by IS NULL)
)
WITH CHECK (
  has_role(auth.uid(), 'instructor') AND 
  submitted_by = auth.uid()
);

-- Update materials RLS to allow instructors for their courses
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;

CREATE POLICY "Admins can manage materials"
ON public.materials FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Instructors can manage materials for their courses"
ON public.materials FOR ALL
USING (
  has_role(auth.uid(), 'instructor') AND 
  EXISTS (
    SELECT 1 FROM public.instructor_courses ic 
    WHERE ic.instructor_id = auth.uid() AND ic.course_id = materials.course_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'instructor') AND 
  EXISTS (
    SELECT 1 FROM public.instructor_courses ic 
    WHERE ic.instructor_id = auth.uid() AND ic.course_id = materials.course_id
  )
);

-- Function to check if user is instructor for a course
CREATE OR REPLACE FUNCTION public.is_instructor_for_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_courses
    WHERE instructor_id = _user_id AND course_id = _course_id
  )
$$;

-- Function to check if user has instructor role
CREATE OR REPLACE FUNCTION public.is_instructor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'instructor'
  )
$$;