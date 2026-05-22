import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, BarChart3, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: BookOpen,
    title: "Structured Lessons",
    desc: "Grade 9–12 subjects organized by chapter and topic, with downloadable PDFs.",
  },
  {
    icon: Brain,
    title: "AI Tutor",
    desc: "Get step-by-step explanations, hints, and alternative methods instantly.",
  },
  {
    icon: Zap,
    title: "Smart Quizzes",
    desc: "Auto-generated MCQ and written quizzes with instant scoring.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    desc: "Visual dashboards showing mastery, accuracy, and weak areas.",
  },
];

const grades = [
  { grade: 9, chapters: 12, lessons: 48 },
  { grade: 10, chapters: 14, lessons: 56 },
  { grade: 11, chapters: 10, lessons: 42 },
  { grade: 12, chapters: 11, lessons: 45 },
];

const Index = () => (
  <Layout>
    {/* Hero */}
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-hero-gradient opacity-90" />
      <div className="relative container py-20 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm text-primary-foreground">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Smart Learning
          </div>
          <h1 className="mb-6 font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
            Learn Smarter with{" "}
            <span className="text-gradient-gold">AI Guidance</span>
          </h1>
          <p className="mb-8 text-lg text-primary-foreground/80">
            Ethiopia's first AI-powered learning platform for Grades 9–12.
            Multi-subject lessons, smart quizzes, and personalized tutoring.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button variant="gold" size="lg" className="gap-2 text-base">
                Start Learning Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/lessons">
              <Button size="lg" className="gap-2 border border-primary-foreground/30 bg-primary-foreground/10 text-base text-primary-foreground hover:bg-primary-foreground/20">
                Browse Lessons
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="container py-16 md:py-24">
      <div className="mb-12 text-center">
        <h2 className="mb-3 font-display text-3xl font-bold">Everything you need to excel</h2>
        <p className="text-muted-foreground">Built for Ethiopian students, optimized for low-data environments</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Grades */}
    <section className="bg-card/50 pattern-ethiopian">
      <div className="container py-16 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold">Choose Your Grade</h2>
          <p className="text-muted-foreground">Structured curriculum aligned with Ethiopian education standards</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {grades.map((g) => (
            <Link
              key={g.grade}
              to={`/lessons?grade=${g.grade}`}
              className="group flex flex-col items-center rounded-xl border border-border bg-background p-8 shadow-card transition-all hover:shadow-elevated hover:border-primary/30"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hero-gradient text-2xl font-bold text-primary-foreground font-display">
                {g.grade}
              </div>
              <h3 className="mb-1 font-display text-lg font-semibold">Grade {g.grade}</h3>
              <p className="text-sm text-muted-foreground">{g.chapters} chapters · {g.lessons} lessons</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Start learning <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-xl rounded-2xl bg-hero-gradient p-10 text-center shadow-soft">
        <h2 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
          Ready to excel in your studies?
        </h2>
        <p className="mb-6 text-primary-foreground/80">
          Join thousands of Ethiopian students learning smarter with AI.
        </p>
        <Link to="/register">
          <Button variant="gold" size="lg" className="gap-2">
            Get Started — It's Free <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  </Layout>
);

export default Index;
