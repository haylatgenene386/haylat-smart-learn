
-- Add new columns to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS grade_target integer,
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

-- Create index for grade-based lookups
CREATE INDEX IF NOT EXISTS idx_materials_grade_target ON public.materials (grade_target);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON public.materials (subject);

-- Create a storage policy so admins can read payment receipts via signed URLs
CREATE POLICY "Admins can read payment receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);
