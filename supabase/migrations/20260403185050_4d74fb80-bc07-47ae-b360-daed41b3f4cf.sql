
-- 1. Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for branches
CREATE POLICY "Anyone authenticated can read active branches"
  ON public.branches FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'global_super_admin'));

CREATE POLICY "Global and super admins can manage branches"
  ON public.branches FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'global_super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'global_super_admin'));

-- 4. Add branch_id to all existing tables (nullable for backward compatibility)
ALTER TABLE public.profiles ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.chapters ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.materials ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.questions ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.exams ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.exam_questions ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.exam_attempts ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.exam_answers ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.quiz_results ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.chat_messages ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 5. Create indexes for branch_id on key tables
CREATE INDEX idx_profiles_branch ON public.profiles(branch_id);
CREATE INDEX idx_courses_branch ON public.courses(branch_id);
CREATE INDEX idx_exams_branch ON public.exams(branch_id);
CREATE INDEX idx_questions_branch ON public.questions(branch_id);
CREATE INDEX idx_lessons_branch ON public.lessons(branch_id);

-- 6. Security definer function to check branch membership
CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 7. Check if user is branch admin for a specific branch
CREATE OR REPLACE FUNCTION public.is_branch_admin(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('branch_admin', 'branch_super_admin')
  ) AND (
    SELECT branch_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
  ) = _branch_id
$$;
