import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UserCheck, UserX, Clock, CheckCircle2, XCircle, FileText, Eye, Hash, Wallet, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getPaymentMethod } from "@/lib/payment-methods";
import { useBranch } from "@/hooks/useBranch";
import { useAuth } from "@/hooks/useAuth";
import { fetchApprovalProfiles, toDateLabel, findDuplicateReference } from "@/lib/approvals";
import { getCollection, updateDocument, addDocument } from "@/integrations/firebase/db";
import { getDownloadURL, ref } from "@/integrations/firebase/storage";
import { storage } from "@/integrations/firebase/client";

type PendingUser = {
  user_id: string;
  full_name: string | null;
  email?: string | null;
  grade: number | null;
  created_at: any;
  account_status: string;
  branch_id: string | null;
  branch_name: string | null;
  role: string;
  payment_receipt_url: string | null;
  payment_receipt_path?: string | null;
  payment_status: string | null;
  payment_admin_comment: string | null;
  payment_method: string | null;
  payment_reference_number: string | null;
};

const AdminApprovals = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [reviewReceiptUrl, setReviewReceiptUrl] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<PendingUser[]>([]);
  const [referenceConfirmed, setReferenceConfirmed] = useState(false);
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuth();

  const { currentBranch, isGlobalRole, userBranchId } = useBranch();
  const scopeBranch = isGlobalRole ? currentBranch?.id ?? null : userBranchId;

  const { data: users = [], isLoading, error: loadError, refetch } = useQuery({
    queryKey: ["approval-users", statusFilter, scopeBranch],
    refetchInterval: 30000,
    queryFn: async () => {
      const statuses = statusFilter === "all" ? ["pending", "rejected"] : [statusFilter];
      const profiles = await fetchApprovalProfiles(statuses, scopeBranch);
      const roles = await getCollection("user_roles");
      const branches = await getCollection("branches");

      const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
      const branchMap = new Map(branches.map((b: any) => [b.id, b.name]));

      return profiles.map((p: any) => ({
        ...p,
        user_id: p.user_id ?? p.id,
        branch_name: p.branch_id ? branchMap.get(p.branch_id) ?? null : null,
        role: (roleMap.get(p.user_id ?? p.id) as string) ?? "student",
      })) as PendingUser[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ u, status, paymentStatus, comment }: { u: PendingUser; status: string; paymentStatus?: string; comment?: string }) => {
      const updateData: any = { account_status: status };
      if (paymentStatus) updateData.payment_status = paymentStatus;
      if (comment !== undefined) updateData.payment_admin_comment = comment;

      await updateDocument("profiles", u.user_id, updateData);

      // Audit trail: record who verified what, so decisions can be reviewed later
      try {
        await addDocument("payment_verifications", {
          student_user_id: u.user_id,
          student_name: u.full_name ?? null,
          student_email: u.email ?? null,
          decision: status,
          payment_method: u.payment_method ?? null,
          payment_reference_number: u.payment_reference_number ?? null,
          had_receipt: !!u.payment_receipt_url,
          verified_by: adminUser?.uid ?? null,
          verified_by_email: adminUser?.email ?? null,
          admin_comment: comment ?? null,
          decided_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.error("[approvals] audit log failed:", auditErr);
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["approval-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      setSelectedUser(null);
      setAdminComment("");
      setReferenceConfirmed(false);
      setDuplicates([]);
      toast.success(`User ${status === "approved" ? "approved" : "rejected"} successfully`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter(
    (u) => { const q = search.trim().toLowerCase(); return !q || [u.full_name, u.email, u.payment_reference_number].some((v) => v?.toLowerCase().includes(q)); }
  );

  const statusIcon = (status: string) => {
    if (status === "pending") return <Clock className="h-3.5 w-3.5" />;
    if (status === "approved") return <CheckCircle2 className="h-3.5 w-3.5" />;
    return <XCircle className="h-3.5 w-3.5" />;
  };

  const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    if (status === "pending") return "secondary";
    if (status === "approved") return "default";
    return "destructive";
  };

  const paymentBadge = (u: PendingUser) => {
    const status = u.payment_status;
    if (status === "approved") return <Badge variant="default" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Payment Verified</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" />Payment Rejected</Badge>;
    if (u.payment_receipt_url) return <Badge variant="secondary" className="gap-1 text-xs"><FileText className="h-3 w-3" />Receipt Uploaded</Badge>;
    if (u.payment_reference_number) return <Badge variant="secondary" className="gap-1 text-xs"><Hash className="h-3 w-3" />Reference Submitted</Badge>;
    return <Badge variant="outline" className="gap-1 text-xs"><Clock className="h-3 w-3" />No Proof</Badge>;
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)/i.test(decodeURIComponent(url.split("?")[0]));

  // Resolve a viewable receipt URL: prefer a fresh download URL from the stored
  // storage path, fall back to the URL saved at upload time.
  const getReceiptUrl = async (u: PendingUser): Promise<string | null> => {
    if (u.payment_receipt_path) {
      try {
        return await getDownloadURL(ref(storage, u.payment_receipt_path));
      } catch (err: any) {
        console.error("[approvals] receipt fetch failed:", err?.code);
      }
    }
    return u.payment_receipt_url;
  };

  const handleViewReceipt = async (u: PendingUser) => {
    if (!u.payment_receipt_url && !u.payment_receipt_path) return;
    const url = await getReceiptUrl(u);
    if (!url) {
      toast.error("Could not open this receipt. It may not have finished uploading.");
      return;
    }
    if (isImageUrl(url)) {
      setReceiptPreview(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const openReview = async (u: PendingUser) => {
    setSelectedUser(u);
    setAdminComment(u.payment_admin_comment || "");
    setReferenceConfirmed(false);
    setReviewReceiptUrl(null);
    setDuplicates([]);

    if (u.payment_receipt_url || u.payment_receipt_path) {
      const url = await getReceiptUrl(u);
      setReviewReceiptUrl(url);
    }
    if (u.payment_reference_number) {
      try {
        const dupes = await findDuplicateReference(u.payment_reference_number, u.user_id);
        setDuplicates(dupes as unknown as PendingUser[]);
      } catch {
        // duplicate check is advisory; never block review on it
      }
    }
  };

  const closeReview = () => {
    setSelectedUser(null);
    setAdminComment("");
    setReferenceConfirmed(false);
    setDuplicates([]);
  };

  // Reference-only verification: approving requires the admin to confirm they
  // checked the reference against their bank/Telebirr statement.
  const referenceOnly = !!selectedUser && !selectedUser.payment_receipt_url && !!selectedUser.payment_reference_number;
  const approveBlocked = referenceOnly && !referenceConfirmed;

  const handleApprove = () => {
    if (!selectedUser) return;
    updateStatus.mutate({ u: selectedUser, status: "approved", paymentStatus: "approved", comment: adminComment });
  };

  const handleReject = () => {
    if (!selectedUser) return;
    if (referenceOnly && !adminComment.trim()) {
      toast.error("Please add a comment explaining why the reference could not be verified.");
      return;
    }
    updateStatus.mutate({ u: selectedUser, status: "rejected", paymentStatus: "rejected", comment: adminComment });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Registration Approvals</h2>
          <p className="text-sm text-muted-foreground">
            Review registrations and verify payment receipts or reference numbers
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, email or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Non-Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : loadError ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm text-destructive">{(loadError as Error).message}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {statusFilter === "pending" ? "No pending registrations 🎉" : "No users found"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => (
                <div key={u.user_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.full_name || "Unnamed"}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                      <p className="text-xs text-muted-foreground">
                        {u.role} · {u.grade ? `Grade ${u.grade}` : "No grade"}
                        {u.branch_name ? ` · ${u.branch_name}` : ""}
                        {" · "}Registered {toDateLabel(u.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {paymentBadge(u)}
                    <Badge variant={statusVariant(u.account_status)} className="capitalize gap-1">
                      {statusIcon(u.account_status)}
                      {u.account_status}
                    </Badge>

                    {(u.payment_receipt_url || u.payment_receipt_path) && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleViewReceipt(u)}>
                        <Eye className="h-3.5 w-3.5" />
                        Receipt
                      </Button>
                    )}

                    {u.account_status !== "approved" && (
                      <Button size="sm" variant="default" className="gap-1" onClick={() => openReview(u)}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Image Preview */}
      <Dialog open={!!receiptPreview} onOpenChange={() => setReceiptPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
          {receiptPreview && (
            <img src={receiptPreview} alt="Payment receipt" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Registration: {selectedUser?.full_name || "Unnamed"}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2"><span className="text-muted-foreground">Email:</span> {selectedUser.email || "Not recorded"}</div>
                <div><span className="text-muted-foreground">Role:</span> {selectedUser.role}</div>
                <div><span className="text-muted-foreground">Grade:</span> {selectedUser.grade || "N/A"}</div>
                <div><span className="text-muted-foreground">Branch:</span> {selectedUser.branch_name || "N/A"}</div>
                <div><span className="text-muted-foreground">Registered:</span> {toDateLabel(selectedUser.created_at)}</div>
              </div>

              {/* Payment details */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium">
                    {getPaymentMethod(selectedUser.payment_method)?.label || selectedUser.payment_method || "Not specified"}
                  </span>
                </div>
                {selectedUser.payment_reference_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-mono font-medium">{selectedUser.payment_reference_number}</span>
                  </div>
                )}
                <p className="text-sm font-medium">Payment Receipt</p>
                {reviewReceiptUrl ? (
                  <div>
                    {isImageUrl(reviewReceiptUrl) ? (
                      <img src={reviewReceiptUrl} alt="Payment receipt" className="mb-2 max-h-48 w-full rounded-md object-contain" />
                    ) : (
                      <a href={reviewReceiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <FileText className="h-4 w-4" /> View PDF Receipt
                      </a>
                    )}
                  </div>
                ) : selectedUser.payment_receipt_url ? (
                  <p className="text-sm text-muted-foreground">Receipt recorded but could not be loaded.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No receipt uploaded</p>
                )}
                <div>{paymentBadge(selectedUser)}</div>
              </div>

              {/* Reference verification panel — shown when there is no receipt */}
              {referenceOnly && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Reference Number Verification
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This student submitted a reference number instead of a screenshot. Before approving,
                    open your {getPaymentMethod(selectedUser.payment_method)?.label || "bank"} statement and confirm:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                    <li>A payment with reference <span className="font-mono font-medium text-foreground">{selectedUser.payment_reference_number}</span> exists</li>
                    <li>The amount and date match the registration fee</li>
                    <li>The sender name matches the student</li>
                  </ul>

                  {duplicates.length > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">This reference was also submitted by:</p>
                        {duplicates.map((d) => (
                          <p key={d.user_id}>{d.full_name || "Unnamed"} ({d.email || "no email"}) — {d.account_status}</p>
                        ))}
                        <p className="mt-1">Approve only one account per reference number.</p>
                      </div>
                    </div>
                  )}

                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={referenceConfirmed}
                      onCheckedChange={(v) => setReferenceConfirmed(v === true)}
                      className="mt-0.5"
                    />
                    <span>I checked my statement and confirmed this reference number is genuine.</span>
                  </label>
                </div>
              )}

              {/* Admin comment */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Admin Comment {referenceOnly ? "(required to reject)" : "(optional)"}
                </label>
                <Textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Reason for rejection or notes..." rows={3} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button className="flex-1 gap-1" onClick={handleApprove} disabled={updateStatus.isPending || approveBlocked}>
                  <UserCheck className="h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1 gap-1" onClick={handleReject} disabled={updateStatus.isPending}>
                  <UserX className="h-4 w-4" /> Reject
                </Button>
              </div>
              {approveBlocked && (
                <p className="text-xs text-muted-foreground text-center">
                  Tick the confirmation box above to enable Approve.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminApprovals;
