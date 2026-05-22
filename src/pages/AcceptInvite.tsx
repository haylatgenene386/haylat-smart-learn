import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, BookOpen, Ban } from "lucide-react";
import { toast } from "sonner";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const action = searchParams.get("action"); // "decline" or null
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "accepted" | "declined" | "error">("loading");
  const [invitation, setInvitation] = useState<any>(null);
  const [courseName, setCourseName] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const checkInvitation = async () => {
      const { data, error } = await supabase
        .from("instructor_invitations")
        .select("*, courses(title)")
        .eq("token", token)
        .single();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      if (data.status === "accepted") {
        setCourseName((data.courses as any)?.title || "Unknown Course");
        setStatus("accepted");
        return;
      }

      if (data.status === "declined") {
        setCourseName((data.courses as any)?.title || "Unknown Course");
        setStatus("declined");
        return;
      }

      if (data.status === "expired" || new Date(data.expires_at) < new Date()) {
        setStatus("invalid");
        return;
      }

      setInvitation(data);
      setCourseName((data.courses as any)?.title || "Unknown Course");
      setStatus("valid");
    };

    checkInvitation();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!user || !invitation) return;

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast.error("Please sign in with the email address the invitation was sent to: " + invitation.email);
      return;
    }

    setProcessing(true);
    try {
      // Update role to instructor
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "instructor" as any })
        .eq("user_id", user.id);
      if (roleError) throw roleError;

      // Also mark profile as approved so instructor can log in
      await supabase
        .from("profiles")
        .update({ account_status: "approved" } as any)
        .eq("user_id", user.id);

      // Assign to course
      const { error: courseError } = await supabase
        .from("instructor_courses")
        .insert({
          instructor_id: user.id,
          course_id: invitation.course_id,
          assigned_by: invitation.invited_by,
        });
      if (courseError) throw courseError;

      // Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from("instructor_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);
      if (inviteError) throw inviteError;

      toast.success("You are now an instructor for " + courseName);
      setStatus("accepted");
      setTimeout(() => navigate("/instructor"), 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to accept invitation");
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!invitation) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("instructor_invitations")
        .update({ status: "declined" })
        .eq("id", invitation.id);
      if (error) throw error;

      toast.success("Invitation declined");
      setStatus("declined");
    } catch (error: any) {
      toast.error(error.message || "Failed to decline invitation");
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  // Auto-decline if action=decline and user is authenticated with matching email
  useEffect(() => {
    if (action === "decline" && status === "valid" && invitation && user) {
      if (user.email?.toLowerCase() === invitation.email.toLowerCase()) {
        handleDeclineInvite();
      }
    }
  }, [action, status, invitation, user]);

  // Auto-accept if user is logged in and email matches (no action=decline)
  // This handles the case where user just registered/logged in and was redirected back

  if (authLoading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build redirect URLs that preserve the invite token
  const currentPath = `/accept-invite?token=${token}${action ? `&action=${action}` : ""}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
  const registerUrl = `/register?invite=${token}&email=${encodeURIComponent(invitation?.email || "")}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        {status === "invalid" && (
          <>
            <CardHeader className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="mt-4">Invalid Invitation</CardTitle>
              <CardDescription>This invitation link is invalid or has expired.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/"><Button>Go to Home</Button></Link>
            </CardContent>
          </>
        )}

        {status === "accepted" && (
          <>
            <CardHeader className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle className="mt-4">Invitation Accepted!</CardTitle>
              <CardDescription>
                You are now an instructor for <strong>{courseName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/instructor"><Button>Go to Instructor Dashboard</Button></Link>
            </CardContent>
          </>
        )}

        {status === "declined" && (
          <>
            <CardHeader className="text-center">
              <Ban className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4">Invitation Declined</CardTitle>
              <CardDescription>
                You have declined the invitation for <strong>{courseName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/"><Button variant="outline">Go to Home</Button></Link>
            </CardContent>
          </>
        )}

        {status === "error" && (
          <>
            <CardHeader className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle className="mt-4">Something Went Wrong</CardTitle>
              <CardDescription>There was an error processing your invitation. Please try again.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </>
        )}

        {status === "valid" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="mt-4">Instructor Invitation</CardTitle>
              <CardDescription>You've been invited to be an instructor for</CardDescription>
              <p className="mt-2 text-lg font-semibold text-foreground">{courseName}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Please sign in with <strong>{invitation.email}</strong> to {action === "decline" ? "decline" : "respond to"} this invitation.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link to={loginUrl}>
                      <Button>Sign In</Button>
                    </Link>
                    <Link to={registerUrl}>
                      <Button variant="outline">Create Account</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Signed in as <strong>{user.email}</strong>
                  </p>
                  {user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
                    <div className="rounded-lg bg-destructive/10 p-3 text-center">
                      <p className="text-sm text-destructive">
                        Please sign in with <strong>{invitation.email}</strong> to respond to this invitation.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAcceptInvite}
                        className="flex-1"
                        disabled={processing}
                      >
                        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Accept
                      </Button>
                      <Button
                        onClick={handleDeclineInvite}
                        variant="destructive"
                        className="flex-1"
                        disabled={processing}
                      >
                        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default AcceptInvite;
