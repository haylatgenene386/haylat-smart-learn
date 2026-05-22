
ALTER TABLE public.questions DROP CONSTRAINT questions_approval_status_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_approval_status_check 
  CHECK (approval_status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'declined'::text, 'revision'::text]));
