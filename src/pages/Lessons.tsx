import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, FileText, Download, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

const curriculum: Record<number, { name: string; lessons: string[] }[]> = {
  9: [
    { name: "Biology", lessons: ["Cell Structure", "Classification", "Ecology", "Human Body"] },
    { name: "Chemistry", lessons: ["Matter & Change", "Atoms", "Chemical Reactions", "Solutions"] },
    { name: "Mathematics", lessons: ["Number Systems", "Algebra", "Geometry", "Statistics"] },
  ],
  10: [
    { name: "Physics", lessons: ["Motion", "Forces", "Energy", "Waves"] },
    { name: "Biology", lessons: ["Genetics", "Evolution", "Plant Biology", "Microbiology"] },
    { name: "Mathematics", lessons: ["Polynomials", "Functions", "Trigonometry", "Probability"] },
  ],
  11: [
    { name: "Chemistry", lessons: ["Organic Chemistry", "Acids & Bases", "Electrochemistry", "Thermodynamics"] },
    { name: "Physics", lessons: ["Electromagnetism", "Optics", "Modern Physics", "Nuclear Physics"] },
    { name: "Mathematics", lessons: ["Sequences & Series", "Calculus Intro", "Statistics", "Vectors"] },
  ],
  12: [
    { name: "Biology", lessons: ["Molecular Biology", "Biotechnology", "Ecology Systems", "Health Science"] },
    { name: "Mathematics", lessons: ["Advanced Calculus", "Matrices", "Differential Equations", "Applied Math"] },
    { name: "Civics", lessons: ["Constitution", "Governance", "Human Rights", "Democracy"] },
  ],
};

const Lessons = () => {
  const { grade: studentGrade } = useProfile();
  const { isAdmin } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  // Auto-select grade for students
  useEffect(() => {
    if (studentGrade && !isAdmin) {
      setSelectedGrade(studentGrade);
    }
  }, [studentGrade, isAdmin]);

  const availableGrades = isAdmin ? [9, 10, 11, 12] : studentGrade ? [studentGrade] : [];

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Lessons</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? "Select a grade to browse chapters and lessons" : studentGrade ? `Grade ${studentGrade} — Your personalized lessons` : "Loading your grade..."}
          </p>
        </div>

        {/* Grade Selection — only show for admins or if multiple grades */}
        {availableGrades.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-3">
            {availableGrades.map((g) => (
              <Button
                key={g}
                variant={selectedGrade === g ? "hero" : "outline"}
                size="lg"
                onClick={() => { setSelectedGrade(g); setExpandedChapter(null); }}
                className="font-display"
              >
                Grade {g}
              </Button>
            ))}
          </div>
        )}

        {/* Chapters */}
        {selectedGrade > 0 && curriculum[selectedGrade] && (
          <div className="space-y-4">
            {curriculum[selectedGrade].map((chapter, ci) => (
              <div key={ci} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <button
                  onClick={() => setExpandedChapter(expandedChapter === ci ? null : ci)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-bold text-primary">
                      {ci + 1}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{chapter.name}</h3>
                      <p className="text-xs text-muted-foreground">{chapter.lessons.length} lessons</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedChapter === ci ? "rotate-90" : ""}`} />
                </button>

                {expandedChapter === ci && (
                  <div className="border-t border-border px-6 py-3 animate-fade-in">
                    {chapter.lessons.map((lesson, li) => (
                      <div key={li} className="flex items-center justify-between border-b border-border/50 py-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{lesson}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                            <Download className="h-3 w-3" /> PDF
                          </Button>
                          <Link to={`/lesson/${selectedGrade}/${ci}/${li}`}>
                            <Button variant="hero" size="sm" className="h-8 gap-1 text-xs">
                              <Play className="h-3 w-3" /> Study
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedGrade === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-display text-lg font-semibold text-muted-foreground">Select a Grade</h3>
            <p className="text-sm text-muted-foreground">Choose Grade 9, 10, 11, or 12 to start browsing lessons</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Lessons;
