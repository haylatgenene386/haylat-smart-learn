
ALTER TABLE public.about_us_content
ADD COLUMN IF NOT EXISTS subtitle text,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
