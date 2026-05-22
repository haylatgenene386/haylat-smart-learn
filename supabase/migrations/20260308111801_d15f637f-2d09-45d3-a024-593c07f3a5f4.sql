-- Drop restrictive policies and recreate as permissive for admin access

-- exam_attempts: Allow admins to view all
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.exam_attempts;
CREATE POLICY "Admins can view all attempts" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- quiz_results: Allow admins to view all
DROP POLICY IF EXISTS "Admins can view all quiz results" ON public.quiz_results;
CREATE POLICY "Admins can view all quiz results" ON public.quiz_results
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- profiles: Allow admins to view all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- exam_answers: Allow admins to view all
DROP POLICY IF EXISTS "Admins can view all answers" ON public.exam_answers;
CREATE POLICY "Admins can view all answers" ON public.exam_answers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- user_roles: Allow admins to read roles for display
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );