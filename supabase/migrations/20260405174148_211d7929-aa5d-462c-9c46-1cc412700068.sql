
-- Add account_status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending';

-- Set all existing users to approved
UPDATE public.profiles SET account_status = 'approved' WHERE account_status = 'pending';

-- Update handle_new_user to set status = pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, grade, branch_id, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (NEW.raw_user_meta_data->>'grade')::integer,
    NULLIF(NEW.raw_user_meta_data->>'branch_id', '')::uuid,
    'pending'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$function$;
