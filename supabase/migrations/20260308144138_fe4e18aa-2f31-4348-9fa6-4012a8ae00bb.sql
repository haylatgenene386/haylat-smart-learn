
-- 1. Allow all authenticated users to read profiles (needed for messaging)
CREATE POLICY "Authenticated users can read profiles for messaging"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- 2. Allow all authenticated users to read user_roles (needed to find users by role)
CREATE POLICY "Authenticated users can read roles for messaging"
ON public.user_roles FOR SELECT TO authenticated
USING (true);

-- 3. Allow conversation participants to update their conversations (for updated_at timestamp)
CREATE POLICY "Participants can update own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING ((auth.uid() = participant_1) OR (auth.uid() = participant_2))
WITH CHECK ((auth.uid() = participant_1) OR (auth.uid() = participant_2));

-- 4. Add reply_to_id column to messages for reply feature
ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
