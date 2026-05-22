import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Mail, Clock, CheckCircle, XCircle, Copy, Loader2, Trash2, UserCog, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const AdminInstructors = () => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [manualCourseId, setManualCourseId] = useState("");
  const queryClient = useQueryClient();
  const { user, isSuperAdmin, session } = useAuth();

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ["courses-for-invite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all student users (for manual assignment)
  const { data: studentUsers = [] } = useQuery({
    queryKey: ["student-users-for-assign"],
    queryFn: async () => {
      // Get all user_roles that are students
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) throw rolesErr;

      const studentIds = roles?.filter(r => r.role === "student").map(r => r.user_id) ?? [];
      if (studentIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);
      if (profErr) throw profErr;

      return profiles?.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || "Unnamed User",
      })) ?? [];
    },
  });

  // Fetch instructors with their courses
  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors-list"],
    queryFn: async () => {
      const { data: instructorCourses, error } = await supabase
        .from("instructor_courses")
        .select("*, courses(title)");
      if (error) throw error;

      const instructorIds = [...new Set(instructorCourses.map(ic => ic.instructor_id))];
      if (instructorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", instructorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return instructorCourses.map(ic => ({
        ...ic,
        instructor_name: profileMap.get(ic.instructor_id) || "Unknown",
        course_title: (ic.courses as any)?.title || "Unknown",
      }));
    },
  });

  // Fetch pending invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ["instructor-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructor_invitations")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("instructor_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-invitations"] });
      toast.success("Invitation cancelled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Manual add instructor mutation
  const addManualMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      // Update user role to instructor
      const { error: roleErr } = await supabase
        .from("user_roles")
        .update({ role: "instructor" as any })
        .eq("user_id", userId);
      if (roleErr) throw roleErr;

      // Assign to course
      const { error: assignErr } = await supabase
        .from("instructor_courses")
        .insert({
          instructor_id: userId,
          course_id: courseId,
          assigned_by: user!.id,
        });
      if (assignErr) throw assignErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors-list"] });
      queryClient.invalidateQueries({ queryKey: ["student-users-for-assign"] });
      toast.success("Instructor added successfully");
      setManualUserId("");
      setManualCourseId("");
      setManualOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendInvitation = async () => {
    if (!email || !courseId) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const response = await supabase.functions.invoke("send-instructor-invite", {
        body: { email, courseId },
      });

      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);

      setInviteLink(response.data.inviteLink);
      const emailSent = response.data.emailSent;
      toast.success(emailSent ? `Invitation email sent to ${email}` : `Invitation created for ${email} (email not sent - share the link manually)`);
      queryClient.invalidateQueries({ queryKey: ["instructor-invitations"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied to clipboard");
  };

  const resetDialog = () => {
    setEmail("");
    setCourseId("");
    setInviteLink("");
    setInviteOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Instructors</h2>
            <p className="text-sm text-muted-foreground">Manage course instructors and invitations</p>
          </div>
          {isSuperAdmin && (
            <div className="flex gap-2">
              {/* Manual Add Button */}
              <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setManualOpen(true)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Add Manually
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Instructor Manually</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Select an existing user and assign them as an instructor to a course.
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={manualUserId} onValueChange={setManualUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {studentUsers.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to Course</Label>
                      <Select value={manualCourseId} onValueChange={setManualCourseId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => addManualMutation.mutate({ userId: manualUserId, courseId: manualCourseId })}
                      disabled={!manualUserId || !manualCourseId || addManualMutation.isPending}
                      className="w-full"
                    >
                      {addManualMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Assign as Instructor
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Invite Button */}
              <Dialog open={inviteOpen} onOpenChange={(open) => !open && resetDialog()}>
                <DialogTrigger asChild>
                  <Button onClick={() => setInviteOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Instructor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Instructor</DialogTitle>
                  </DialogHeader>
                  {inviteLink ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-green-50 p-4 text-center">
                        <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                        <p className="mt-2 font-medium">Invitation Created!</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Share this link with the instructor:</Label>
                        <div className="flex gap-2">
                          <Input value={inviteLink} readOnly className="text-xs" />
                          <Button variant="outline" size="icon" onClick={copyLink}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button className="w-full" onClick={resetDialog}>Done</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Instructor Email</Label>
                        <Input
                          type="email"
                          placeholder="instructor@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assign to Course</Label>
                        <Select value={courseId} onValueChange={setCourseId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={sendInvitation} disabled={sending} className="w-full">
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Invitation
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Active Instructors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInstructors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : instructors.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No instructors assigned yet</p>
            ) : (
              <div className="divide-y">
                {instructors.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{inst.instructor_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Assigned to: {inst.course_title}
                      </p>
                    </div>
                    <Badge variant="secondary">Instructor</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No invitations sent</p>
            ) : (
              <div className="divide-y">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {(inv.courses as any)?.title} · {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          inv.status === "accepted" ? "default" :
                          inv.status === "declined" ? "destructive" :
                          inv.status === "pending" ? "secondary" : "outline"
                        }
                      >
                        {inv.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {inv.status === "accepted" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {inv.status === "declined" && <XCircle className="mr-1 h-3 w-3" />}
                        {inv.status === "expired" && <XCircle className="mr-1 h-3 w-3" />}
                        {inv.status}
                      </Badge>
                      {inv.status === "pending" && isSuperAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Resend Invitation"
                            onClick={async () => {
                              try {
                                const response = await supabase.functions.invoke("send-instructor-invite", {
                                  body: { email: inv.email, courseId: inv.course_id, resend: true },
                                });
                                if (response.error) throw response.error;
                                if (response.data?.error) throw new Error(response.data.error);
                                toast.success(`Invitation resent to ${inv.email}`);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to resend");
                              }
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel the invitation sent to {inv.email}. They will no longer be able to use the invitation link.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelInvitation.mutate(inv.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel Invitation
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminInstructors;
