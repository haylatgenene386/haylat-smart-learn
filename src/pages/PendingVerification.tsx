import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, GraduationCap, CheckCircle2 } from "lucide-react";

const Steps = [
  { label: "Account Info", done: true },
  { label: "Payment", done: true },
  { label: "Upload Proof", done: true },
  { label: "Waiting Approval", done: false, current: true },
];

const PendingVerification = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-gradient pattern-ethiopian p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Waiting for Payment Verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanks for registering! Our admin team will review your payment proof and activate your account shortly.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between gap-2">
          {Steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  s.done
                    ? "bg-primary text-primary-foreground"
                    : s.current
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className="mt-1 text-center text-[10px] font-medium leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>An administrator verifies your payment proof.</li>
              <li>You will receive an email once your account is approved.</li>
              <li>After approval you can sign in and start learning.</li>
            </ul>
          </div>
        </div>

        <Button asChild variant="hero" className="w-full">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  );
};

export default PendingVerification;
