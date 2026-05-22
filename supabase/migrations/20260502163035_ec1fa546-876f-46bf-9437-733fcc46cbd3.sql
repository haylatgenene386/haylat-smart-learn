
-- Add retake control columns to exams
ALTER TABLE public.exams
  ADD COLUMN max_retakes integer NOT NULL DEFAULT 1,
  ADD COLUMN retake_wait_hours integer NOT NULL DEFAULT 0;

-- Per-student retake overrides
CREATE TABLE public.exam_retake_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  extra_retakes integer NOT NULL DEFAULT 1,
  override_reason text,
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

ALTER TABLE public.exam_retake_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retake overrides"
  ON public.exam_retake_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Students can view own overrides"
  ON public.exam_retake_overrides FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
