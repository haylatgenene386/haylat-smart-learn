import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UserCheck, UserX, Clock, CheckCircle2, XCircle, FileText, Image, Eye, Hash, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getPaymentMethod } from "@/lib/payment-methods";

type PendingUser = {
  user_id: string;
  full_name: string | null;
  grade: number | null;
  created_at: string;
  account_status: string;
  branch_id: string | null;
  branch_name: string | null;
  role: string;
  payment_receipt_url: string | null;
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
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["approval-users", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, grade, created_at, account_status, branch_id, payment_receipt_url, payment_status, payment_admin_comment, payment_method, payment_reference_number")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("account_status", statusFilter);
      } else {
        query = query.in("account_status", ["pending", "rejected"]);
      }

      const { data: profiles } = await query;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: branches } = await supabase.from("branches").select("id, name");

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);
      const branchMap = new Map(branches?.map((b) => [b.id, b.name]) ?? []);

      return (profiles ?? []).map((p: any) => ({
        ...p,
        branch_name: p.branch_id ? branchMap.get(p.branch_id) ?? null : null,
        role: (roleMap.get(p.user_id) as string) ?? "student",
      })) as PendingUser[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status, paymentStatus, comment }: { userId: string; status: string; paymentStatus?: string; comment?: string }) => {
      const updateData: any = { account_status: status };
      if (paymentStatus) updateData.payment_status = paymentStatus;
      if (comment !== undefined) updateData.payment_admin_comment = comment;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);
      if (error) throw error;

      try {
        await supabase.functions.invoke("send-registration-email", {
          body: { userId, type: "approval_notification", status },
        });
      } catch (emailErr) {
        console.error("Failed to send notification email:", emailErr);
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["approval-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      setSelectedUser(null);
      setAdminComment("");
      toast.success(`User ${status === "approved" ? "approved" : "rejected"} successfully`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter(
    (u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase())
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

  const paymentBadge = (status: string | null) => {
    if (!status || status === "pending_payment") return <Badge variant="outline" className="gap-1 text-xs"><Clock className="h-3 w-3" />No Receipt</Badge>;
    if (status === "pending_review") return <Badge variant="secondary" className="gap-1 text-xs"><FileText className="h-3 w-3" />Receipt Uploaded</Badge>;
    if (status === "approved") return <Badge variant="default" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3" />Payment Verified</Badge>;
    return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" />Payment Rejected</Badge>;
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)/i.test(url);

  // Generate signed URL for private payment-receipts bucket
  const getReceiptUrl = async (receiptUrl: string) => {
    // Extract path from full URL — the path after /object/public/payment-receipts/ or /object/sign/payment-receipts/
    const match = receiptUrl.match(/payment-receipts\/(.+)$/);
    if (!match) {
      window.open(receiptUrl, "_blank");
      return;
    }
    const filePath = match[1];
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(filePath, 300); // 5 min
    if (error || !data?.signedUrl) {
      toast.error("Failed to load receipt. The file may not exist.");
      return;
    }
    return data.signedUrl;
  };

  const handleViewReceipt = async (u: PendingUser) => {
    if (!u.payment_receipt_url) return;
    const signedUrl = await getReceiptUrl(u.payment_receipt_url);
    if (!signedUrl) return;
    if (isImageUrl(u.payment_receipt_url)) {
      setReceiptPreview(signedUrl);
    } else {
      window.open(signedUrl, "_blank");
    }
  };

  // For review dialog receipt display
  const [reviewReceiptSignedUrl, setReviewReceiptSignedUrl] = useState<string | null>(null);

  const openReview = async (u: PendingUser) => {
    setSelectedUser(u);
    setAdminComment(u.payment_admin_comment || "");
    if (u.payment_receipt_url) {
      const url = await getReceiptUrl(u.payment_receipt_url);
      setReviewReceiptSignedUrl(url || null);
    } else {
      setReviewReceiptSignedUrl(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Registration Approvals</h2>
          <p className="text-sm text-muted-foreground">
            Review registrations and verify payment receipts
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                      <p className="text-xs text-muted-foreground">
                        {u.role} · {u.grade ? `Grade ${u.grade}` : "No grade"}
                        {u.branch_name ? ` · ${u.branch_name}` : ""}
                        {" · "}Registered {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {paymentBadge(u.payment_status)}
                    <Badge variant={statusVariant(u.account_status)} className="capitalize gap-1">
                      {statusIcon(u.account_status)}
                      {u.account_status}
                    </Badge>

                    {/* View receipt */}
                    {u.payment_receipt_url && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleViewReceipt(u)}>
                        <Eye className="h-3.5 w-3.5" />
                        Receipt
                      </Button>
                    )}

                    {/* Review button */}
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
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setAdminComment(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Registration: {selectedUser?.full_name || "Unnamed"}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Role:</span> {selectedUser.role}</div>
                <div><span className="text-muted-foreground">Grade:</span> {selectedUser.grade || "N/A"}</div>
                <div><span className="text-muted-foreground">Branch:</span> {selectedUser.branch_name || "N/A"}</div>
                <div><span className="text-muted-foreground">Registered:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
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
                {selectedUser.payment_receipt_url && reviewReceiptSignedUrl ? (
                  <div>
                    {isImageUrl(selectedUser.payment_receipt_url) ? (
                      <img src={reviewReceiptSignedUrl} alt="Payment receipt" className="mb-2 max-h-48 w-full rounded-md object-contain" />
                    ) : (
                      <a href={reviewReceiptSignedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <FileText className="h-4 w-4" /> View PDF Receipt
                      </a>
                    )}
                    <div className="mt-1">{paymentBadge(selectedUser.payment_status)}</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No receipt uploaded</p>
                )}
              </div>

              {/* Admin comment */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Admin Comment (optional)</label>
                <Textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Reason for rejection or notes..." rows={3} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button className="flex-1 gap-1" onClick={() => updateStatus.mutate({
                  userId: selectedUser.user_id,
                  status: "approved",
                  paymentStatus: "approved",
                  comment: adminComment,
                })} disabled={updateStatus.isPending}>
                  <UserCheck className="h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1 gap-1" onClick={() => updateStatus.mutate({
                  userId: selectedUser.user_id,
                  status: "rejected",
                  paymentStatus: "rejected",
                  comment: adminComment,
                })} disabled={updateStatus.isPending}>
                  <UserX className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminApprovals;
