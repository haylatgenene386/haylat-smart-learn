
-- Drop all existing restrictive policies on questions
DROP POLICY IF EXISTS "Admins can manage all questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can read active questions" ON public.questions;
DROP POLICY IF EXISTS "Instructors can manage own questions" ON public.questions;

-- Recreate as PERMISSIVE policies (OR logic)
CREATE POLICY "Admins can manage all questions"
ON public.questions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users can read active questions"
ON public.questions
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Instructors can manage own questions"
ON public.questions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'instructor'::app_role) AND ((submitted_by = auth.uid()) OR (submitted_by IS NULL)))
WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND (submitted_by = auth.uid()));
