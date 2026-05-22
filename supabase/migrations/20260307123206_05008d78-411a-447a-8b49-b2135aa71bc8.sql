
-- Fix all RLS policies to be PERMISSIVE instead of RESTRICTIVE

-- exam_attempts
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Students can manage own attempts" ON public.exam_attempts;

CREATE POLICY "Admins can view all attempts" ON public.exam_attempts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can manage own attempts" ON public.exam_attempts
  FOR ALL TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- exam_answers
DROP POLICY IF EXISTS "Admins can view all answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Students can manage own answers" ON public.exam_answers;

CREATE POLICY "Admins can view all answers" ON public.exam_answers
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can manage own answers" ON public.exam_answers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM exam_attempts WHERE exam_attempts.id = exam_answers.attempt_id AND exam_attempts.student_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM exam_attempts WHERE exam_attempts.id = exam_answers.attempt_id AND exam_attempts.student_id = auth.uid())
  );

-- quiz_results
DROP POLICY IF EXISTS "Admins can view all quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.quiz_results;
DROP POLICY IF EXISTS "Users can view own results" ON public.quiz_results;

CREATE POLICY "Admins can view all quiz results" ON public.quiz_results
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can insert own results" ON public.quiz_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own results" ON public.quiz_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Super admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- exams
DROP POLICY IF EXISTS "Admins can manage exams" ON public.exams;
DROP POLICY IF EXISTS "Students can read active exams" ON public.exams;

CREATE POLICY "Admins can manage exams" ON public.exams
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can read active exams" ON public.exams
  FOR SELECT TO authenticated USING (is_active = true);

-- courses
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone authenticated can read published courses" ON public.courses;

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Anyone authenticated can read published courses" ON public.courses
  FOR SELECT TO authenticated USING (
    is_published = true OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- exam_questions
DROP POLICY IF EXISTS "Admins can manage exam questions" ON public.exam_questions;
DROP POLICY IF EXISTS "Students can read questions of active exams" ON public.exam_questions;

CREATE POLICY "Admins can manage exam questions" ON public.exam_questions
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can read questions of active exams" ON public.exam_questions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_questions.exam_id AND exams.is_active = true)
  );

-- user_roles
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- remaining tables
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Anyone authenticated can read lessons" ON public.lessons;

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Anyone authenticated can read lessons" ON public.lessons
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage chapters" ON public.chapters;
DROP POLICY IF EXISTS "Anyone authenticated can read chapters" ON public.chapters;

CREATE POLICY "Admins can manage chapters" ON public.chapters
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Anyone authenticated can read chapters" ON public.chapters
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Students can read materials" ON public.materials;

CREATE POLICY "Admins can manage materials" ON public.materials
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Students can read materials" ON public.materials
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can read active questions" ON public.questions;

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Authenticated users can read active questions" ON public.questions
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Super admins can manage settings" ON public.platform_settings;

CREATE POLICY "Anyone authenticated can read settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage settings" ON public.platform_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;

CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
