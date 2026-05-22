
-- Exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  description TEXT,
  total_marks INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  randomize_questions BOOLEAN NOT NULL DEFAULT false,
  show_result_immediately BOOLEAN NOT NULL DEFAULT true,
  allow_retake BOOLEAN NOT NULL DEFAULT false,
  prevent_backtracking BOOLEAN NOT NULL DEFAULT false,
  pass_percentage INTEGER NOT NULL DEFAULT 50,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam questions table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam attempts table (tracks student sessions)
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  total_marks INTEGER,
  percentage NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'in_progress',
  is_auto_submitted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam answers table (individual answers)
CREATE TABLE public.exam_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  marks_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Triggers for updated_at
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- Exams policies
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can read active exams" ON public.exams FOR SELECT
  USING (is_active = true);

-- Exam questions policies
CREATE POLICY "Admins can manage exam questions" ON public.exam_questions FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can read questions of active exams" ON public.exam_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_id AND exams.is_active = true));

-- Exam attempts policies
CREATE POLICY "Admins can view all attempts" ON public.exam_attempts FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can manage own attempts" ON public.exam_attempts FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Exam answers policies
CREATE POLICY "Admins can view all answers" ON public.exam_answers FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Students can manage own answers" ON public.exam_answers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.exam_attempts WHERE exam_attempts.id = attempt_id AND exam_attempts.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts WHERE exam_attempts.id = attempt_id AND exam_attempts.student_id = auth.uid()));

-- Enable realtime for exam_answers (auto-save)
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_answers;
