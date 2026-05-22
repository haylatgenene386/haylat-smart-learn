import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container py-10">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <Link to="/" className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero-gradient">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>Haylat<span className="text-gradient-gold">_EdTech</span></span>
          </Link>
          <p className="text-sm text-muted-foreground">AI-Powered Smart Learning for Ethiopia</p>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Platform</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/lessons" className="hover:text-primary transition-colors">Lessons</Link>
            <Link to="/quiz" className="hover:text-primary transition-colors">Practice Quiz</Link>
            <Link to="/ai-tutor" className="hover:text-primary transition-colors">AI Tutor</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Support</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>contact@haylatedtech.com</span>
            <span>Addis Ababa, Ethiopia</span>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © 2026 Haylat_EdTech. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
