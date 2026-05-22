import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap, Shield, Globe, MessageCircle, UserCircle, Info, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import { useLanguage, LANG_LABELS, type Lang } from "@/hooks/useLanguage";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isInstructor, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const links = [
    { to: "/dashboard", label: t("nav.dashboard") },
    { to: "/lessons", label: t("nav.lessons") },
    { to: "/quiz", label: t("nav.quiz") },
    { to: "/ai-tutor", label: t("nav.ai_tutor") },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/materials", label: "Materials", icon: BookOpen },
    { to: "/about-us", label: "About Us", icon: Info },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hero-gradient">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span>Haylat<span className="text-gradient-gold">_EdTech</span></span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>
              <Button variant={location.pathname === l.to ? "secondary" : "ghost"} size="sm">{l.label}</Button>
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" size="sm" className="ml-1 gap-1">
                <Shield className="h-3 w-3" /> {t("nav.admin")}
              </Button>
            </Link>
          )}
          {isInstructor && !isAdmin && (
            <Link to="/instructor">
              <Button variant="outline" size="sm" className="ml-1 gap-1">
                <Shield className="h-3 w-3" /> Instructor
              </Button>
            </Link>
          )}

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-1 gap-1">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs">{lang.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                <DropdownMenuItem key={l} onClick={() => setLang(l)} className={lang === l ? "bg-primary/10 font-medium" : ""}>
                  {LANG_LABELS[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-2 flex items-center gap-2">
            {user ? (
              <>
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <UserCircle className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut}>{t("nav.sign_out")}</Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="outline" size="sm">{t("nav.log_in")}</Button></Link>
                <Link to="/register"><Button variant="hero" size="sm">{t("nav.sign_up")}</Button></Link>
              </>
            )}
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
                <Button variant={location.pathname === l.to ? "secondary" : "ghost"} className="w-full justify-start">{l.label}</Button>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2"><Shield className="h-4 w-4" /> {t("nav.admin")}</Button>
              </Link>
            )}
            {isInstructor && !isAdmin && (
              <Link to="/instructor" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2"><Shield className="h-4 w-4" /> Instructor</Button>
              </Link>
            )}
            {/* Mobile language */}
            <div className="flex gap-1 mt-2">
              {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                <Button key={l} variant={lang === l ? "secondary" : "ghost"} size="sm" onClick={() => setLang(l)} className="flex-1 text-xs">
                  {LANG_LABELS[l]}
                </Button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><UserCircle className="h-4 w-4" /> My Profile</Button>
                  </Link>
                  <Button variant="outline" className="w-full" onClick={() => { handleSignOut(); setOpen(false); }}>{t("nav.sign_out")}</Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}><Button variant="outline" className="w-full">{t("nav.log_in")}</Button></Link>
                  <Link to="/register" onClick={() => setOpen(false)}><Button variant="hero" className="w-full">{t("nav.sign_up")}</Button></Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
