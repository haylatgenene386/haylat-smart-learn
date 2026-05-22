-- Allow authenticated users to insert into instructor_courses (for accepting invitations)
CREATE POLICY "Users can accept instructor assignments"
ON public.instructor_courses FOR INSERT
WITH CHECK (auth.uid() = instructor_id);

-- Allow users to update their own role (for accepting invitations)
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update own role to instructor"
ON public.user_roles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow instructors to update invitation status
CREATE POLICY "Users can update invitation status"
ON public.instructor_invitations FOR UPDATE
USING (true)
WITH CHECK (true);