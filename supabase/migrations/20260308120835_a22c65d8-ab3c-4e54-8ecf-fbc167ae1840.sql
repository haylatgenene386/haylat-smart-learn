-- Fix the overly permissive invitation update policy
DROP POLICY IF EXISTS "Users can update invitation status" ON public.instructor_invitations;

-- Only allow updating invitations where the user's email matches
CREATE POLICY "Users can update invitation matching their email"
ON public.instructor_invitations FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);