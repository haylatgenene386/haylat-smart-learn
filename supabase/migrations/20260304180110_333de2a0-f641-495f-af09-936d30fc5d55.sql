
-- Add unique constraint for upsert on exam_answers
ALTER TABLE public.exam_answers ADD CONSTRAINT exam_answers_attempt_question_unique UNIQUE (attempt_id, question_id);

-- Add foreign key from exam_attempts.student_id to profiles for join queries
CREATE INDEX idx_exam_attempts_student ON public.exam_attempts(student_id);
CREATE INDEX idx_exam_attempts_exam ON public.exam_attempts(exam_id);
CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id);
