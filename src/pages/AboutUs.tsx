
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GraduationCap, Target, Eye, Users, Lightbulb, Building2, Linkedin, Send, Globe } from "lucide-react";

interface Section {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  social_links: Record<string, string> | null;
  is_visible: boolean;
  sort_order: number;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  problem: <Lightbulb className="h-8 w-8 text-accent" />,
  mission: <Target className="h-8 w-8 text-primary" />,
  vision: <Eye className="h-8 w-8 text-secondary" />,
  company: <Building2 className="h-8 w-8 text-accent" />,
};

const AboutUs = () => {
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    supabase
      .from("about_us_content")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order")
      .then(({ data }) => data && setSections(data as Section[]));
  }, []);

  const get = (key: string) => sections.find((s) => s.section_key === key);

  const hero = get("hero");
  const founder = get("founder");
  const cards = sections.filter((s) => !["hero", "founder"].includes(s.section_key));
  const socials = founder?.social_links || {};

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="container relative z-10 text-center max-w-3xl mx-auto">
          <div className="mb-6 inline-flex items-center justify-center rounded-full bg-white/10 p-4">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            {hero?.title || "About Haylat_EdTech"}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
            {hero?.content}
          </p>
        </div>
      </section>

      {/* Founder */}
      {founder && (
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container max-w-4xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
                {/* Photo */}
                <div className="flex-shrink-0 group">
                  {founder.image_url ? (
                    <img
                      src={founder.image_url}
                      alt={founder.title || "Founder"}
                      className="w-44 h-44 md:w-52 md:h-52 rounded-full object-cover ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-44 h-44 md:w-52 md:h-52 rounded-full bg-hero-gradient flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Users className="h-20 w-20 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-center md:text-left flex-1">
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-1">
                    {founder.title}
                  </h2>
                  {founder.subtitle && (
                    <p className="text-primary font-medium text-lg mb-4">{founder.subtitle}</p>
                  )}
                  <p className="text-muted-foreground leading-relaxed text-lg mb-6">
                    {founder.content}
                  </p>

                  {/* Social Links */}
                  {(socials.linkedin || socials.telegram || socials.website) && (
                    <div className="flex gap-3 justify-center md:justify-start">
                      {socials.linkedin && (
                        <a href={socials.linkedin} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground transition-colors duration-200">
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {socials.telegram && (
                        <a href={socials.telegram} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground transition-colors duration-200">
                          <Send className="h-5 w-5" />
                        </a>
                      )}
                      {socials.website && (
                        <a href={socials.website} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground transition-colors duration-200">
                          <Globe className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Content Cards */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
          {cards.map((s) => (
            <div key={s.section_key} className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">{SECTION_ICONS[s.section_key] || <Lightbulb className="h-8 w-8 text-muted-foreground" />}</div>
              <h3 className="font-display text-2xl font-bold mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-3xl mx-auto text-center mb-12">
          <h2 className="font-display text-3xl font-bold">Our Journey</h2>
        </div>
        <div className="container max-w-2xl mx-auto">
          {[
            { year: "2024", text: "Idea conceived — addressing gaps in Ethiopian secondary education." },
            { year: "2025", text: "Platform development begins with AI tutoring & curriculum mapping." },
            { year: "2026", text: "Launch of Haylat_EdTech with multi-branch support, serving Grades 9-12." },
          ].map((item, i) => (
            <div key={i} className="flex gap-6 mb-8 last:mb-0">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {item.year}
                </div>
                {i < 2 && <div className="w-0.5 flex-1 bg-border mt-2" />}
              </div>
              <p className="text-muted-foreground pt-3 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
