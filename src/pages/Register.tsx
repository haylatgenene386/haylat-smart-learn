import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  Upload,
  FileCheck,
  CheckCircle2,
  Hash,
  Copy,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";
import { uploadFile } from "@/integrations/firebase/storage";
import { updateDocument } from "@/integrations/firebase/db";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PAYMENT_METHODS, PaymentMethodKey } from "@/lib/payment-methods";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const STEPS = ["Account Info", "Payment", "Upload Proof", "Waiting Approval"];

const StepIndicator = ({ current }: { current: number }) => (
  <div className="mb-6 flex items-center justify-between gap-2">
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <div key={label} className="flex flex-1 flex-col items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              done
                ? "bg-primary text-primary-foreground"
                : active
                ? "border-2 border-primary text-primary"
                : "border border-border text-muted-foreground"
            }`}
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span className="mt-1 text-center text-[10px] font-medium leading-tight">{label}</span>
        </div>
      );
    })}
  </div>
);

const Register = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email") || "";
  const isInviteMode = !!inviteToken;

  const [step, setStep] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [grade, setGrade] = useState("");
  const [branchId, setBranchId] = useState("");
  const [password, setPassword] = useState("");

  // Payment step
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey | "">("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, code").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are accepted.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be less than 5MB.");
      e.target.value = "";
      return;
    }
    setPaymentFile(file);
  };

  const validateStep0 = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (!isInviteMode) {
      if (!grade) return "Please select your grade level.";
      if (branches.length > 0 && !branchId) return "Please select a branch / campus.";
    }
    return null;
  };

  const validateStep1 = () => {
    if (!paymentMethod) return "Please choose a payment method.";
    return null;
  };

  const validateStep2 = () => {
    if (!paymentFile && !paymentReference.trim()) {
      return "Please upload a screenshot or enter a payment reference number.";
    }
    return null;
  };

  const goNext = () => {
    let err: string | null = null;
    if (step === 0) err = validateStep0();
    else if (step === 1 && !isInviteMode) err = validateStep1();
    else if (step === 2 && !isInviteMode) err = validateStep2();
    if (err) {
      toast.error(err);
      return;
    }
    if (isInviteMode) {
      // skip payment steps for instructor invitation
      handleSubmit();
      return;
    }
    if (step < STEPS.length - 2) setStep(step + 1);
    else handleSubmit();
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);

    const { error } = await signUp(
      email,
      password,
      fullName,
      !isInviteMode && grade ? parseInt(grade) : undefined,
      branchId || undefined
    );
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (!isInviteMode) {
      try {
        // Firebase: user is available directly from auth.currentUser after signUp
        const newUser = auth.currentUser;
        if (newUser) {
          let receiptUrl: string | null = null;

          if (paymentFile) {
            try {
              const ext = paymentFile.name.split(".").pop()?.toLowerCase() || "jpg";
              const filePath = `payment-receipts/${newUser.uid}/receipt_${Date.now()}.${ext}`;
              receiptUrl = await uploadFile(filePath, paymentFile);
            } catch (uploadErr) {
              console.error("Payment upload failed:", uploadErr);
            }
          }

          await updateDocument("profiles", newUser.uid, {
            payment_receipt_url: receiptUrl,
            payment_method: paymentMethod || null,
            payment_reference_number: paymentReference.trim() || null,
            payment_status: "pending_review",
          });

          try {
            await supabase.functions.invoke("send-registration-email", {
              body: { userId: newUser.uid, type: "new_registration" },
            });
          } catch (emailErr) {
            console.error("Failed to send admin notification:", emailErr);
          }
        }
      } catch (uploadErr) {
        console.error("Payment upload error:", uploadErr);
      }

      await supabase.auth.signOut();
      setLoading(false);
      toast.success("Account created! Your payment is now pending verification.");
      navigate("/pending-verification");
    } else {
      setLoading(false);
      toast.success("Account created! Redirecting to accept your invitation...");
      navigate(`/accept-invite?token=${inviteToken}`);
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.key === paymentMethod);

  // Visible step index for the indicator (instructor invitation only shows step 0)
  const visibleStep = isInviteMode ? 0 : step;

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-gradient pattern-ethiopian p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hero-gradient">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            Haylat<span className="text-gradient-gold">_EdTech</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {isInviteMode
              ? "Create your instructor account to accept the invitation."
              : "Create your account and start learning!"}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            goNext();
          }}
          className="rounded-2xl border border-border bg-card p-6 shadow-elevated"
        >
          {!isInviteMode && <StepIndicator current={visibleStep} />}

          {/* STEP 0 - Account info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Abebe Kebede"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
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
                    readOnly={isInviteMode}
                  />
                </div>
                {isInviteMode && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email is pre-filled from invitation and cannot be changed.
                  </p>
                )}
              </div>

              {!isInviteMode && (
                <>
                  {branches.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Branch / Campus</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <select
                          value={branchId}
                          onChange={(e) => setBranchId(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                          required
                        >
                          <option value="">Select branch</option>
                          {branches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Grade Level <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm outline-none focus:border-primary"
                      required
                    >
                      <option value="">Select grade</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">Password</label>
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
            </div>
          )}

          {/* STEP 1 - Payment method */}
          {!isInviteMode && step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Choose Payment Method</h3>
                <p className="text-xs text-muted-foreground">Select how you would like to pay the registration fee.</p>
              </div>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => {
                  const active = paymentMethod === m.key;
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          active ? "border-primary bg-primary" : "border-border"
                        }`}
                      >
                        {active && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.holderName}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedMethod && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{selectedMethod.accountLabel}</p>
                      <p className="font-mono text-base font-semibold">{selectedMethod.accountNumber}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMethod.accountNumber);
                        toast.success("Copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="mb-1 text-xs text-muted-foreground">Account Holder</p>
                  <p className="mb-2 font-medium">{selectedMethod.holderName}</p>
                  <p className="text-xs text-muted-foreground">{selectedMethod.instructions}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 - Upload proof */}
          {!isInviteMode && step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Submit Payment Proof</h3>
                <p className="text-xs text-muted-foreground">
                  Upload your payment screenshot OR enter the transaction reference. At least one is required.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Payment Screenshot</label>
                <p className="mb-2 text-xs text-muted-foreground">JPG, PNG or PDF, max 5MB</p>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3 transition-colors hover:border-primary hover:bg-primary/5">
                  {paymentFile ? (
                    <>
                      <FileCheck className="h-5 w-5 shrink-0 text-green-600" />
                      <span className="truncate text-sm text-foreground">{paymentFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload payment receipt</span>
                    </>
                  )}
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="mx-3 text-xs uppercase text-muted-foreground">Or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Reference / VAT Invoice Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. CBE12345678"
                    maxLength={64}
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-2">
            {!isInviteMode && step > 0 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={loading} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <Button variant="hero" className="flex-1 gap-1" type="submit" disabled={loading}>
              {loading
                ? "Submitting..."
                : isInviteMode
                ? "Create Instructor Account"
                : step < STEPS.length - 2
                ? <>Next <ArrowRight className="h-4 w-4" /></>
                : "Submit Registration"}
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={isInviteMode ? `/login?redirect=${encodeURIComponent(`/accept-invite?token=${inviteToken}`)}` : "/login"}
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
