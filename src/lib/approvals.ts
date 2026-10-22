import { supabase } from "@/integrations/supabase/client";

/**
 * Shared source of truth for the Approvals list and the sidebar badge.
 * No server-side orderBy: Firestore silently drops docs missing the ordered
 * field (older profiles have no created_at) and needs composite indexes.
 */
export async function fetchApprovalProfiles(statuses: string[], branchId: string | null) {
  let q: any = supabase
    .from("profiles")
    .select("*")
    .in("account_status", statuses);
  if (branchId) q = q.eq("branch_id", branchId);
  const { data, error } = await q;
  if (error) {
    console.error("[approvals] query failed:", error?.code ?? error?.message);
    throw new Error("Could not load registrations. Check your admin permissions and try again.");
  }
  const rows = ((data ?? []) as any[]).filter((p) => !p.is_deleted);
  const ts = (v: any) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : 0);
  rows.sort((a, b) => ts(b.created_at) - ts(a.created_at));
  return rows;
}

export const toDateLabel = (v: any) => {
  const d = v?.toDate ? v.toDate() : v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : "Unknown date";
};
