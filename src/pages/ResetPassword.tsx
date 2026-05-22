import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Lock, Eye, EyeOff } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Firebase sends ?oobCode=xxx&mode=resetPassword in the reset link
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    const mode = params.get("mode");

    if (code && mode === "resetPassword") {
      verifyPasswordResetCode(auth, code)
        .then(() => {
          setOobCode(code);
          setReady(true);
        })
        .catch(() => {
          toast.error("This reset link is invalid or has expired. Please request a new one.");
        });
    } else {
      // Fallback: if user is already signed in, allow password change
      if (auth.currentUser) setReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, password);
      } else if (auth.currentUser) {
        const { updatePassword } = await import("firebase/auth");
        await updatePassword(auth.currentUser, password);
      }
      toast.success("Password updated successfully!");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-gradient pattern-ethiopian p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 font-display text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hero-gradient">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            Haylat<span className="text-gradient-gold">_EdTech</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Set your new password below.</p>
        </div>

        {!ready ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated text-center text-sm text-muted-foreground">
            Verifying your reset link…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">New Password</label>
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <Button variant="hero" className="w-full" type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
