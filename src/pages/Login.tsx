import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth, sendPasswordResetEmail } from "@/hooks/useAuth";
import { getDocumentWhere } from "@/integrations/firebase/db";
import { toast } from "sonner";

const Login = () => {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      // Translate Firebase error codes to friendly messages
      const msg = error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
        ? "Invalid email or password."
        : error.code === "auth/user-not-found"
        ? "No account found with this email."
        : error.code === "auth/too-many-requests"
        ? "Too many attempts. Please try again later."
        : error.message;
      toast.error(msg);
      return;
    }

    // Check account approval status from Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
      const profile = await getDocumentWhere(
        "profiles",
        "user_id",
        "==",
        currentUser.uid
      );

      if (profile?.account_status === "pending") {
        await auth.signOut();
        setLoading(false);
        toast.error("Your account is waiting for admin approval. Please check back later.");
        return;
      }
      if (profile?.account_status === "rejected") {
        await auth.signOut();
        setLoading(false);
        toast.error("Your account registration has been rejected. Please contact support.");
        return;
      }
    }

    setLoading(false);
    toast.success("Welcome back!");
    navigate(redirectPath || "/dashboard");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset link sent! Check your email.");
      setForgotMode(false);
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found"
        ? "No account found with this email."
        : err.message;
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-gradient pattern-ethiopian p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hero-gradient">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            Haylat<span className="text-gradient-gold">_EdTech</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {forgotMode ? "Enter your email to reset your password." : "Welcome back! Log in to continue learning."}
          </p>
        </div>

        {forgotMode ? (
          <form onSubmit={handleForgotPassword} className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <Button variant="hero" className="w-full" type="submit" disabled={resetLoading}>
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
