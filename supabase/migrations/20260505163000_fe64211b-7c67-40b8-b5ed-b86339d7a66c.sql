
CREATE TABLE public.about_us_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL UNIQUE,
  title text,
  content text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.about_us_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible about us content"
  ON public.about_us_content FOR SELECT TO public
  USING (is_visible = true);

CREATE POLICY "Super admins can manage about us content"
  ON public.about_us_content FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default content
INSERT INTO public.about_us_content (section_key, title, content, sort_order) VALUES
('hero', 'Empowering Ethiopian Students Through Smart Learning', 'Haylat_EdTech is a cutting-edge educational platform designed specifically for Ethiopian students in Grades 9-12. We combine AI-powered tutoring, comprehensive curriculum coverage, and modern assessment tools to make quality education accessible to every student.', 1),
('problem', 'The Problem We Solve', 'Many Ethiopian students face limited access to quality educational resources, personalized tutoring, and modern exam preparation tools. Rural and underserved areas suffer most, with overcrowded classrooms and insufficient learning materials. Haylat_EdTech bridges this gap by delivering world-class digital education directly to students'' devices.', 2),
('founder', 'Meet Our Founder', 'Haylat_EdTech was founded with a passion for transforming education in Ethiopia. Our founder, driven by firsthand experience of the challenges students face, envisioned a platform that leverages technology to democratize learning. With a background in education and technology, the founder''s mission is to ensure no student is left behind.', 3),
('mission', 'Our Mission', 'To provide every Ethiopian student with accessible, high-quality, AI-enhanced education that prepares them for academic excellence and lifelong success.', 4),
('vision', 'Our Vision', 'A future where every student in Ethiopia, regardless of location or economic background, has equal access to transformative educational tools and opportunities.', 5),
('company', 'About Haylat_EdTech', 'Haylat_EdTech is an Ethiopian education technology company specializing in AI-powered learning solutions for secondary school students. Our platform covers the full Ethiopian curriculum for Grades 9-12, offering interactive lessons, smart quizzes, AI tutoring, and comprehensive exam preparation. We operate across multiple branches to serve students nationwide.', 6);

CREATE TRIGGER update_about_us_content_updated_at
  BEFORE UPDATE ON public.about_us_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
